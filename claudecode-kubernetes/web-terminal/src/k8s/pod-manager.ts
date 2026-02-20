// K8s Pod lifecycle management
// Handles session Pod creation, deletion, status checks, and readiness waiting

import * as k8s from '@kubernetes/client-node';
import { Writable } from 'stream';
import { kc, k8sApi } from './client.js';
import { buildSandboxPodSpec } from './pod-template.js';
import { AppConfig, SessionMode } from '../types.js';

export class PodManager {
  /** Create a new sandbox Pod and return its name */
  async createPod(sessionId: string, config: AppConfig, userId?: string, mode: SessionMode = 'learner'): Promise<string> {
    const podSpec = buildSandboxPodSpec(sessionId, config, userId, mode);
    const podName = podSpec.metadata!.name!;

    try {
      await k8sApi.createNamespacedPod({
        namespace: config.sandboxNamespace,
        body: podSpec,
      });
      console.log(`[pod-manager] Pod created: ${podName}`);
      return podName;
    } catch (err: any) {
      // 409 Conflict: Pod with same name exists (likely in Error/Failed state).
      // Delete the stale Pod and retry creation once.
      if (err?.code === 409) {
        console.log(`[pod-manager] Pod ${podName} already exists (stale), deleting and retrying...`);
        try {
          await this.deletePod(podName, config.sandboxNamespace);
          // Wait briefly for deletion to propagate
          await new Promise((r) => setTimeout(r, 2000));
          await k8sApi.createNamespacedPod({
            namespace: config.sandboxNamespace,
            body: podSpec,
          });
          console.log(`[pod-manager] Pod recreated: ${podName}`);
          return podName;
        } catch (retryErr) {
          console.error(`[pod-manager] Failed to recreate pod ${podName}:`, retryErr);
          throw retryErr;
        }
      }
      console.error(`[pod-manager] Failed to create pod ${podName}:`, err);
      throw err;
    }
  }

  /** Delete a Pod (gracePeriodSeconds: 5) */
  async deletePod(podName: string, namespace: string): Promise<void> {
    try {
      await k8sApi.deleteNamespacedPod({
        name: podName,
        namespace,
        body: { gracePeriodSeconds: 5 },
      });
      console.log(`[pod-manager] Pod deleted: ${podName}`);
    } catch (err) {
      console.error(`[pod-manager] Failed to delete pod ${podName}:`, err);
      throw err;
    }
  }

  /** Poll until Pod reaches Running state (1-second interval) */
  async waitForPodReady(
    podName: string,
    namespace: string,
    timeoutMs = 60000
  ): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const status = await this.getPodStatus(podName, namespace);
      if (status === 'Running') {
        console.log(`[pod-manager] Pod ready: ${podName}`);
        return;
      }
      if (status === 'Failed' || status === 'Succeeded') {
        throw new Error(`Pod ${podName} entered terminal state: ${status}`);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    throw new Error(`Pod ${podName} did not become ready within ${timeoutMs}ms`);
  }

  /** Execute a one-shot command in the Pod and return stdout as a string */
  async execInPod(
    podName: string,
    namespace: string,
    command: string[],
    timeoutMs = 60000
  ): Promise<string> {
    const exec = new k8s.Exec(kc);

    return new Promise<string>((resolve, reject) => {
      let output = '';
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error(`execInPod timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      const stdout = new Writable({
        write(chunk: Buffer, _encoding, callback) {
          output += chunk.toString();
          callback();
        },
      });

      const stderr = new Writable({
        write(chunk: Buffer, _encoding, callback) {
          output += chunk.toString();
          callback();
        },
      });

      // k8s.Exec.exec returns a WebSocket; listen for close to know command finished
      exec.exec(
        namespace,
        podName,
        'sandbox',
        command,
        stdout,
        stderr,
        null, // no stdin
        false, // no TTY
      ).then((conn) => {
        conn.onclose = () => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(output);
          }
        };
      }).catch((err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      });
    });
  }

  /** Find a Running Pod for a given user via K8s label selector.
   *  Uses mode filter to distinguish learner/generator Pods.
   *  Automatically cleans up Failed/Succeeded Pods to prevent 409 conflicts. */
  async findUserPod(podId: string, namespace: string, mode: SessionMode = 'learner'): Promise<string | null> {
    try {
      const response = await k8sApi.listNamespacedPod({
        namespace,
        labelSelector: `user-id=${podId},mode=${mode}`,
      });

      let runningPod: string | null = null;

      for (const pod of response.items) {
        const phase = pod.status?.phase;
        const name = pod.metadata?.name;
        if (!name) continue;

        if (phase === 'Running') {
          runningPod = name;
        } else if (phase === 'Failed' || phase === 'Succeeded') {
          // Clean up stale Pods that can't be reused
          console.log(`[pod-manager] Cleaning up stale pod ${name} (phase: ${phase})`);
          try { await this.deletePod(name, namespace); } catch { /* best-effort */ }
        }
      }

      return runningPod;
    } catch (err) {
      console.error(`[pod-manager] Failed to find user pod for ${podId}:`, err);
      return null;
    }
  }

  /** Check if a path exists inside the Pod */
  // K8s exec WebSocket sends exit code via status channel,
  // but execInPod doesn't capture it, so we verify via stdout
  async checkPathExists(
    podName: string,
    namespace: string,
    path: string
  ): Promise<boolean> {
    try {
      const output = await this.execInPod(
        podName, namespace,
        ['sh', '-c', `test -d "${path}" && echo EXISTS`],
        5000
      );
      return output.trim() === 'EXISTS';
    } catch {
      return false;
    }
  }

  /** Return the current phase of the Pod (Pending, Running, Succeeded, Failed, Unknown) */
  async getPodStatus(podName: string, namespace: string): Promise<string> {
    try {
      const response = await k8sApi.readNamespacedPod({
        name: podName,
        namespace,
      });
      return response.status?.phase || 'Unknown';
    } catch (err) {
      console.error(`[pod-manager] Failed to get pod status for ${podName}:`, err);
      throw err;
    }
  }
}
