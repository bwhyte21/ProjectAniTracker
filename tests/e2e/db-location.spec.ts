import { expect, test } from "@playwright/test";
import { installAniListMock, installIpcMock } from "./mocks";

test.beforeEach(async ({ page }) => {
  await installIpcMock(page);
  await installAniListMock(page);
});

async function openSettingsMenu(page: import("@playwright/test").Page): Promise<void> {
  await page.getByRole("button", { name: "Settings" }).click();
}

test("settings dropdown renders the current database path", async ({ page }) => {
  await page.goto("/");
  await openSettingsMenu(page);

  await expect(page.getByTestId("db-location-path")).toHaveText(
    "/home/user/.config/com.bryan.anitracker",
  );
  // Reset is offered only while a custom path is active.
  await expect(page.getByRole("menuitem", { name: "Reset to default" })).toHaveCount(0);
});

test("change flow reaches the confirm dialog and moves on confirm", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __E2E_DB_PICK?: string }).__E2E_DB_PICK = "/media/anime-db";
  });
  await page.goto("/");
  await openSettingsMenu(page);

  await page.getByRole("menuitem", { name: "Change..." }).click();

  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Move database and restart now?");
  await expect(dialog).toContainText("anitracker.db.bak");
  await expect(dialog).toContainText("/media/anime-db");

  await dialog.getByRole("button", { name: "Move and restart" }).click();

  // The mocked IPC resolves the move as a same-directory no-op, so the
  // app surfaces the info toast instead of restarting.
  await expect(page.getByText("already using this location")).toBeVisible();
  const calls = await page.evaluate(
    () => (window as unknown as { __E2E_DB_SET_CALLS?: (string | null)[] }).__E2E_DB_SET_CALLS,
  );
  expect(calls).toEqual(["/media/anime-db"]);
});

test("reset to default is offered and invoked while a custom path is active", async ({ page }) => {
  await page.addInitScript(() => {
    (
      window as unknown as {
        __E2E_DB_LOCATION?: { path: string; is_default: boolean; fell_back: boolean };
      }
    ).__E2E_DB_LOCATION = {
      path: "/media/anime-db",
      is_default: false,
      fell_back: false,
    };
  });
  await page.goto("/");
  await openSettingsMenu(page);

  await expect(page.getByTestId("db-location-path")).toHaveText("/media/anime-db");
  await page.getByRole("menuitem", { name: "Reset to default" }).click();

  const calls = await page.evaluate(
    () => (window as unknown as { __E2E_DB_SET_CALLS?: (string | null)[] }).__E2E_DB_SET_CALLS,
  );
  expect(calls).toEqual([null]);
});

test("boot fallback on the chosen location fires the warning toast", async ({ page }) => {
  await page.addInitScript(() => {
    (
      window as unknown as {
        __E2E_DB_LOCATION?: { path: string; is_default: boolean; fell_back: boolean };
      }
    ).__E2E_DB_LOCATION = {
      path: "/media/anime-db",
      is_default: true,
      fell_back: true,
    };
  });
  await page.goto("/");

  await expect(
    page.getByText("couldn't open the database at /media/anime-db, using the default location"),
  ).toBeVisible();
});
