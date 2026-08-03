# System design

Peruz separates terminal-facing interfaces from browser execution. The native
host is the local trust boundary between Unix clients and a Chromium extension.

## System context

```mermaid
flowchart TB
    User[User or AI agent] --> CLI[Peruz CLI]
    Client[MCP client] --> MCP[Stdio MCP adapter]
    Script[Workflow file] --> CLI
    CLI --> Host[Native host]
    MCP --> Host
    Host <--> Browser[Chromium browser and extension]
    Browser --> Web[Web applications]
    Host --> Local[(Screenshots, logs, network data)]
```

No hosted Peruz service is involved. Browser-backed AI commands communicate
with third-party websites through the signed-in browser profile.

## Runtime components

```mermaid
flowchart LR
    subgraph Clients
        CLI[native/cli.cjs]
        MCP[native/mcp-server.cjs]
    end

    subgraph Native process
        Socket[Unix socket server]
        Router[Request router]
        Queue[AI request queue]
        Store[Network and file stores]
    end

    subgraph Extension
        Port[Native port manager]
        Worker[Service worker]
        CDP[CDP controller]
        Tree[Accessibility tree]
        Content[Content scripts]
    end

    CLI -->|newline JSON| Socket
    MCP -->|newline JSON| Socket
    Socket --> Router
    Router --> Queue
    Router --> Store
    Router <--> |length-prefixed JSON| Port
    Port <--> Worker
    Worker --> CDP
    Worker --> Tree
    Worker --> Content
```

The socket protocol makes CLI and MCP behavior share one execution path. Chrome
Native Messaging frames communication between the host process and extension.
The extension chooses CDP or a Chrome extension API according to the operation
and page restrictions.

## Command execution

```mermaid
sequenceDiagram
    actor Agent
    participant CLI as CLI or MCP
    participant Host as Native host
    participant Worker as Extension worker
    participant Chrome as CDP or Chrome API

    Agent->>CLI: command and arguments
    CLI->>Host: tool_request with unique ID
    Host->>Worker: mapped extension message
    Worker->>Chrome: execute browser operation
    Chrome-->>Worker: result or error
    Worker-->>Host: correlated response
    Host-->>CLI: tool_response
    CLI-->>Agent: text, JSON, or file path
```

The CLI applies a 30-second default timeout. Browser-backed AI and capture
commands use longer bounded timeouts. Errors remain errors unless the caller
explicitly selects `--soft-fail`.

## Page model

`page.read` builds an accessibility-oriented snapshot and assigns element
references such as `e5`. References belong to the current page state; they are
not durable database identifiers. Semantic locators query role, text, or label
at execution time.

Frame selection changes the active execution context. Window and tab IDs can be
passed explicitly, which lets an agent operate in an isolated browser window
without silently changing the user's active target.

## Grab content scripts

The top frame owns one Grab launcher. `grab-launcher.ts` creates the visible
control, starts a capture through the extension worker, and formats a local
fallback if the native host is unavailable. `draggable-overlay.ts` owns pointer
movement, viewport clamping, and click suppression after a drag. The visual
indicator does not create a second launcher.

The worker injects the extractor and picker only for an active capture. They
identify the selected element, gather bounded DOM and style context, and return
the result through the same correlated request path as CLI captures.

## Network capture

```mermaid
flowchart LR
    Events[CDP network events] --> Index[Bounded metadata index]
    Index --> Filter[CLI filters]
    Index --> Body[Lazy response-body lookup]
    Filter --> Output[Table, JSON, URLs, or cURL]
    Body --> Output
```

Static assets and large bodies are handled separately to prevent routine
capture from growing without limit. Network output can contain credentials or
personal data and must be treated as sensitive.

## Browser-backed AI

ChatGPT, Gemini, Perplexity, and Grok adapters serialize expensive requests
through a native-host queue. They open or reuse target tabs, drive the current
web UI, and collect visible output.

These adapters are not stable APIs. A site redesign, authentication challenge,
account restriction, or changed model name can cause an explicit failure. The
system does not claim that a page fallback is equivalent to a provider API.

## Security boundaries

The native host creates its Unix socket with mode `0600` inside an owner-only
runtime directory. The directory is selected from `$PERUZ_RUNTIME_DIR`,
`$XDG_RUNTIME_DIR/peruz`, or `/tmp/peruz-<uid>`, in that order. Native Messaging
also requires the installed extension ID in the browser manifest.

The extension remains highly privileged within browser-granted permissions. The
socket boundary prevents other operating-system users from connecting, but it
does not protect a user from an untrusted local process running under the same
account.

Generated screenshots, bounded logs, session state, and network records use the
same owner-only directory. Users should isolate automation profiles and avoid
retaining sensitive output.

## Installation model

`peruz install` writes a browser-specific Native Messaging manifest and wrapper
owned by Peruz. `peruz uninstall` removes those owned files. Extension loading
is manual because Chromium requires explicit user approval for unpacked
extensions.

The installation path differs by operating system and browser. That is why
browser and operating-system compatibility remains an end-to-end verification
task rather than a unit-test claim.

## Browser portability

The current browser boundary targets Chromium and depends on Chrome extension
APIs, Chrome Native Messaging locations, and CDP behavior. Chrome, Chromium,
Brave, Edge, and Arc can share this implementation where their installation
paths are supported.

Supporting another engine requires an adapter for extension APIs, debugging,
and native-host installation. Firefox can reuse the CLI, socket protocol,
native host, command schemas, and most content scripts, but it needs a
WebExtensions and WebDriver BiDi adapter. Safari requires a separately packaged
Safari Web Extension and native host integration. Peruz does not claim either
engine until its browser matrix passes end to end.

## Failure behavior

- A missing socket means the extension or native host is not connected.
- A disconnected extension fails pending work rather than returning success.
- Unknown commands and invalid target identifiers fail before browser action.
- Restricted browser pages return explicit limitations.
- Request timeouts close the client socket and exit non-zero.
- `--soft-fail` is opt-in for workflows that intentionally tolerate a failed
  action.

## Design decisions

- Keep one execution path behind CLI, socket, and MCP adapters.
- Use accessibility data for agent-readable state and CDP for low-level control.
- Fall back to Chrome APIs only where their semantics are understood.
- Keep the system local and avoid accounts, cloud relays, and remote control.
- Delay a Windows implementation until path, socket, and browser-host behavior
  can be tested on Windows.

## Verification boundary

The repository verifies source lint, TypeScript contracts, CLI syntax, unit
behavior, and production builds on Node.js 22 and 24. Those checks do not prove
browser installation or every command against every browser version. The open
compatibility work is tracked in `agent/todo.md`.
