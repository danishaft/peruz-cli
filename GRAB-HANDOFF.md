# peruz `grab` — Implementation Handoff

**From:** Atlas (Chief)
**To:** Implementing engineer (Pixel + Forge)
**Reviewer:** Atlas — ping when each sprint is done.
**Date locked:** 2026-05-18

---

## 1. Mission

Build `peruz grab`: click any element in a Chrome page peruz controls, get a structured context bundle on the clipboard, paste into Claude Code / Cursor / your agent of choice. Replaces the "screenshot + describe to the agent" loop with one step.

**This is a personal tool for one user.** Good UX matters. Flash does not. No telemetry, no cloud, no toolbar squatting on the page.

---

## 2. Reference reading (do this first)

The feature is parity-with-cuts against two existing tools. Read both before you start so you know the bar.

- **React Grab** (the gold standard for the capture format)
  - Repo: https://github.com/aidenybai/react-grab
  - Site: https://www.react-grab.com/
  - Intro post: https://www.react-grab.com/blog/intro
  - Agent integration post: https://www.react-grab.com/blog/agent
  - Third-party walkthrough: https://betterstack.com/community/guides/scaling-nodejs/react-grab-ai/
- **Agentation** (the structured-markdown output inspiration)
  - Site: https://www.agentation.com/

Technical references you will need:

- CDP `Overlay` domain (built-in highlighter): https://chromedevtools.github.io/devtools-protocol/tot/Overlay/
- CDP `Target.getTargets` (iframe enumeration): https://chromedevtools.github.io/devtools-protocol/tot/Target/
- React DevTools backend (fiber walking): https://github.com/facebook/react/tree/main/packages/react-devtools-shared
- `__source` JSX attr (file:line at compile time): https://babeljs.io/docs/babel-plugin-transform-react-jsx-source
- Source-map consumer: https://github.com/jridgewell/sourcemaps

---

## 3. Scope — what we are building, what we are NOT

### IN scope (the locked feature set)

- Element picker armed from the CLI, optional always-on daemon mode
- Click captures DOM + computed styles + ancestors + cropped screenshot
- React mode: component stack with `file:line` when available
- Iframe traversal (all frames, cross-origin OK)
- Shadow DOM piercing
- Markdown output (default) and JSON output (`--format json`)
- Clipboard auto-copy + stdout emit
- Window pinning enforcement
- Source-map ladder (4 rungs, auto-detected)

### OUT of scope (do not build these)

- Persistent toolbar on the page
- Annotation/notes UI
- Multi-element session storage, severity tagging, "resolve" flows
- Two-way agent communication, webhooks
- MCP server for grabs (we already have `mcp-server.cjs` for other things; grabs go to clipboard/stdout only)
- Plugin system, theme overrides
- Vue / Svelte / Solid adapters (React + DOM-only)
- Firefox / Safari / mobile (Chrome via CDP only)
- Multi-select, region select
- Audit log, telemetry, cloud sync
- "v0", "MVP", "lightweight" versions — sprint plan below is the real shape

If you find yourself reaching for any of the above, stop and ping Atlas. There is a reason it is cut.

---

## 4. Locked output format

Sections always appear in this order. Missing sections are omitted entirely, never left empty.

```markdown
# peruz-grab #001

## Element
- Tag: button
- Role: button
- Text: "Sign In"
- Selector: nav.header > div.actions > button.primary
- XPath: //nav[@class='header']//button[contains(@class,'primary')]
- Box: 248x40 @ (1142, 64)
- Frame: top                              # or full URL if in iframe
- Shadow: none                            # or "pierced: my-card > .inner"

## Component (React, via __source)
- Stack: SignInButton -> HeaderActions -> Header -> AppShell
- Source: src/components/auth/SignInButton.tsx:14
- Props: { variant: "primary", size: "md", disabled: false }

## Styles
- color: #FFFFFF
- background: #2563EB
- font: 14px/20px Inter 500
- padding: 8px 16px
- border-radius: 6px

## Ancestors (5)
1. <nav class="header">
2.   <div class="container">
3.     <div class="actions">
4.       <button class="primary">          <-- grabbed
5.         <span>Sign In</span>

## Screenshot
/tmp/peruz-grab-001.png
```

`--verbose` adds: full computed style dump, attached event listeners, sibling neighbors (prev/next). Nothing else.

