import { expect, test } from "@playwright/test";
import {
  ANILIST_ENDPOINT,
  abortAniList,
  installAniListMock,
  installFlakyAniList,
  installIpcMock,
  rateLimitAniList,
} from "./mocks";

test.beforeEach(async ({ page }) => {
  await installIpcMock(page);
});

test("a transient AniList failure recovers within the automatic retries", async ({ page }) => {
  await installFlakyAniList(page, 1);
  await page.goto("/trending");
  await expect(page.getByRole("link", { name: /Cowboy Bebop/ })).toBeVisible();
  await expect(page.getByText("No connection")).toHaveCount(0);
});

test("restoring the route and firing online refetches without a reload", async ({ page }) => {
  await abortAniList(page);
  await page.goto("/trending");
  await expect(page.getByText("No connection").first()).toBeVisible();

  await page.unroute(ANILIST_ENDPOINT);
  await installAniListMock(page);
  // TanStack only treats online as a reconnect when it follows an offline
  // event; the pair mirrors a route coming back.
  await page.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
  });
  await expect(page.getByRole("link", { name: /Cowboy Bebop/ })).toBeVisible();
});

test("a killed in-flight request recovers on window focus without a reload", async ({ page }) => {
  await abortAniList(page);
  await page.goto("/trending");
  await expect(page.getByText("No connection").first()).toBeVisible();

  await page.unroute(ANILIST_ENDPOINT);
  await installAniListMock(page);
  // A network swap never fires offline/online, so recovery rides on the
  // focus path. The browser build exercises TanStack's own
  // visibilitychange listener here; in the real webview, where
  // visibilitychange never fires on focus changes, the bridge in
  // src/lib/focus.ts feeds the same focusManager from native events.
  await page.evaluate(() => window.dispatchEvent(new Event("visibilitychange")));
  await expect(page.getByRole("link", { name: /Cowboy Bebop/ })).toBeVisible();
});

test("rate-limit errors surface the Retry-After message and never auto-retry", async ({ page }) => {
  const requestCount = await rateLimitAniList(page);
  await page.goto("/trending");
  // The message surfaces both in the offline state and the error toast.
  await expect(
    page.getByText("AniList rate limit reached. Retry in 30 seconds.").first(),
  ).toBeVisible();

  // Two retries on the default exponential backoff would fire at +1s and
  // +3s; none may arrive.
  await page.waitForTimeout(3500);
  expect(requestCount()).toBe(1);
});
