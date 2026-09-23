import { expect, test } from "@playwright/test";
import { abortAniList, installIpcMock } from "./mocks";

test.beforeEach(async ({ page }) => {
  await installIpcMock(page);
});

test("browse pages show the offline state when AniList is unreachable", async ({ page }) => {
  await abortAniList(page);
  await page.goto("/search?q=Frieren");
  await expect(page.getByText("No connection").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});

test("the library still loads while AniList is unreachable", async ({ page }) => {
  await abortAniList(page);
  await page.goto("/library");
  await expect(page.getByText("Nothing here yet.")).toBeVisible();
});
