<p>
  <img src="surf-banner.png" alt="Peruz" width="1100">
</p>

# Peruz

**The CLI for AI agents to control Chrome. Zero config, agent-agnostic, battle-tested.**

[![npm version](https://img.shields.io/npm/v/peruz-cli?style=for-the-badge)](https://www.npmjs.com/package/peruz-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux-blue?style=for-the-badge)]()

```bash
peruz go "https://example.com"
peruz read
peruz click e5
peruz snap
```

## Why Peruz

Browser automation for AI agents is harder than it looks. Most tools require complex setup, tie you to specific AI providers, or break on real-world pages.

Peruz takes a different approach:

**Agent-Agnostic** - Pure CLI commands over Unix socket. Works with Claude Code, GPT, Gemini, Cursor, custom agents, shell scripts - anything that can run commands.

**Zero Config** - Install the extension, run commands. No MCP servers to configure, no relay processes, no subscriptions.

**Battle-Tested** - Built by reverse-engineering production browser extensions and methodically working through agent-hostile pages like Discord settings. Falls back gracefully when CDP fails.

**Smart Defaults** - Screenshots auto-resize to 1200px (saves tokens). Actions auto-capture screenshots (saves round-trips). Errors on restricted pages warn instead of fail.

**AI Without API Keys** - Query ChatGPT, Gemini, Perplexity, and Grok using your existing browser logins. No API keys needed.

**Network Capture** - Automatically logs all network requests while active. Filter, search, and replay API calls without manually setting up request interception.

## Comparison

| Feature | Peruz | Manus | Claude Extension | DevTools MCP | dev-browser |
|---------|------|-------|------------------|--------------|-------------|
| Agent-agnostic | Yes | No (Manus only) | No (Claude only) | Partial | No (Claude skill) |
| Zero config | Yes | No (subscription) | No (subscription) | No (MCP setup) | No (relay server) |
| Local-only | Yes | No (cloud) | Partial | Yes | Partial |
| CLI interface | Yes | No | No | No | No |
| Free | Yes | No | No | Yes | Yes |
| AI via browser cookies | Yes | No | No | No | No |

## Installation

### Quick Start

```bash
# 1. Install globally
npm install -g peruz-cli

# 2. Load extension in Chrome
#    - Open chrome://extensions
#    - Enable "Developer mode"
#    - Click "Load unpacked"
#    - Paste the path from: peruz extension-path

# 3. Install native host (copy extension ID from chrome://extensions)
peruz install <extension-id>

# 4. Restart Chrome and test
peruz tab.list
```

### Multi-Browser Support

```bash
peruz install <extension-id>                    # Chrome (default)
peruz install <extension-id> --browser brave    # Brave
peruz install <extension-id> --browser all      # All supported browsers
```

Supported: `chrome`, `chromium`, `brave`, `edge`, `arc`

### Uninstall

```bash
peruz uninstall                  # Chrome only
peruz uninstall --all            # All browsers + wrapper files
```

### Development Setup

```bash
git clone https://github.com/danishaft/peruz-cli.git
cd peruz-cli
npm install
npm run build
# Then load dist/ as unpacked extension
```

## Usage

```bash
peruz <command> [args] [options]
peruz --help                    # Basic help
peruz --help-full               # All 50+ commands
peruz <command> --help          # Command details
peruz --find <query>            # Search commands
```

### Navigation

```bash
peruz go "https://example.com"
peruz back
peruz forward
peruz tab.reload --hard
```

### Reading Pages

```bash
peruz read                           # Accessibility tree + visible text content
peruz read --no-text                 # Accessibility tree only (no text)
peruz read --depth 3                 # Limit tree depth (smaller output)
peruz read --compact                 # Remove empty structural elements
peruz read --depth 3 --compact       # Both (60% smaller output)
peruz page.text                      # Raw text content only
peruz page.state                     # Modals, loading state, scroll position
```

Element refs (`e1`, `e2`, `e3`...) are stable identifiers from the accessibility tree - semantic, predictable, and resilient to DOM changes.

### Semantic Locators

Find and interact with elements by role, text, or label - no refs or selectors needed:

```bash
# By ARIA role
peruz locate.role button --name "Submit"           # Find button
peruz locate.role button --name "Submit" --action click  # Find and click
peruz locate.role textbox --action fill --value "hello"  # Find and fill
peruz locate.role link --all                       # List all links

# By text content  
peruz locate.text "Sign In" --action click         # Click element with text
peruz locate.text "Accept" --exact                 # Exact match only

# By form label
peruz locate.label "Email" --action fill --value "test@example.com"
```

### Iframe Support

Work with content inside iframes:

```bash
peruz frame.list                     # List all frames
peruz frame.switch --index 0         # Switch to first iframe
peruz frame.switch --name "payment"  # Switch by frame name
peruz frame.switch --selector "#checkout-frame"  # Switch by CSS selector

# Now all commands target the iframe
peruz read                           # Read iframe content
peruz click e5                       # Click in iframe
peruz locate.role button --action click

peruz frame.main                     # Return to main page
```

### Interaction

```bash
peruz click e5                       # Click by element ref
peruz click --selector ".btn"        # Click by CSS selector
peruz click 100 200                  # Click by coordinates
peruz type "hello" --submit          # Type and press Enter
peruz type "email@example.com" --ref e12  # Type into specific element
peruz key Escape                     # Press key
peruz scroll.bottom                  # Scroll to bottom
```

### Forms

Select options in dropdown menus:

```bash
peruz select e5 "US"                         # Select by value
peruz select "#country" "US"                 # Select by CSS selector
peruz select e5 "opt1" "opt2"                # Multi-select
peruz select e5 --by label "United States"   # Select by visible text
peruz select e5 --by index 0                 # Select first option
```

### Element Inspection

Get computed styles from elements:

```bash
peruz element.styles e5              # Get styles by ref
peruz element.styles ".header"       # Get styles by CSS selector (can return multiple)
```

Returns font, color, background, border, padding, and bounding box for design debugging.

### Screenshots

Screenshots auto-save to `/tmp` by default (optimized for AI agents):

```bash
peruz screenshot                             # Auto-saves to /tmp/surf-snap-*.png
peruz screenshot --output /tmp/shot.png      # Save to specific path
peruz screenshot --full --output /tmp/hd.png # Full resolution (skip resize)
peruz screenshot --annotate                  # With element labels
peruz screenshot --fullpage                  # Entire page
peruz screenshot --no-save                   # Return base64 + ID only (no file)
peruz snap                                   # Alias for screenshot
```

To disable auto-save globally, set `autoSaveScreenshots: false` in `surf.json`.

Actions like `click`, `type`, and `scroll` automatically capture a screenshot after execution - no extra command needed.

### Tabs

```bash
peruz tab.list
peruz tab.new "https://example.com"
peruz tab.switch 123
peruz tab.close 123
peruz tab.name "dashboard"           # Name current tab
peruz tab.switch "dashboard"         # Switch by name
peruz tab.group --name "Work" --color blue
```

### Window Isolation

Keep using your browser while the agent works in a separate window:

```bash
# Create isolated window for agent
peruz window.new "https://example.com"
# Returns: Window 123456 (tab 789)

# All subsequent commands target that window
peruz click e5 --window-id 123456
peruz read --window-id 123456
peruz tab.new "https://other.com" --window-id 123456

# Or manage windows directly
peruz window.list                    # List all windows
peruz window.list --tabs             # Include tab details
peruz window.focus 123456            # Bring window to front
peruz window.close 123456            # Close window
```

### Device Emulation

Test responsive designs and mobile layouts:

```bash
peruz emulate.device --list                    # Show available devices
peruz emulate.device "iPhone 14"               # Emulate iPhone 14
peruz emulate.device "Pixel 7"                 # Emulate Pixel 7
peruz emulate.device reset                     # Return to desktop

# Custom viewport
peruz emulate.viewport --width 375 --height 812
peruz emulate.viewport --width 1920 --height 1080 --scale 2

# Touch emulation
peruz emulate.touch                            # Enable touch
peruz emulate.touch --enabled false            # Disable touch
```

Available devices: iPhone 12-14 (Pro/Max), iPhone SE, iPad (Pro/Mini), Pixel 5-7 (Pro), Galaxy S21-S23, Galaxy Tab S7, Nest Hub (Max).

### Performance Tracing

Capture performance metrics and traces:

```bash
peruz perf.metrics                   # Current performance metrics
peruz perf.start                     # Start tracing
peruz perf.stop                      # Stop and get trace data
```

### AI Queries (No API Keys)

Query AI models using your browser's logged-in session:

```bash
# ChatGPT
peruz chatgpt "explain this code"
peruz chatgpt "summarize" --with-page     # Include page context
peruz chatgpt "analyze" --model gpt-4o    # Specify model
peruz chatgpt "review" --file code.ts     # Attach file

# Gemini
peruz gemini "explain quantum computing"
peruz gemini "summarize" --with-page                           # Include page context
peruz gemini "analyze" --file data.csv                         # Attach file
peruz gemini "a robot surfing" --generate-image /tmp/robot.png # Generate image
peruz gemini "add sunglasses" --edit-image photo.jpg --output out.jpg
peruz gemini "summarize" --youtube "https://youtube.com/..."   # YouTube analysis
peruz gemini "hello" --model gemini-2.5-flash                  # Model selection

# Perplexity
peruz perplexity "what is quantum computing"
peruz perplexity "explain this page" --with-page               # Include page context
peruz perplexity "deep dive" --mode research                   # Research mode (Pro)
peruz perplexity "latest news" --model sonar                   # Model selection (Pro)

# Grok (queries x.com/i/grok using your X.com login)
peruz grok "what are the latest AI agent trends on X"          # Search X posts
peruz grok "analyze @username recent activity"                 # Profile analysis
peruz grok "summarize this page" --with-page                   # Include page context
peruz grok "find viral AI posts" --deep-search                 # DeepSearch mode
peruz grok "quick question" --model fast                       # Models: auto, fast, expert, thinking
peruz grok --validate                                          # Check UI and available models
peruz grok --validate --save-models                            # Save discovered models to settings
```

Each AI tool uses your existing browser login - no API keys needed. Just be logged into the respective service in Chrome (chatgpt.com, gemini.google.com, perplexity.ai, or x.com).

**Grok troubleshooting:** If queries fail, run `peruz grok --validate` to check if the UI structure changed. Use `--save-models` to update the model cache in `surf.json`. Default model is "thinking" (Grok 4.1 Thinking).

### Waiting

```bash
peruz wait 2                         # Wait 2 seconds
peruz wait.element ".loaded"         # Wait for element
peruz wait.network                   # Wait for network idle
peruz wait.url "/dashboard"          # Wait for URL pattern
```

### Other

```bash
peruz js "return document.title"     # Execute JavaScript
peruz search "login"                 # Find text in page
peruz cookie.list                    # List cookies
peruz zoom 1.5                       # Set zoom to 150%
peruz console                        # Read console messages
peruz network                        # Read network requests
```

### Network Capture

Peruz automatically captures all network requests while active. No explicit start needed.

```bash
# Overview (token-efficient for LLMs)
peruz network                          # Recent requests, compact table
peruz network --urls                   # Just URLs (minimal output)
peruz network --format curl            # As curl commands

# Filtering
peruz network --origin api.github.com  # Filter by origin/domain
peruz network --method POST            # Only POST requests
peruz network --type json              # Only JSON responses
peruz network --status 4xx,5xx         # Only errors
peruz network --since 5m               # Last 5 minutes
peruz network --exclude-static         # Skip images/fonts/css/js

# Drill down
peruz network.get r_001                # Full request/response details
peruz network.body r_001               # Response body (for piping to jq)
peruz network.curl r_001               # Generate curl command
peruz network.origins                  # List captured domains

# Management
peruz network.clear                    # Clear captured data
peruz network.stats                    # Capture statistics
```

Storage location: `/tmp/surf/` (override with `--network-path` or `SURF_NETWORK_PATH` env).
Auto-cleanup: 24 hours TTL, 200MB max.

### Workflows

Execute multi-step browser automation as a single command:

```bash
# Inline workflow (pipe-separated)
peruz do 'go "https://example.com" | click e5 | screenshot'

# Multi-step login flow
peruz do 'go "https://example.com/login" | type "user@example.com" --selector "#email" | type "pass" --selector "#password" | click --selector "button[type=submit]"'

# From JSON file
peruz do --file workflow.json

# Run named workflow with arguments
peruz do my-workflow --url "https://example.com" --max_items 10

# Validate without executing
peruz do 'go "url" | click e5 | screenshot' --dry-run
```

**Why workflows?** Instead of 6-8 separate CLI calls with LLM orchestration between each step, a workflow executes deterministically with smart auto-waits. Faster, cheaper, and more reliable.

**Options:**
- `--file`, `-f` - Load workflow from JSON file
- `--dry-run` - Parse and validate without executing
- `--on-error stop|continue` - Error handling (default: stop)
- `--step-delay <ms>` - Delay between steps (default: 100, use 0 to disable)
- `--no-auto-wait` - Disable automatic waits between steps
- `--json` - Output structured JSON result
- `--<arg> <value>` - Pass arguments to workflow (e.g., `--url "..."`)

**Auto-waits:** Commands that trigger page changes automatically wait for completion:
- Navigation (`go`, `back`, `forward`) → waits for page load
- Clicks, key presses, form fills → waits for DOM stability
- Tab switches → waits for tab to load

#### Workflow Files

Workflows can be saved as JSON files and run by name. Place them in `~/.surf/workflows/` (user) or `./.surf/workflows/` (project).

**Basic format:**
```json
{
  "name": "login-flow",
  "description": "Log into example.com",
  "args": {
    "email": { "required": true, "desc": "Login email" },
    "password": { "required": true, "desc": "Login password" }
  },
  "steps": [
    { "tool": "navigate", "args": { "url": "https://example.com/login" } },
    { "tool": "type", "args": { "text": "%{email}", "selector": "input[name=email]" } },
    { "tool": "type", "args": { "text": "%{password}", "selector": "input[name=password]" } },
    { "tool": "click", "args": { "selector": "button[type=submit]" } }
  ]
}
```

**Step outputs** - Capture results for use in later steps:
```json
{
  "steps": [
    { "tool": "js", "args": { "code": "return document.title" }, "as": "title" },
    { "tool": "js", "args": { "code": "return 'Page: ' + '%{title}'" } }
  ]
}
```

**Loops** - `repeat` for fixed iterations, `each` for arrays:
```json
{
  "steps": [
    { "tool": "js", "args": { "code": "return ['a', 'b', 'c']" }, "as": "items" },
    {
      "each": "%{items}",
      "as": "item",
      "steps": [
        { "tool": "js", "args": { "code": "return 'Processing: %{item}'" } }
      ]
    }
  ]
}
```

```json
{
  "steps": [
    {
      "repeat": 5,
      "steps": [
        { "tool": "scroll", "args": { "direction": "down" } },
        { "tool": "wait", "args": { "duration": 500 } }
      ]
    }
  ]
}
```

**Loop with exit condition** - Stop early when condition is met:
```json
{
  "repeat": 20,
  "until": { "tool": "js", "args": { "code": "return !document.querySelector('.next-page')" } },
  "steps": [
    { "tool": "click", "args": { "selector": ".next-page" } },
    { "tool": "wait.load" }
  ]
}
```

#### Workflow Management

```bash
# List available workflows
peruz workflow.list

# Show workflow details and arguments
peruz workflow.info my-workflow

# Validate workflow JSON
peruz workflow.validate ./my-workflow.json
```

**Supported commands:** All peruz commands work in workflows. Use aliases (`go`, `snap`, `read`) or full names (`navigate`, `screenshot`, `page.read`).

## Global Options

```bash
--tab-id <id>      # Target specific tab
--window-id <id>   # Target specific window (isolate agent from your browsing)
--json             # Output raw JSON
--soft-fail        # Warn instead of error (exit 0) on restricted pages
--no-screenshot    # Skip auto-screenshot after actions
--full             # Full resolution screenshots (skip resize)
--network-path <path>  # Custom path for network logs (default: /tmp/surf, or SURF_NETWORK_PATH env)
```

## Socket API

For programmatic integration, send JSON to `/tmp/surf.sock`:

```bash
echo '{"type":"tool_request","method":"execute_tool","params":{"tool":"tab.list","args":{}},"id":"1"}' | nc -U /tmp/surf.sock
```

### Protocol Reference

**Request:**
```json
{
  "type": "tool_request",
  "method": "execute_tool",
  "params": {
    "tool": "click",
    "args": { "ref": "e5" }
  },
  "id": "unique-request-id",
  "tabId": 123,
  "windowId": 456
}
```

**Success Response:**
```json
{
  "type": "tool_response",
  "id": "unique-request-id",
  "result": {
    "content": [{ "type": "text", "text": "Result message" }]
  }
}
```

**Error Response:**
```json
{
  "type": "tool_response",
  "id": "unique-request-id",
  "error": {
    "content": [{ "type": "text", "text": "Error message" }]
  }
}
```

## Command Groups

| Group | Commands |
|-------|----------|
| `workflow` | `do`, `workflow.list`, `workflow.info`, `workflow.validate` |
| `window.*` | `new`, `list`, `focus`, `close`, `resize` |
| `tab.*` | `list`, `new`, `switch`, `close`, `name`, `unname`, `named`, `group`, `ungroup`, `groups`, `reload` |
| `scroll.*` | `top`, `bottom`, `to`, `info` |
| `page.*` | `read`, `text`, `state` |
| `locate.*` | `role`, `text`, `label` |
| `element.*` | `styles` |
| `frame.*` | `list`, `switch`, `main`, `js` |
| `wait.*` | `element`, `network`, `url`, `dom`, `load` |
| `cookie.*` | `list`, `get`, `set`, `clear` |
| `bookmark.*` | `add`, `remove`, `list` |
| `history.*` | `list`, `search` |
| `dialog.*` | `accept`, `dismiss`, `info` |
| `emulate.*` | `network`, `cpu`, `geo`, `device`, `viewport`, `touch` |
| `perf.*` | `start`, `stop`, `metrics` |
| `network.*` | `get`, `body`, `curl`, `origins`, `clear`, `stats`, `export`, `path` |

## Aliases

| Alias | Command |
|-------|---------|
| `snap` | `screenshot` |
| `read` | `page.read` |
| `find` | `search` |
| `go` | `navigate` |

## How It Works

```
CLI (peruz) → Unix Socket → Native Host → Chrome Extension → CDP/Scripting API
```

Peruz uses Chrome DevTools Protocol for most operations, with automatic fallback to `chrome.scripting` API when CDP is unavailable (restricted pages, certain contexts). Screenshots fall back to `captureVisibleTab` when CDP capture fails.

## Limitations

- Cannot automate `chrome://` pages or the Chrome Web Store (Chrome restriction)
- First CDP operation on a new tab takes ~100-500ms (debugger attachment)
- Some operations on restricted pages return warnings instead of results

## Linux Support (Experimental)

Peruz should work on Linux with Chromium. Not yet tested in production.

```bash
# Install dependencies
sudo apt install chromium-browser nodejs npm imagemagick

# For headless server: add Xvfb + VNC
sudo apt install xvfb tigervnc-standalone-server

# Install Peruz and native host
npm install -g peruz-cli
peruz install <extension-id> --browser chromium
```

**Notes:**
- Use Chromium (no official Chrome for Linux ARM64)
- Screenshot resize uses ImageMagick instead of macOS `sips`
- Headless servers need Xvfb + VNC for initial login setup

## AI Agent Integration

Peruz includes a skill file for AI coding agents like [Pi](https://github.com/badlogic/pi-mono):

```bash
# Symlink for auto-updates
ln -s "$(pwd)/skills/peruz" ~/.pi/agent/skills/peruz

# Or copy
cp -r skills/peruz ~/.pi/agent/skills/
```

See [`skills/README.md`](skills/README.md) for details.

## Development

```bash
npm run dev       # Watch mode
npm run build     # Production build
```

After changes:
- **Extension** (`src/`): Reload at `chrome://extensions`
- **Host** (`native/`): Re-run `node native/cli.cjs install <extension-id>` from this repo so the native host uses this copy; then fully quit and reopen the browser.

## License

MIT
