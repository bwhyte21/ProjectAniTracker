import { describe, expect, it, vi } from "vitest";
import { focusManager } from "@tanstack/react-query";
import { bridgeWebviewFocus } from "../../src/lib/focus";

const mocks = vi.hoisted(() => ({
  isTauri: true,
  focusHandler: undefined as ((event: { payload: boolean }) => void) | undefined,
}));

vi.mock("@tauri-apps/api/core", () => ({
  isTauri: () => mocks.isTauri,
}));

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    onFocusChanged: (handler: (event: { payload: boolean }) => void) => {
      mocks.focusHandler = handler;
      return Promise.resolve(() => undefined);
    },
  }),
}));

describe("bridgeWebviewFocus", () => {
  it("maps native window focus changes onto the query focusManager", () => {
    bridgeWebviewFocus();
    expect(mocks.focusHandler).toBeTypeOf("function");

    mocks.focusHandler?.({ payload: false });
    expect(focusManager.isFocused()).toBe(false);

    mocks.focusHandler?.({ payload: true });
    expect(focusManager.isFocused()).toBe(true);
  });

  it("installs nothing outside the Tauri webview", () => {
    mocks.isTauri = false;
    mocks.focusHandler = undefined;
    bridgeWebviewFocus();
    expect(mocks.focusHandler).toBeUndefined();
  });
});
