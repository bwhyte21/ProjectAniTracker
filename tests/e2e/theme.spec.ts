import { expect, test } from "@playwright/test";
import { installAniListMock, installIpcMock } from "./mocks";

test.beforeEach(async ({ page }) => {
  await installIpcMock(page);
  await installAniListMock(page);
});

test("theme toggle switches and persists across reloads", async ({ page }) => {
  await page.goto("/");
  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-theme", "dark");

  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(root).toHaveAttribute("data-theme", "light");

  await page.reload();
  await expect(root).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => localStorage.getItem("anitracker-theme"))).toBe("light");

  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(root).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => localStorage.getItem("anitracker-theme"))).toBe("dark");
});
