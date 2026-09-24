import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The client paces requests with module-level state (lastRequestAt), which
// fake timers would otherwise leak across tests as an ever-growing gap, so
// every test loads a fresh module registry and asserts against that instance.
beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

// Loads the client and the hooks together: after resetModules both share one
// fresh client instance, so instanceof checks in retryNetworkErrors hold.
function loadModules() {
  return Promise.all([
    import("../../src/lib/anilist/client"),
    import("../../src/lib/anilist/hooks"),
  ]).then(([client, hooks]) => ({ client, hooks }));
}

// The client paces requests at least this far apart (MIN_REQUEST_GAP_MS in
// client.ts).
const QUEUE_GAP_MS = 2500;
// REQUEST_TIMEOUT_MS in client.ts.
const REQUEST_TIMEOUT_MS = 10000;

// Starts a request and advances fake timers past the client's inter-request
// pacing so the fetch itself runs. Every test expects a rejection; the cast
// is safe because each test asserts the concrete instanceof right after.
async function startRequest(anilistRequest: (query: string) => Promise<unknown>): Promise<Error> {
  const result = anilistRequest("query { A }");
  await vi.advanceTimersByTimeAsync(QUEUE_GAP_MS + 1);
  return result.then(
    () => {
      throw new Error("expected the request to reject");
    },
    (e: unknown) => e as Error,
  );
}

describe("anilistRequest error types", () => {
  it("throws AniListNetworkError when the fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const { client, hooks } = await loadModules();
    const error = await startRequest(client.anilistRequest);
    expect(error).toBeInstanceOf(client.AniListNetworkError);
    expect(hooks.retryNetworkErrors(0, error)).toBe(true);
  });

  it("throws AniListNetworkError when the request times out", async () => {
    const fetchMock = vi.fn().mockImplementation(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    const { client, hooks } = await loadModules();
    const result = client.anilistRequest("query { A }");
    await vi.advanceTimersByTimeAsync(QUEUE_GAP_MS + 1);
    // The fetch must have actually started; otherwise a missing
    // AbortSignal.timeout would throw before the call for the wrong pass.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    const error = (await result.catch((e: unknown) => e)) as Error;
    expect(error).toBeInstanceOf(client.AniListNetworkError);
    expect(hooks.retryNetworkErrors(0, error)).toBe(true);
  });

  it("throws AniListRateLimitError with the Retry-After seconds on a 429", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: {} }), {
          status: 429,
          headers: { "Retry-After": "30" },
        }),
      ),
    );
    const { client, hooks } = await loadModules();
    const error = await startRequest(client.anilistRequest);
    expect(error).toBeInstanceOf(client.AniListRateLimitError);
    expect(error).toHaveProperty("retryAfterSeconds", 30);
    expect(hooks.retryNetworkErrors(0, error)).toBe(false);
  });

  it("throws the generic AniListError for GraphQL errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ errors: [{ message: "Not found." }] }), { status: 200 }),
        ),
    );
    const { client, hooks } = await loadModules();
    const error = await startRequest(client.anilistRequest);
    expect(error).toBeInstanceOf(client.AniListError);
    expect(error).not.toBeInstanceOf(client.AniListNetworkError);
    expect(hooks.retryNetworkErrors(0, error)).toBe(false);
  });

  it("fails fast with the generic error while the webview reports offline", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    try {
      const { client, hooks } = await loadModules();
      const error = await startRequest(client.anilistRequest);
      expect(error).toBeInstanceOf(client.AniListError);
      expect(error).not.toBeInstanceOf(client.AniListNetworkError);
      expect(hooks.retryNetworkErrors(0, error)).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
    }
  });
});

describe("retryNetworkErrors", () => {
  it("retries transient network failures up to twice", async () => {
    const { client, hooks } = await loadModules();
    const error = new client.AniListNetworkError("Could not reach AniList.");
    expect(hooks.retryNetworkErrors(0, error)).toBe(true);
    expect(hooks.retryNetworkErrors(1, error)).toBe(true);
    expect(hooks.retryNetworkErrors(2, error)).toBe(false);
  });

  it("never retries rate-limit, GraphQL, or unknown errors", async () => {
    const { client, hooks } = await loadModules();
    expect(hooks.retryNetworkErrors(0, new client.AniListRateLimitError(30))).toBe(false);
    expect(hooks.retryNetworkErrors(0, new client.AniListError("Not found."))).toBe(false);
    expect(hooks.retryNetworkErrors(0, new Error("unexpected IPC failure"))).toBe(false);
  });
});
