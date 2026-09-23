import { expect, test } from "@playwright/test";
import { installAniListMock, installIpcMock } from "./mocks";

test.beforeEach(async ({ page }) => {
  await installIpcMock(page);
  await installAniListMock(page);
});

test("save round trip: add, library tab, update status and episodes, remove", async ({ page }) => {
  await page.goto("/anime/21");
  await expect(page.getByRole("heading", { name: "Sousou no Frieren", exact: true })).toBeVisible();

  // Add to Library as Plan to Watch -- the button swaps to the status select.
  await page.getByRole("button", { name: "Add to Library" }).click();
  await page.getByRole("menuitem", { name: "Plan to Watch" }).click();
  await expect(page.getByRole("combobox")).toHaveText(/Plan to Watch/);

  // The entry lands in the Library, in its status tab.
  await page.getByRole("link", { name: "Library", exact: true }).click();
  await expect(page).toHaveURL("/library");
  const card = page.getByRole("link", { name: /Frieren: Beyond Journey/ });
  await expect(card).toBeVisible();
  await expect(card.getByText("Plan to Watch")).toBeVisible();

  await page.getByRole("tab", { name: "Plan to Watch" }).click();
  await expect(page).toHaveURL(/\/library\?status=plan-to-watch$/);
  await expect(card).toBeVisible();
  await page.getByRole("tab", { name: "All" }).click();
  await expect(page).toHaveURL("/library");

  // Reopen the detail page from the card.
  await card.click();
  await expect(page).toHaveURL(/\/anime\/21$/);

  // Switching to Completed auto-fills Episodes Seen with the episode count.
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: "Completed" }).click();
  await expect(page.getByText("12 / 12")).toBeVisible();

  // The counter controls update episodes seen.
  await page.getByRole("button", { name: "Decrease episodes seen" }).click();
  await expect(page.getByText("11 / 12")).toBeVisible();

  // Remove returns the Add to Library button and empties the Library.
  await page.getByRole("button", { name: "Remove from Library" }).click();
  await expect(page.getByRole("button", { name: "Add to Library" })).toBeVisible();

  await page.getByRole("link", { name: "Library", exact: true }).click();
  await expect(page.getByText("Nothing here yet.")).toBeVisible();
});
