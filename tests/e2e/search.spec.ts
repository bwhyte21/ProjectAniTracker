import { expect, test } from "@playwright/test";
import { installAniListMock, installIpcMock } from "./mocks";

test.beforeEach(async ({ page }) => {
  await installIpcMock(page);
  await installAniListMock(page);
});

test("typing updates the URL params and loads results", async ({ page }) => {
  await page.goto("/search");
  await page.getByLabel("Search anime").fill("Frieren");
  await expect(page).toHaveURL(/\/search\?q=Frieren$/);
  await expect(page.getByRole("link", { name: /Frieren: Beyond Journey/ })).toBeVisible();
});

test("the genre dropdown hides Hentai while the mature toggle is off", async ({ page }) => {
  await page.goto("/search");
  await page.getByRole("combobox").filter({ hasText: "Any genre" }).click();
  await expect(page.getByRole("option", { name: "Action" })).toBeVisible();
  await expect(page.getByRole("option", { name: "Hentai" })).toHaveCount(0);
});

test("the details back button returns to the search with state intact", async ({ page }) => {
  await page.goto("/search");
  await page.getByLabel("Search anime").fill("Frieren");
  const card = page.getByRole("link", { name: /Frieren: Beyond Journey/ });
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/anime\/21$/);
  await expect(page.getByRole("button", { name: "Back" })).toBeVisible();

  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/search\?q=Frieren$/);
  await expect(page.getByLabel("Search anime")).toHaveValue("Frieren");
  await expect(page.getByRole("link", { name: /Frieren: Beyond Journey/ })).toBeVisible();
});

test("deep-linking straight to a detail page hides the back button", async ({ page }) => {
  await page.goto("/anime/21");
  await expect(page.getByRole("heading", { name: "Sousou no Frieren", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Back" })).toHaveCount(0);
  // Related entries: the anime sequel shows, the manga SOURCE edge is filtered.
  await expect(page.getByRole("heading", { name: "Related Entries" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Frieren Season 2/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /manga/ })).toHaveCount(0);
  // Synopsis HTML is stripped: entities decode, no tags render.
  await expect(page.getByText("she made & kept friends.")).toBeVisible();
});
