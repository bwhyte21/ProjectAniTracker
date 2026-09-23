import { expect, test } from "@playwright/test";
import { installAniListMock, installIpcMock } from "./mocks";

test.beforeEach(async ({ page }) => {
  await installIpcMock(page);
  await installAniListMock(page);
});

test("nav links route to every page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Popular This Season" })).toBeVisible();

  await page.getByRole("link", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL("/search");
  await expect(page.getByRole("heading", { name: "Search", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Library", exact: true }).click();
  await expect(page).toHaveURL("/library");
  await expect(page.getByRole("heading", { name: "Library", exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Season", exact: true }).click();
  await expect(page).toHaveURL("/season");
  await expect(page.getByRole("heading", { name: "Popular This Season" })).toBeVisible();

  await page.getByRole("link", { name: "Trending", exact: true }).click();
  await expect(page).toHaveURL("/trending");
  await expect(page.getByRole("heading", { name: "Trending Now" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Cowboy Bebop" })).toBeVisible();

  await page.getByRole("link", { name: "Top", exact: true }).click();
  await expect(page).toHaveURL("/top");
  await expect(page.getByRole("heading", { name: "Top Series" })).toBeVisible();

  await page.getByRole("link", { name: "About", exact: true }).click();
  await expect(page).toHaveURL("/about");
  await expect(page.getByRole("heading", { name: "About", exact: true })).toBeVisible();
  await expect(page.getByText("e2e-mock")).toBeVisible();

  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("heading", { name: "Popular This Season" })).toBeVisible();
});
