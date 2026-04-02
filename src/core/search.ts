import { availableParallelism, cpus } from "os";

import { FRIEND_PREFIX, NUMERIC_SEARCH_LIMIT, SALT_LEN, SEARCH_CHARS } from "./constants";
import { createHashBackend } from "./hash";
import { matchesTarget, rollFromSalt } from "./roll";
import type { RehatchTarget, SearchBackend, SearchOptions, SearchProgress, SearchResult } from "./types";

function getWorkerUrl(): URL {
  const ext = import.meta.url.endsWith(".ts") ? ".ts" : ".js";
  return new URL(`./search-worker${ext}`, import.meta.url);
}

function enumerateFriendSuffixes(length: number): string[] {
  const results: string[] = [];
  if (length <= 0) {
    return results;
  }

  const walk = (prefix: string, remaining: number): void => {
    if (remaining === 0) {
      results.push(prefix);
      return;
    }

    for (const char of SEARCH_CHARS) {
      walk(prefix + char, remaining - 1);
    }
  };

  walk("", length);
  return results;
}

export class WorkerPoolSearchBackend implements SearchBackend {
  public readonly name = "worker-pool";

  public async find(userId: string, target: RehatchTarget, options: SearchOptions = {}): Promise<SearchResult | null> {
    const startedAt = Date.now();
    let totalChecked = 0;
    const hashBackend = createHashBackend(options.hashBackendName ?? "fnv1a-32");
    const excludeSalt = options.excludeSalt;
    const emitProgress = (progress: SearchProgress): void => {
      options.onProgress?.(progress);
    };

    const suffixLength = SALT_LEN - FRIEND_PREFIX.length;
    if (suffixLength > 0 && suffixLength <= 4) {
      const suffixes = enumerateFriendSuffixes(suffixLength);
      for (const suffix of suffixes) {
        options.signal?.throwIfAborted?.();
        totalChecked += 1;
        const salt = `${FRIEND_PREFIX}${suffix}`;
        if (excludeSalt && salt === excludeSalt) {
          continue;
        }
        const result = rollFromSalt(userId, salt, hashBackend);
        if (matchesTarget(result, target)) {
          return {
            salt,
            result,
            checked: totalChecked,
            elapsedMs: Date.now() - startedAt,
            phase: "prefix",
          };
        }

        if (totalChecked % 10_000 === 0) {
          emitProgress({ checked: totalChecked, elapsedMs: Date.now() - startedAt, phase: "prefix" });
          await Bun.sleep(0);
        }
      }
    }

    const workerCount = Math.max(
      1,
      Math.min(
        options.workerCount ?? (typeof availableParallelism === "function" ? availableParallelism() : cpus().length),
        8,
      ),
    );
    const maxAttempts = options.maxNumericAttempts ?? NUMERIC_SEARCH_LIMIT;
    const timeoutMs = options.timeoutMs ?? 0;
    const workers = new Set<Worker>();
    const workerChecked = new Map<number, number>();
    let resolved = false;

    const cleanup = (): void => {
      for (const worker of workers) {
        worker.terminate();
      }
      workers.clear();
    };

    const promise = new Promise<SearchResult | null>((resolve, reject) => {
      const finish = (value: SearchResult | null): void => {
        if (resolved) {
          return;
        }
        resolved = true;
        cleanup();
        resolve(value);
      };

      const fail = (error: Error): void => {
        if (resolved) {
          return;
        }
        resolved = true;
        cleanup();
        reject(error);
      };

      let completedWorkers = 0;
      const timeout = timeoutMs
        ? setTimeout(() => fail(new Error(`Salt search timed out after ${timeoutMs}ms`)), timeoutMs)
        : undefined;

      const abortListener = (): void => {
        if (timeout) {
          clearTimeout(timeout);
        }
        fail(new Error("Salt search aborted"));
      };

      options.signal?.addEventListener("abort", abortListener, { once: true });

      for (let workerIndex = 0; workerIndex < workerCount; workerIndex += 1) {
        const worker = new Worker(getWorkerUrl().href, { type: "module" });
        workers.add(worker);
        worker.onmessage = (event: MessageEvent<any>) => {
          const message = event.data;
          if (message.type === "progress") {
            workerChecked.set(workerIndex, message.checked as number);
            const numericChecked = Array.from(workerChecked.values()).reduce((sum, value) => sum + value, 0);
            emitProgress({
              checked: totalChecked + numericChecked,
              elapsedMs: message.elapsedMs as number,
              phase: "numeric",
            });
            return;
          }

          if (message.type === "found") {
            if (timeout) {
              clearTimeout(timeout);
            }
            options.signal?.removeEventListener("abort", abortListener);
            const payload = message.payload as SearchResult;
            const numericChecked = Array.from(workerChecked.values()).reduce((sum, value) => sum + value, 0);
            finish({
              ...payload,
              checked: totalChecked + numericChecked + payload.checked,
            });
            return;
          }

          if (message.type === "done") {
            workerChecked.set(workerIndex, message.checked as number);
            completedWorkers += 1;
            if (completedWorkers === workerCount) {
              if (timeout) {
                clearTimeout(timeout);
              }
              options.signal?.removeEventListener("abort", abortListener);
              finish(null);
            }
          }
        };

        worker.onerror = () => {
          if (timeout) {
            clearTimeout(timeout);
          }
          options.signal?.removeEventListener("abort", abortListener);
          fail(new Error("Worker-based salt search failed"));
        };

        worker.postMessage({
          type: "start",
          userId,
          target,
          hashBackendName: options.hashBackendName ?? "fnv1a-32",
          excludeSalt,
          startIndex: workerIndex,
          step: workerCount,
          maxAttempts,
          startedAt,
        });
      }
    });

    return promise;
  }
}
