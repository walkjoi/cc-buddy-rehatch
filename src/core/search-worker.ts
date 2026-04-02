import { NUMERIC_SEARCH_LIMIT, SALT_LEN } from "./constants";
import { createHashBackend } from "./hash";
import { rollFromSalt, matchesTarget } from "./roll";
import type { RehatchTarget, SearchResult, SupportedHashBackendName } from "./types";

interface SearchWorkerRequest {
  type: "start";
  userId: string;
  target: RehatchTarget;
  hashBackendName: SupportedHashBackendName;
  excludeSalt?: string;
  startIndex: number;
  step: number;
  maxAttempts: number;
  startedAt: number;
}

type SearchWorkerResponse =
  | {
      type: "progress";
      checked: number;
      elapsedMs: number;
    }
  | {
      type: "done";
      checked: number;
    }
  | {
      type: "found";
      payload: SearchResult;
    };

const PROGRESS_EVERY = 250_000;

self.onmessage = (event: MessageEvent<SearchWorkerRequest>) => {
  const message = event.data;
  if (message.type !== "start") {
    return;
  }

  let checked = 0;
  const limit = Math.min(message.maxAttempts, NUMERIC_SEARCH_LIMIT);
  const hashBackend = createHashBackend(message.hashBackendName);
  for (let index = message.startIndex; index < limit; index += message.step) {
    const salt = String(index).padStart(SALT_LEN, "x");
    checked += 1;
    if (message.excludeSalt && salt === message.excludeSalt) {
      continue;
    }
    const result = rollFromSalt(message.userId, salt, hashBackend);
    if (matchesTarget(result, message.target)) {
      const payload: SearchResult = {
        salt,
        result,
        checked,
        elapsedMs: Date.now() - message.startedAt,
        phase: "numeric",
      };
      (self as unknown as Worker).postMessage({ type: "found", payload } satisfies SearchWorkerResponse);
      return;
    }

    if (checked % PROGRESS_EVERY === 0) {
      (self as unknown as Worker).postMessage({
        type: "progress",
        checked,
        elapsedMs: Date.now() - message.startedAt,
      } satisfies SearchWorkerResponse);
    }
  }

  (self as unknown as Worker).postMessage({ type: "done", checked } satisfies SearchWorkerResponse);
};