JSON output mirrors this exactly — same field names, same nesting.

Component-section header includes the source-map rung used. One of: `via __source`, `via fiber`, `via sourcemap`. If no rung returned (plain HTML / no React), the Component section is omitted.

---

## 5. Command surface (locked)

```
peruz grab                    # one-shot: arm picker, await click, emit, exit
peruz grab --no-copy          # stdout only, skip clipboard
peruz grab --no-screenshot    # text-only bundle
peruz grab --depth 8          # override ancestor depth (default 5)
peruz grab --verbose          # full style dump + listeners + siblings
peruz grab --format json      # JSON instead of markdown
peruz grab.last               # re-emit last bundle from cache
peruz grab.watch              # daemon: Alt+Click in pinned window emits a grab
peruz grab.watch.stop         # kill daemon
peruz grab.watch.status       # is daemon running, on which window
```

No other flags. No other subcommands.

---

## 6. The 7 closed design decisions

Every one of these is locked. Don't relitigate without raising it first.

| # | Decision | Locked answer |
|---|---|---|
| 1 | Output format | Schema in section 4. Sections always in same order, omit when empty. |
| 2 | Trigger mode | Both — `peruz grab` one-shot AND `peruz grab.watch` daemon. |
| 3 | Iframes | Default-on. Enumerate via `Target.getTargets`, inject picker into each frame. |
| 4 | Shadow DOM | Default-on. Composed-tree walk. Emit JS path expression when piercing needed; CSS selector for light-DOM portions. |
| 5 | Hover-state elements | Hold-Alt-to-lock. Hover passes through normally; press Alt to freeze the element under cursor; click while Alt-held commits; release Alt cancels; Escape always cancels. |
| 6 | Source-map ladder | Try in order, tag rung in output: (1) `__source` JSX attr, (2) React DevTools fiber backend, (3) source-map consumption via `@jridgewell/source-map`, (4) DOM-only fallback. |
| 7 | Window pinning | Mandatory. Every command runs `session.status` first. No pin → exit with `error: no pinned window. Run 'peruz session.start <url>' first.` Daemon re-binds on navigation; exits if window closes. |

Plus from the earlier round:

- **Picker visual:** thin border + corner label showing role/component. No DevTools-style full overlay.
- **Screenshot location:** `/tmp/peruz-grab-NNN.png`. Ephemeral.
- **React detection:** auto-sniff fiber root. No flag.
- **Clipboard on Linux:** shell out to `wl-copy` first, `xclip -selection clipboard` fallback. Warn if neither installed.
- **Naming:** the verb is `grab`. Not `pick`, not `tag`.

---

## 7. Architecture

Two layers. CDP injection on demand. No new daemons unless `grab.watch` is started.

```
┌──────────────────────────────────────────────────────────┐
│  Layer 2: peruz CLI / native host                        │
│  - `grab` command + arg parser                           │
│  - source-map ladder resolver                            │
│  - markdown + JSON formatters                            │
│  - screenshot cropper                                    │
│  - clipboard writer                                      │
│  - daemon for grab.watch                                 │
└──────────────────────┬───────────────────────────────────┘
                       │ CDP
┌──────────────────────┴───────────────────────────────────┐
│  Layer 1: in-page picker module (~5KB)                   │
│  - hover outline + corner label                          │
│  - Alt-lock + click commit + Escape cancel               │
│  - composed-tree walker (light DOM + shadow DOM)         │
│  - React fiber walker (when fiber root present)          │
│  - DOM serializer → bundle payload sent back via CDP     │
│  Injected per-frame on grab; removed on commit/cancel    │
└──────────────────────────────────────────────────────────┘
```

---

## 8. Repository orientation

The peruz codebase you're extending:

- **CLI entry:** `native/cli.cjs` — register `grab` commands here, follow existing command patterns
- **Native host:** `native/host.cjs`, `native/host-helpers.cjs` — message bridge between CLI and the extension
- **Protocol:** `native/protocol.cjs` — wire format between native host and service worker
- **Formatters:** `native/formatters/` — markdown + JSON output formatters go here; mirror existing style
- **CDP controller:** `src/cdp/controller.ts` — CDP session management; iframe enumeration and picker injection live here
- **Content scripts:** `src/content/visual-indicator.ts` is the closest existing pattern for the picker overlay. `src/content/accessibility-tree.ts` is the closest pattern for in-page data extraction. Add `src/content/grab-picker.ts` and `src/content/grab-extractor.ts` for the new module.
- **Service worker:** `src/service-worker/index.ts` — routes messages between CLI and content scripts; register `grab.*` message types here
- **Build:** Vite (`vite.config.ts`). **Lint:** Biome (`biome.json`). **Tests:** Vitest (`vitest.config.ts`, suites under `test/`).

