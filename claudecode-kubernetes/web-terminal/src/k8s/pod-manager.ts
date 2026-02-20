// K8s Pod 라이프사이클 관리
// 세션 Pod의 생성, 삭제, 상태 확인, Ready 대기를 담당

import * as k8s from '@kubernetes/client-node';
import { Writable } from 'stream';
import { kc, k8sApi } from './client.js';
import { buildSandboxPodSpec } from './pod-template.js';
import { AppConfig } from '../types.js';

export class PodManager {
  /** 새 샌드박스 Pod을 생성하고 Pod 이름을 반환 */
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

  /** Pod을 삭제 (gracePeriodSeconds: 5) */
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

  /** Pod이 Running 상태가 될 때까지 폴링 (1초 간격) */
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

  /** Pod 내에서 one-shot 명령을 실행하고 stdout을 문자열로 반환 */
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

  /** 특정 유저의 Running 상태 Pod을 K8s 라벨 셀렉터로 검색 */
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

  /** Pod 내 특정 경로가 존재하는지 확인 */
  // K8s exec WebSocket은 exit code를 status channel로 전달하지만
  // execInPod는 이를 캡처하지 않으므로, stdout 기반으로 검증
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

  /** Pod의 현재 phase를 반환 (Pending, Running, Succeeded, Failed, Unknown) */
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
