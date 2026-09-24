import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { focusManager } from "@tanstack/react-query";

// TanStack's focusManager listens only to visibilitychange, which the Tauri
// webview fires just on minimize/restore -- never when the window merely
// regains focus after the user switched apps (tauri-apps/tauri#9524), e.g.
// toggling a VPN connection elsewhere. Bridge the native window focus
// events onto the focusManager so refetchOnWindowFocus recovers queries
// without a reload. Outside the webview (E2E browser build, plain dev)
// isTauri() is false and TanStack's default listener keeps applying.
export function bridgeWebviewFocus(): void {
  if (!isTauri()) {
    return;
  }
  void getCurrentWindow().onFocusChanged(({ payload: focused }) => {
    focusManager.setFocused(focused);
  });
}