Do NOT invent a new module shape. Match what's already in the repo. If existing patterns disagree, follow `visual-indicator.ts` / `accessibility-tree.ts` / `controller.ts`.

---

## 9. Sprint plan (4 sprints, in order)

Do them sequentially. Don't start sprint N+1 until N is reviewed and accepted.

### Sprint 1 — Spine (DOM-only, top frame, one-shot)

**Goal:** `peruz grab` works end-to-end on a normal page (no iframes, no shadow DOM, no React magic). Bundle lands on clipboard.

Tasks:
1. Register `peruz grab` command + flags (`--no-copy`, `--no-screenshot`, `--depth`) in `native/cli.cjs`. Wire to native host.
2. Pinning enforcement: command exits with the locked error message if no `session.status` pin.
3. CDP injection: load the picker module into the top frame on grab; remove on commit/cancel. Wire in `src/cdp/controller.ts`.
4. Picker overlay (`src/content/grab-picker.ts`):
   - Thin outline + corner label showing tag and role
   - Hover passes through; hold Alt → lock outline on element under cursor; click while Alt-held → commit; release Alt without click → unlock; Escape → cancel
5. DOM extractor (`src/content/grab-extractor.ts`): tag, id, classes, role, ARIA attrs, visible text, unique CSS selector, XPath, computed style subset (color, background, font, padding, border-radius, display, position), bounding box, ancestor chain up to `--depth` (default 5).
6. Cropped element screenshot using existing peruz snap → `/tmp/peruz-grab-NNN.png`. Increment N across grabs in a session.
7. Markdown formatter (`native/formatters/grab-markdown.cjs`): emits exactly the schema in section 4. Sections always ordered, omit-when-empty.
8. Clipboard writer: `wl-copy` → fallback `xclip -selection clipboard`. Warn if neither.
9. `grab.last` cache: write last bundle to `/tmp/peruz-grab-last.md`. `peruz grab.last` reads and re-emits.
10. Vitest unit tests for the formatter and extractor with fixture HTML.

**Acceptance test (Trace will run; you should too before handoff):**
1. `peruz session.start "https://github.com/anthropics/peruz-cli"`
2. `peruz grab`
3. Alt-hover the README's first install command, click while Alt held
4. Paste clipboard into Claude Code
5. Claude Code correctly identifies the element from the bundle (selector + ancestors + screenshot file)

Acceptance passes if the bundle matches the schema, screenshot is correct, paste works on first try, and the entire round trip is under ~2 seconds from click to clipboard.

---

### Sprint 2 — React fidelity (Component section lights up)

**Goal:** When the page is a React app in dev mode, the bundle includes the Component section with file:line.

Tasks:
1. React fiber detection in `src/content/grab-extractor.ts`: walk `__reactFiber$*` / `__reactInternalInstance$*` from the clicked node up to the fiber root. Skip cleanly if no fiber.
2. `__source` reader: if the fiber's `_debugSource` is present, extract `fileName` and `lineNumber`. This is the easiest rung.
3. React DevTools backend rung: if `__source` is absent but fiber is present, walk the fiber tree to build the component-name stack (`type.displayName || type.name || 'Anonymous'`). No file:line here, but the stack is real.
4. Props extraction: shallow copy of `memoizedProps`, sanitize (skip functions, refs, children).
5. Source-map rung 3 — defer to Sprint 4. Skip for now. (Sprint 2 supports rungs 1, 2, 4.)
6. Output: Component section emitted when any rung returns; header tagged with the rung used (`via __source` or `via fiber`).
7. `--verbose` flag: adds full computed style dump, attached event listeners (use CDP `DOMDebugger.getEventListeners`), sibling neighbors.
8. Vitest tests with a fixture React tree (use `@testing-library` or hand-rolled fiber stubs).

