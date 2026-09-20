# AniTracker

A personal, local-first anime tracker desktop app. Browse anime via AniList,
track what you are watching, and keep your library on your own machine. There
are no profiles, accounts, or social features -- the app is only a private tracker.

## Features

- AniList-powered browsing: search, Popular This Season, Trending Now, and a
  Top Series table with selectable count (10/25/50/100)
- Anime detail pages with titles, metadata, genres, score, and related entries
- Personal library with watch statuses: Currently Watching, Plan to Watch,
  Completed, Paused, Dropped
- Cover images downloaded and stored locally, so the library works fully
  offline (browse pages need a connection)
- Dark mode (Scary Forest palette) and light mode, with the choice persisted
  across restarts

## Tech Stack

| Layer    | Technology                                         |
| -------- | -------------------------------------------------- |
| Shell    | Tauri v2                                           |
| Frontend | React + TypeScript + Vite                          |
| Styling  | Tailwind CSS + shadcn/ui                           |
| Routing  | TanStack Router                                    |
| Data     | TanStack Query (AniList queries and library reads) |
| Backend  | Rust IPC commands                                  |
| Storage  | SQLite via tauri-plugin-sql                        |
| API      | AniList GraphQL (<https://graphql.anilist.co>)     |

Architecture at a glance:

``` text
+---------------------------- Tauri v2 app ----------------------------+
|                                                                     |
|  React frontend (Vite dev server / bundled dist)                    |
|    |  TanStack Router + Query                                       |
|    |                                                                |
|    +--> HTTPS --> AniList GraphQL (browse/search data, online only) |
|    |                                                                |
|    +--> Tauri IPC --> Rust commands (save / update / delete / list) |
|                          |                                          |
|                          +--> SQLite (anitracker.db)               |
|                          +--> cover images (app data dir)          |
+---------------------------------------------------------------------+
```

## Prerequisites

- **Node.js** LTS (developed with v22) and npm
- **Rust** stable toolchain, installed via
  [rustup](https://www.rust-lang.org/tools/install)
- System dependencies for your OS (see [Platform Setup](#platform-setup))

## Getting Started

```bash
# 1. Install frontend dependencies
npm install

# 2. Run in dev mode (Vite + Rust, hot reload)
npm run tauri dev

# 3. Build a release bundle (tsc + vite build, then cargo release + bundling)
npm run tauri build
```

Bundles are written to `src-tauri/target/release/bundle/`.

## Installing from GitHub Releases

Prebuilt installers are attached to each
[GitHub Release](https://github.com/bwhyte21/ProjectAniTracker/releases).
What your machine needs to run them:

| Platform                    | Asset        | Handled by the installer                                           | Expected on your machine                                |
| --------------------------- | ------------ | ------------------------------------------------------------------ | ------------------------------------------------------- |
| Windows 10+                 | `-setup.exe` | App and all bundled libs; downloads WebView2 only if it is missing | Nothing extra                                           |
| macOS 10.15+, Apple Silicon | `.dmg`       | Fully self-contained `.app`                                        | Nothing extra                                           |
| Debian/Ubuntu/Mint          | `.deb`       | App; `apt` resolves webkit2gtk and related deps on install         | Nothing extra                                           |
| Other Linux distros         | `.AppImage`  | App and most bundled libs                                          | `webkit2gtk-4.1` (preinstalled on most desktop distros) |

Notes:

- The macOS build targets Apple Silicon (arm64). Intel Macs are not
  supported by the current release artifacts.
- The AppImage needs execute permission: `chmod +x AniTracker_*.AppImage`.
- App data (SQLite database and cover images) lives under
  `~/.config/com.bryan.anitracker/` (Linux), the equivalent app-data
  directories on Windows/macOS.

## Platform Setup

### Linux

Tested on Linux Mint 22.3 (apt-based). For Debian/Ubuntu/Mint:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

For Arch or Fedora, use the equivalent package lists in the official
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/#system-dependencies).

Notes:

- `npm run tauri build` produces `.deb` and AppImage bundles.
- App data (SQLite database and cover images) lives under
  `~/.config/com.bryan.anitracker/`.

### Windows

**NOTE:** This section is sourced from the official
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/); it has not
been tested locally.

System dependencies:

- **Microsoft C++ Build Tools** -- install from the
  [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
  page and enable the "Desktop development with C++" workload.
- **WebView2** -- already installed on Windows 10 (1803+) and Windows 11;
  otherwise install the "Evergreen Bootstrapper" from the
  [WebView2 download page](https://developer.microsoft.com/en-us/microsoft-edge/webview2/#download-section).
- **Rust with the MSVC toolchain** -- install via
  [rustup](https://www.rust-lang.org/tools/install) and confirm the default
  host triple is `x86_64-pc-windows-msvc` (or run `rustup default stable-msvc`).

Notes:

- Building MSI packages requires the VBSCRIPT optional feature, which is
  enabled by default on most installations.

### macOS

**NOTE:** This section is sourced from the official
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/); it has not
been tested locally.

System dependencies:

- **Xcode Command Line Tools** (desktop-only development):
  `xcode-select --install`
- **Rust** stable toolchain via
  [rustup](https://www.rust-lang.org/tools/install)

Notes:

- macOS 10.15 (Catalina) or later is required.
- `npm run tauri build` produces a `.app` bundle and a `.dmg` installer.
