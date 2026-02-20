// K8s Pod lifecycle management
// Handles creation, deletion, status checking, and ready-waiting for session Pods

import * as k8s from '@kubernetes/client-node';
import { Writable } from 'stream';
import { kc, k8sApi } from './client.js';
import { buildSandboxPodSpec } from './pod-template.js';
import { AppConfig } from '../types.js';

export class PodManager {
  /** Create a new sandbox Pod and return the Pod name */
  async createPod(sessionId: string, config: AppConfig, userId?: string): Promise<string> {
    const podSpec = buildSandboxPodSpec(sessionId, config, userId);
    const podName = podSpec.metadata!.name!;

    try {
      await k8sApi.createNamespacedPod({
        namespace: config.sandboxNamespace,
        body: podSpec,
      });
      console.log(`[pod-manager] Pod created: ${podName}`);
      return podName;
    } catch (err) {
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

  /** Poll until the Pod reaches Running state (1-second interval) */
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

  /** Execute a one-shot command inside a Pod and return stdout as a string */
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

  /** Find a Running Pod for a specific user using K8s label selector */
  async findUserPod(podId: string, namespace: string): Promise<string | null> {
    try {
      const response = await k8sApi.listNamespacedPod({
        namespace,
        labelSelector: `user-id=${podId}`,
      });
      const runningPod = response.items.find(
        (pod) => pod.status?.phase === 'Running'
      );
      return runningPod?.metadata?.name ?? null;
    } catch (err) {
      console.error(`[pod-manager] Failed to find user pod for ${podId}:`, err);
      return null;
    }
  }

  /** Check whether a specific path exists inside a Pod */
  // K8s exec WebSocket delivers exit codes via the status channel,
  // but execInPod does not capture them, so verification is done via stdout
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

  /** Return the current phase of a Pod (Pending, Running, Succeeded, Failed, Unknown) */
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
