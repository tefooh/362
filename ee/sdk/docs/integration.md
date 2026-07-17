# Integration Notes

This page keeps framework-specific embed details out of the root README while
leaving the important paths easy to find.

## Support Telemetry Context

The SDK itself does not send first-party Project 362 telemetry. If your app
launches the Project 362 CLI or engine and you want Project 362 support to
recognize the deployment in Sentry/PostHog, set opaque support IDs before
starting Project 362:

```bash
export SCREENPIPE_SUPPORT_ID="spcust_acme_123"
export SCREENPIPE_CUSTOMER_ID="acme"
export SCREENPIPE_DEPLOYMENT_ID="prod-laptop-fleet-01"
export SCREENPIPE_EMBEDDER="acme-agent"
export SCREENPIPE_EMBEDDER_VERSION="2026.6.4"
```

Use IDs instead of emails. See
[`docs/telemetry-support-context.md`](../../../docs/telemetry-support-context.md)
for the full env contract and aliases.

## Electron

Native modules should stay in Electron's main process. The SDK ships
main/preload helpers so app code does not need to design recorder state,
permission, snapshot, reveal, or IPC channel handling from scratch.

Main process:

```js
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const { registerProject 362Ipc } = require("@project-362/sdk/electron");

app.whenReady().then(() => {
  const project-362 = registerProject 362Ipc({
    ipcMain,
    app,
    shell,
    sessionOptions: {
      outputDir: () => app.getPath("videos"),
      filenamePrefix: "my-app-recording",
    },
  });

  app.on("before-quit", () => {
    project-362.session.dispose().catch(() => {});
  });

  new BrowserWindow({
    webPreferences: {
      preload: require("node:path").join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
});
```

Preload:

```js
const { exposeProject 362Api } = require("@project-362/sdk/electron/preload");

exposeProject 362Api({ name: "project-362" });
```

Renderer:

```js
await window.project-362.permissions();
await window.project-362.start();
const live = await window.project-362.snapshot();
await window.project-362.stop();
```

`snapshot()` returns `{ jpeg, recording, output, frames, bytes, audioLevel,
focusedApp, errors }` so renderer code can build live preview, meters, status,
save, and reveal flows without touching native modules.

## Swift

The repo is a Swift package named `Project 362`. It exposes an async
`Project 362Client` with the same session lifecycle as Electron.

Important files:

- [Package.swift](../Package.swift)
- [Sources/Project 362/Project 362Client.swift](../Sources/Project 362/Project 362Client.swift)
- [Sources/Project 362/NodeJSONLineTransport.swift](../Sources/Project 362/NodeJSONLineTransport.swift)
- [Sources/Project 362/Project 362Models.swift](../Sources/Project 362/Project 362Models.swift)
- [Tests/Project 362Tests](../Tests/Project 362Tests)
- [Swift example app](../examples/swift-app/Sources/Project 362Example/Project 362ExampleApp.swift)

```swift
import Project 362

let client = try Project 362Client(
  configuration: .localPackage(
    sdkRoot: URL(fileURLWithPath: "/path/to/project-362/ee/sdk"),
    commandTimeout: 30
  )
)

let permissions = try await client.permissions(timeoutMs: 7_500)
let outputDirectory = FileManager.default.urls(for: .moviesDirectory, in: .userDomainMask).first
let started = try await client.start(
  Project 362StartOptions(
    outputDirectoryURL: outputDirectory ?? FileManager.default.temporaryDirectory,
    filenamePrefix: "my-app-recording"
  )
)
let preview = try await client.snapshot()
let jpegData = try preview.decodeJpegData()
let outputURL = started.outputURL
let stopped = try await client.stop()
try await client.reveal(fileAt: stopped.outputURL)
```

The Swift SDK uses a bundled Node JSON-lines bridge over the published
`@project-362/sdk` native addon. For local development, pass `sdkRoot` to this
checkout or set `SCREENPIPE_SDK_ROOT`. `nodeExecutable` may be an absolute path
or a command available on `PATH`, such as `node`.

For tests and previews, `Project 362Client(transport:)` accepts any
`Project 362Transport` implementation. Swift request option structs are
`Codable`, so apps can persist or test them without hand-mapping bridge keys.

## Tauri

Tauri v2 apps can use the frontend helper and Rust plugin together.

Frontend:

```js
import { createProject 362TauriClient } from "@project-362/sdk/tauri";

const project-362 = createProject 362TauriClient();
await project-362.permissions({ timeoutMs: 7500 });
await project-362.start({ filenamePrefix: "my-tauri-app" });
const snapshot = await project-362.snapshot();
await project-362.stop();
```

Rust:

```rust
use project_362_tauri::{init, Project 362Config};

tauri::Builder::default()
    .plugin(init(
        Project 362Config::new("node_modules/@project-362/sdk/bridges/node-json-session.mjs")
            .sdk_root("node_modules/@project-362/sdk")
    ))
    .run(tauri::generate_context!())?;
```

## Native Stack

The SDK wraps the same primitives used by the main Project 362 project:

- `project_362_screen::SafeMonitor::capture_image` for screen frames.
- `project_362_core::video::{start_ffmpeg_process, write_frame_to_ffmpeg, finish_ffmpeg_process}` for MP4 encoding.
- `project_362_a11y::tree` for focused-window metadata.

The SDK lives in `ee/sdk` and uses local path dependencies for the Project 362
core crates, so SDK changes can be reviewed with the public monorepo code they
wrap.