**Acceptance test:**
1. Pull React Grab's own demo site or any local React dev app
2. `peruz session.start <local dev URL>`
3. `peruz grab`, Alt+click a known component
4. Bundle includes Component section with stack and file:line matching the source
5. Same flow on `https://example.com` (no React) — bundle omits Component section cleanly

---

### Sprint 3 — Real surfaces (iframes + shadow DOM)

**Goal:** Works on apps that use cross-origin iframes (Stripe, OAuth widgets) and web components (Lit, Ionic).

Tasks:
1. Frame enumeration in `src/cdp/controller.ts`: `Target.getTargets`, attach a session to each frame target, inject picker into each.
2. Cross-frame click routing: when picker in a sub-frame commits, route the bundle back to the main peruz process via CDP. Mark `Element.Frame` with the frame's URL or `top`.
3. Shadow DOM composed-tree walk in `src/content/grab-picker.ts` and `grab-extractor.ts`: descend into `shadowRoot` (open and closed via `Element.openOrClosedShadowRoot` where Chrome exposes it; fall back to open shadow when closed).
4. Hybrid selector emission: CSS selector for light-DOM portions; JS path expression (`document.querySelector('my-card').shadowRoot.querySelector('.inner')`) when piercing is required. Record pierce path in `Element.Shadow`.
5. Re-run Sprint 1 + Sprint 2 acceptance tests on:
   - A page with a Stripe Checkout embed
   - A page using `@material/web` or any Lit-based component lib

**Acceptance:** grabs work in both surfaces and the bundle's Frame/Shadow fields are populated correctly.

---

### Sprint 4 — Daemon + polish

**Goal:** Full feature surface. Production-grade.

Tasks:
1. `peruz grab.watch` daemon: long-running process holding a CDP connection to the pinned window. Listens for Alt+Click in any frame. Each click emits a numbered grab to stdout and clipboard.
2. Navigation rebind: when the pinned window navigates, re-inject the picker into the new page and its frames.
3. Daemon lifecycle: `grab.watch.stop` kills the process; `grab.watch.status` reports running/window. Daemon exits cleanly if the pinned window closes.
4. `--format json` flag: emit JSON matching the markdown schema 1:1.
5. Source-map rung 3 (prod bundles): consume sourcemap URLs in production bundles via `@jridgewell/source-map`; resolve `bundled.js:1234:56` back to `src/.../Foo.tsx:42`. Apply when fiber's `_debugSource` is absent but a sourcemap URL is present in the response.
6. Final polish: error messages, exit codes, `--help` output for every command.
7. Full regression: re-run Sprint 1 + 2 + 3 acceptance suites.

**Acceptance:** daemon survives a full browsing session including SPA navigations, multiple grabs in succession, with no manual reset. Source-map rung resolves at least one prod bundle to its real source file in a test setup.

---

## 10. Repository / project conventions

- Language: TypeScript (`src/`), CommonJS (`native/`). Match each directory's style.
- Build: `npm run build` (Vite). Don't add new bundlers.
- Lint: `npx biome check .` must pass. Don't disable rules without raising it.
- Tests: `npx vitest run`. Add a test file alongside each new module.
- No `any` unless you have a specific reason (the existing code is strict — match it).
- No comments explaining WHAT the code does. Only WHY when non-obvious.
- Don't add backwards-compat shims, feature flags, or "in case we need it later" abstractions.
- Don't add documentation files (READMEs, designs, etc.) unless explicitly requested. This handoff is the spec.

---

## 11. Review process

When you finish a sprint:

1. Run that sprint's acceptance test yourself; capture the output.
2. `npx vitest run` and `npx biome check .` — both clean.
3. Commit on a branch (don't merge to main).
4. Notify the user: **"Sprint N done, ready for Atlas review."**
5. Atlas reviews. Either:
   - Accepted → user merges, you start Sprint N+1
   - Punch list returned → fix and re-request review

Do not start Sprint N+1 before N is accepted. Do not bundle two sprints into one PR.

---

## 12. When you're blocked or unsure

If you hit a real ambiguity that isn't covered above, do NOT guess. Options:

- Re-read the relevant section (4, 5, 6, 7) — the answer is probably there
- Check the reference implementations (section 2) for how they handled it
- Ping Atlas directly with: the specific question, the option you're leaning toward, and why

Do not silently deviate from the locked decisions. Do not add scope from the OUT section. If something feels missing, raise it.

---

**Locked and signed by Atlas. Start with Sprint 1. Good hunting.**
