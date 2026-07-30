# @TODOS

## Direction

- Keep the browser extension and CLI in TypeScript.
- Do not introduce Rust unless profiling or distribution evidence shows a concrete limitation.
- Do not add cloud infrastructure or Kubernetes to this local browser tool.

## Work

- [ ] Add end-to-end browser tests for navigation, reading, forms, frames, downloads, and failure states.
- [ ] Add protocol contract tests between the CLI, native host, and extension.
- [ ] Run a focused compatibility matrix for Chrome, Chromium, Brave, and Edge.
- [ ] Define the Windows support decision and add Windows tests only if it remains a target platform.
- [ ] Test installation, upgrade, and uninstall behavior without modifying unrelated browser configuration.
- [ ] Add release integrity checks and document supported browser and operating-system versions.
- [ ] Keep security scanning and secret detection enforced in CI.
