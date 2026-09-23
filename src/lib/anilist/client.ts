const ANILIST_ENDPOINT = "https://graphql.anilist.co";
const MIN_REQUEST_GAP_MS = 2500;
const REQUEST_TIMEOUT_MS = 10000;
const DEFAULT_RETRY_AFTER_SECONDS = 60;

export class AniListError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AniListError";
  }
}

// Transient connectivity only: fetch rejections and timeouts. The query
// hooks auto-retry exactly this type; deterministic GraphQL/data errors
// (and the offline guard in fetchAniList) surface without retry delays.
export class AniListNetworkError extends AniListError {
  constructor(message: string) {
    super(message);
    this.name = "AniListNetworkError";
  }
}

export class AniListRateLimitError extends AniListError {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super(`AniList rate limit reached. Retry in ${retryAfterSeconds} seconds.`);
    this.name = "AniListRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

interface GraphQLError {
  message?: string;
  status?: number;
}

let lastRequestAt = 0;
let queueTail: Promise<void> = Promise.resolve();

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timeoutAfter(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error("AniList request timed out.")), ms);
  });
}

function rateLimitError(response: Response): AniListRateLimitError {
  const retryAfter = Number.parseFloat(response.headers.get("Retry-After") ?? "");
  const retryAfterSeconds =
    Number.isFinite(retryAfter) && retryAfter > 0
      ? Math.ceil(retryAfter)
      : DEFAULT_RETRY_AFTER_SECONDS;
  return new AniListRateLimitError(retryAfterSeconds);
}

function readErrors(body: unknown): GraphQLError[] {
  if (typeof body !== "object" || body === null) {
    return [];
  }
  const errors = (body as Record<string, unknown>).errors;
  if (!Array.isArray(errors)) {
    return [];
  }
  return errors.filter(
    (error): error is GraphQLError => typeof error === "object" && error !== null,
  );
}

async function fetchAniList<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  // WebKit can leave an offline fetch pending instead of rejecting it, so
  // fail fast while the webview reports no connection rather than waiting
  // on the request timeout.
  if (!navigator.onLine) {
    throw new AniListError("Could not reach AniList. Check your network connection.");
  }
  let response: Response;
  try {
    // WebKit can leave a fetch pending forever when the connection drops,
    // and aborting it may not settle the promise. Race against a plain
    // timer so the request always resolves or rejects within the timeout.
    response = await Promise.race([
      fetch(ANILIST_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }),
      timeoutAfter(REQUEST_TIMEOUT_MS),
    ]);
  } catch {
    throw new AniListNetworkError("Could not reach AniList. Check your network connection.");
  }

  if (response.status === 429) {
    throw rateLimitError(response);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new AniListError("AniList returned an unreadable response.");
  }

  const errors = readErrors(body);
  if (errors.some((error) => error.status === 429)) {
    throw rateLimitError(response);
  }
  if (errors.length > 0) {
    throw new AniListError(errors[0]?.message ?? "AniList returned an error.");
  }
  if (!response.ok) {
    throw new AniListError(`AniList request failed with status ${response.status}.`);
  }

  if (typeof body !== "object" || body === null || (body as Record<string, unknown>).data == null) {
    throw new AniListError("AniList returned an unexpected response shape.");
  }
  return (body as { data: T }).data;
}

export function anilistRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const run = async (): Promise<T> => {
    const gap = lastRequestAt + MIN_REQUEST_GAP_MS - Date.now();
    if (gap > 0) {
      await delay(gap);
    }
    lastRequestAt = Date.now();
    return fetchAniList<T>(query, variables);
  };
  const result = queueTail.then(run);
  queueTail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}
