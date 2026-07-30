# @TODOS

The source, protocol helpers, packaging, and Node.js compatibility gates are
covered. The remaining work requires real browser or release environments.

- [ ] Run one end-to-end workflow for navigation, semantic reading, forms,
      frames, downloads, network capture, and restricted-page failures.
- [ ] Verify install, upgrade, connection, and uninstall on current Chrome and
      Chromium for macOS and Linux.
- [ ] Add Brave and Edge to the compatibility matrix only after Chrome and
      Chromium pass.
- [ ] Decide whether Windows support is worth replacing the Unix-socket and
      manifest assumptions; do not claim it before a native Windows run.
- [ ] Add npm provenance and verify the packed extension/native-host install
      from the published artifact.
- [ ] Add secret scanning to CI before accepting external contributions.
