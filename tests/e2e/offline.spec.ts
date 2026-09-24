import { expect, test } from "@playwright/test";
import { abortAniList, installIpcMock } from "./mocks";

test.beforeEach(async ({ page }) => {
  await installIpcMock(page);
});

test("browse pages show the offline state when AniList is unreachable", async ({ page }) => {
  await abortAniList(page);
  await page.goto("/search?q=Frieren");
  // Both search-page queries burn their two retries through the client's
  // paced request queue before giving up, so the offline state arrives late.
  await expect(page.getByText("No connection").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});

test("the library still loads while AniList is unreachable", async ({ page }) => {
  await abortAniList(page);
  await page.goto("/library");
  await expect(page.getByText("Nothing here yet.")).toBeVisible();
});
