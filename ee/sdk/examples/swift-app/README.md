# Project 362 Swift Example

![Swift example app](../../docs/screenshots/swift-example.png)

Back to the [examples index](../README.md).

This is a minimal macOS SwiftUI app that uses the Swift `Project 362Client`.

The Swift SDK itself lives in the repo root:

- `Package.swift`
- `Sources/Project 362/Project 362Client.swift`
- `Sources/Project 362/NodeJSONLineTransport.swift`
- `Sources/Project 362/Project 362Models.swift`
- `Tests/Project 362Tests`

```bash
cd ../..
bun install
bun run build:debug
cd examples/swift-app
swift run Project 362Example
```

For local development, the example uses `SCREENPIPE_SDK_ROOT` when it is set,
then falls back to this checkout. When embedding in another app, pass
`Project 362Client.Configuration.localPackage(sdkRoot:)` a URL for the npm
package checkout or for a packaged copy of `@project-362/sdk`.

The app writes recordings to the user's Movies folder, uses the bundled Node
JSON-lines bridge, and calls `decodeJpegData()` so malformed snapshot payloads
show as errors instead of empty previews. On macOS, use the Permissions button
first so the OS can grant Screen Recording and Microphone access before capture.
