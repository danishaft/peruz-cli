---
name: peruz
description: Control Chrome browser via CLI for testing, automation, and debugging. Use when the user needs browser automation, screenshots, form filling, page inspection, network/CPU emulation, DevTools streaming, or AI queries via ChatGPT/Gemini/Perplexity/Grok.
---

# Peruz Browser Automation

Control Chrome browser via CLI or Unix socket.

## CLI Quick Reference

```bash
peruz --help                    # Full help
peruz <group>                   # Group help (tab, scroll, page, wait, dialog, emulate, form, perf, ai)
peruz --help-full               # All commands
peruz --find <term>             # Search tools
peruz --help-topic <topic>      # Topic guide (refs, semantic, frames, devices, windows)
```

## Core Workflow

```bash
# 1. Navigate to page
peruz navigate "https://example.com"

# 2. Read page to get element refs
peruz page.read

# 3. Click by ref or coordinates
peruz click --ref "e1"
peruz click --x 100 --y 200

# 4. Type text
peruz type --text "hello"

# 5. Screenshot
peruz screenshot --output /tmp/shot.png
```

## AI Assistants (No API Keys)

Query AI models using your browser's logged-in session. Must be logged into the respective service in Chrome.

### ChatGPT
```bash
peruz chatgpt "explain this code"
peruz chatgpt "summarize" --with-page              # Include current page context
peruz chatgpt "review" --model gpt-4o              # Specify model
peruz chatgpt "analyze" --file document.pdf        # With file attachment
```

### Gemini
```bash
peruz gemini "explain quantum computing"
peruz gemini "summarize" --with-page               # Include page context
peruz gemini "analyze" --file data.csv             # Attach file
peruz gemini "a robot surfing" --generate-image /tmp/robot.png
peruz gemini "add sunglasses" --edit-image photo.jpg --output out.jpg
peruz gemini "summarize" --youtube "https://youtube.com/..."
peruz gemini "hello" --model gemini-2.5-flash      # Models: gemini-3-pro (default), gemini-2.5-pro, gemini-2.5-flash
peruz gemini "wide banner" --generate-image /tmp/banner.png --aspect-ratio 16:9
```

### Perplexity
```bash
peruz perplexity "what is quantum computing"
peruz perplexity "explain this page" --with-page   # Include page context
peruz perplexity "deep dive" --mode research       # Research mode (Pro)
peruz perplexity "latest news" --model sonar       # Model selection (Pro)
```

### Grok (via x.com - requires X.com login in Chrome)
```bash
peruz grok "what are the latest AI trends on X"    # Search X posts
peruz grok "analyze @username recent activity"     # Profile analysis  
peruz grok "summarize this page" --with-page       # Include page context
peruz grok "find viral AI posts" --deep-search     # DeepSearch mode
peruz grok "quick question" --model fast           # Models: auto, fast, expert, thinking (default)
```

**Grok Validation & Troubleshooting:**
```bash
# Validate Grok UI and check available models (no query sent)
peruz grok --validate

# If models changed, save discovered models to surf.json config
peruz grok --validate --save-models
```

### AI Tool Troubleshooting

When AI queries fail, check these common issues:

1. **Not logged in**: The error "login required" means you need to log into the service in Chrome
2. **Model selection failed**: The UI may have changed. Run `peruz grok --validate` to check
3. **Response timeout**: Thinking models (ChatGPT o1, Grok thinking) can take 45+ seconds
4. **Element not found**: The service's UI changed. Check for peruz-cli updates

**Debugging workflow for agents:**
```bash
# 1. Check if the service is accessible and UI is valid
peruz grok --validate

# 2. If models mismatch, update the local settings
peruz grok --validate --save-models

# 3. Retry with explicit model name from validation output
peruz grok "query" --model <model-from-validation>

# 4. If still failing, try with longer timeout
peruz grok "query" --timeout 600
```

## Tab Management

```bash
peruz tab.list
peruz tab.new "https://google.com"
peruz tab.switch 12345
peruz tab.close 12345
peruz tab.reload                # Reload current tab

# Named tabs (aliases)
peruz tab.name myapp            # Name current tab
peruz tab.switch myapp          # Switch by name
peruz tab.named                 # List named tabs
peruz tab.unname myapp          # Remove name

# Tab groups
peruz tab.group                 # Create/add to tab group
peruz tab.ungroup               # Remove from group
peruz tab.groups                # List all tab groups
```

## Window Management

```bash
peruz window.list                              # List all windows
peruz window.list --tabs                       # Include tab details
peruz window.new                               # New window
peruz window.new --url "https://example.com"   # New window with URL
peruz window.new --incognito                   # New incognito window
peruz window.new --unfocused                   # Don't focus new window
peruz window.focus 12345                       # Focus window by ID
peruz window.close 12345                       # Close window
peruz window.resize --id 123 --width 1920 --height 1080
peruz window.resize --id 123 --state maximized # States: normal, minimized, maximized, fullscreen
```

**Window isolation for agents:**
```bash
# Create isolated window for agent work
peruz window.new "https://example.com"
# Returns window ID, use with subsequent commands:
peruz --window-id 123 tab.list
peruz --window-id 123 go "https://other.com"
```

## Input Methods

```bash
# CDP method (real events) - default
peruz type --text "hello"
peruz click --x 100 --y 200

# JS method (DOM manipulation) - for contenteditable
peruz type --text "hello" --selector "#input" --method js

# Keys
peruz key Enter
peruz key "cmd+a"
peruz key.repeat --key Tab --count 5           # Repeat key presses

# Hover and drag
peruz hover --ref e5
peruz drag --from-x 100 --from-y 100 --to-x 200 --to-y 200
```

## Page Inspection

```bash
peruz page.read                 # Accessibility tree with refs + page text
peruz page.read --no-text       # Interactive elements only (no text content)
peruz page.read --ref e5        # Get specific element details
peruz page.read --depth 3       # Limit tree depth
peruz page.read --compact       # Minimal output for LLM efficiency
peruz page.text                 # Plain text content only
peruz page.state                # Modals, loading state, scroll info
```

## Semantic Element Location

Find and act on elements by role, text, or label instead of refs:

```bash
# Find by ARIA role
peruz locate.role button --name "Submit" --action click
peruz locate.role textbox --name "Email" --action fill --value "test@example.com"
peruz locate.role link --all                    # Return all matches

# Find by text content
peruz locate.text "Sign In" --action click
peruz locate.text "Accept" --exact --action click

# Find form field by label
peruz locate.label "Username" --action fill --value "john"
peruz locate.label "Password" --action fill --value "secret"
```

**Actions:** `click`, `fill`, `hover`, `text` (get text content)

## Text Search

```bash
peruz search "login"                    # Find text in page
peruz search "Error" --case-sensitive   # Case-sensitive
peruz search "button" --limit 5         # Limit results
peruz find "login"                      # Alias for search
```

## Element Inspection

```bash
peruz element.styles e5                 # Get computed styles by ref
peruz element.styles ".card"            # Or by CSS selector
# Returns: font, color, background, border, padding, bounding box
```

## Scrolling

```bash
peruz scroll.bottom
peruz scroll.top  
peruz scroll.to --y 500         # Scroll to Y position
peruz scroll.to --ref e5        # Scroll element into view
peruz scroll.by --y 200         # Scroll by amount
peruz scroll.info               # Get scroll position
```

## Waiting

```bash
peruz wait 2                    # Wait 2 seconds
peruz wait.element ".loaded"    # Wait for element
peruz wait.network              # Wait for network idle
peruz wait.url "/success"       # Wait for URL pattern
peruz wait.dom --stable 100     # Wait for DOM stability
peruz wait.load                 # Wait for page load complete
```

## Dialog Handling

```bash
peruz dialog.info               # Get current dialog type/message
peruz dialog.accept             # Accept (OK)
peruz dialog.accept --text "response"  # Accept prompt with text
peruz dialog.dismiss            # Dismiss (Cancel)
```

## Device/Network Emulation

```bash
# Network throttling
peruz emulate.network slow-3g   # Presets: slow-3g, fast-3g, 4g, offline
peruz emulate.network reset     # Disable throttling

# CPU throttling  
peruz emulate.cpu 4             # 4x slower
peruz emulate.cpu 1             # Reset

# Device emulation (19 presets)
peruz emulate.device "iPhone 14"
peruz emulate.device "Pixel 7"
peruz emulate.device --list     # List available devices

# Custom viewport
peruz emulate.viewport --width 1280 --height 720
peruz emulate.touch --enable    # Enable touch emulation

# Geolocation
peruz emulate.geo --lat 37.7749 --lon -122.4194
peruz emulate.geo --clear
```

## Form Automation

```bash
peruz page.read                 # Get element refs first

# Fill by ref
peruz form.fill --data '[{"ref":"e1","value":"John"},{"ref":"e2","value":"john@example.com"}]'

# Checkboxes: true/false
peruz form.fill --data '[{"ref":"e7","value":true}]'

# Dropdown selection
peruz select e5 "Option A"                    # By value (default)
peruz select e5 "Option A" "Option B"         # Multi-select
peruz select e5 --by label "Display Text"     # By visible label
peruz select e5 --by index 2                  # By index (0-based)
```

## File Upload

```bash
peruz upload --ref e5 --files "/path/to/file.txt"
peruz upload --ref e5 --files "/path/file1.txt,/path/file2.txt"
```

## Iframe Handling

```bash
peruz frame.list                # List frames with IDs
peruz frame.switch "FRAME_ID"   # Switch to iframe context
peruz frame.main                # Return to main frame
peruz frame.js --id "FRAME_ID" --code "return document.title"

# After frame.switch, subsequent commands target that frame:
peruz frame.switch "iframe-1"
peruz page.read                 # Reads iframe content
peruz click e5                  # Clicks in iframe
peruz frame.main                # Back to main page
```

## Network Inspection

```bash
peruz network                   # List captured requests
peruz network --stream          # Real-time network events
peruz network.get --id "req-123"   # Full request details
peruz network.body --id "req-123"  # Get response body
peruz network.curl --id "req-123"  # Generate curl command
peruz network.origins           # List origins with stats
peruz network.stats             # Capture statistics
peruz network.export            # Export all requests
peruz network.clear             # Clear captured requests
```

## Console

```bash
peruz console                   # Get console messages
peruz console --stream          # Real-time console
peruz console --stream --level error  # Errors only
```

## JavaScript Execution

```bash
peruz js "return document.title"
peruz js "document.querySelector('.btn').click()"
```

## Performance

```bash
peruz perf.metrics              # Current metrics snapshot
peruz perf.start                # Start trace
peruz perf.stop                 # Stop and get results
```

## Screenshots

```bash
peruz screenshot                           # Auto-saves to /tmp/surf-snap-*.png
peruz screenshot --output /tmp/shot.png    # Save to specific file
peruz screenshot --selector ".card"        # Element only
peruz screenshot --full-page               # Full page scroll capture
peruz screenshot --no-save                 # Return base64 only, don't save file
```

## Zoom

```bash
peruz zoom                      # Get current zoom level
peruz zoom 1.5                  # Set zoom to 150%
peruz zoom 1                    # Reset to 100%
```

## Cookies & Storage

```bash
peruz cookie.list               # List cookies for current page
peruz cookie.list --domain .google.com
peruz cookie.set --name "token" --value "abc123"
peruz cookie.get --name "token"
peruz cookie.clear              # Clear all cookies
```

## History & Bookmarks

```bash
peruz history --query "github" --max 20
peruz bookmarks --query "docs"
peruz bookmark.add --url "https://..." --title "My Bookmark"
peruz bookmark.remove
```

## Health Checks & Smoke Tests

```bash
peruz health --url "http://localhost:3000"
peruz smoke --urls "http://localhost:3000" "http://localhost:3000/about"
peruz smoke --urls "..." --screenshot /tmp/smoke
```

## Workflows

Execute multi-step browser automation as a single command with smart auto-waits.

### Inline Workflows

```bash
# Pipe-separated commands
peruz do 'go "https://example.com" | click e5 | screenshot'

# Multi-step login flow
peruz do 'go "https://example.com/login" | type "user@example.com" --selector "#email" | type "pass" --selector "#password" | click --selector "button[type=submit]"'

# Validate without executing
peruz do 'go "url" | click e5' --dry-run
```

### Named Workflows

Save workflows as JSON files in `~/.surf/workflows/` (user) or `./.surf/workflows/` (project):

```bash
# List available workflows
peruz workflow.list

# Show workflow details
peruz workflow.info my-workflow

# Run by name with arguments
peruz do my-workflow --email "user@example.com" --password "secret"

# Validate workflow file
peruz workflow.validate workflow.json
```

### Workflow JSON Format

```json
{
  "name": "Login Flow",
  "description": "Automate login process",
  "args": {
    "email": { "required": true },
    "password": { "required": true },
    "url": { "default": "https://example.com/login" }
  },
  "steps": [
    { "tool": "navigate", "args": { "url": "%{url}" } },
    { "tool": "type", "args": { "text": "%{email}", "selector": "input[name=email]" } },
    { "tool": "type", "args": { "text": "%{password}", "selector": "input[name=password]" } },
    { "tool": "click", "args": { "selector": "button[type=submit]" } },
    { "tool": "screenshot", "args": {}, "as": "result" }
  ]
}
```

### Loops and Step Outputs

```json
{
  "steps": [
    // Capture step output for later use
    { "tool": "js", "args": { "code": "return [1,2,3]" }, "as": "items" },
    
    // Fixed iterations
    { "repeat": 5, "steps": [
      { "tool": "click", "args": { "ref": "e5" } }
    ]},
    
    // Iterate over array
    { "each": "%{items}", "as": "item", "steps": [
      { "tool": "js", "args": { "code": "console.log('%{item}')" } }
    ]},
    
    // Repeat until condition
    { "repeat": 20, "until": { "tool": "js", "args": { "code": "return done" } }, "steps": [...] }
  ]
}
```

### Workflow Options

```bash
--file, -f <path>     # Load from JSON file
--dry-run             # Parse and validate without executing
--on-error stop|continue  # Error handling (default: stop)
--step-delay <ms>     # Delay between steps (default: 100, 0 to disable)
--no-auto-wait        # Disable automatic waits
--json                # Structured JSON output
```

**Auto-waits:** Commands automatically wait for completion:
- Navigation (`go`, `back`, `forward`) → waits for page load
- Clicks, key presses, form fills → waits for DOM stability
- Tab switches → waits for tab to load

**Why use `do`?** Instead of 6-8 separate CLI calls with LLM orchestration between each, a workflow executes deterministically. Faster, cheaper, and more reliable.

## Error Diagnostics

```bash
# Auto-capture screenshot + console on failure
peruz wait.element ".missing" --auto-capture --timeout 2000
# Saves to /tmp/surf-error-*.png
```

## Common Options

```bash
--tab-id <id>         # Target specific tab
--window-id <id>      # Target specific window
--json                # Raw JSON output  
--auto-capture        # Screenshot + console on error
--timeout <ms>        # Override default timeout
```

## Tips

1. **First CDP operation is slow** (~5-8s) - debugger attachment overhead, subsequent calls fast
2. **Use refs from page.read** for reliable element targeting over CSS selectors
3. **JS method for contenteditable** - Modern editors (ChatGPT, Claude, Notion) need `--method js`
4. **Named tabs for workflows** - `tab.name app` then `tab.switch app`
5. **Auto-capture for debugging** - `--auto-capture` saves diagnostics on failure
6. **AI tools use browser session** - Must be logged into the service, no API keys needed
7. **Grok validation** - Run `peruz grok --validate` if queries fail to check UI changes
8. **Long timeouts for thinking models** - ChatGPT o1, Grok thinking can take 60+ seconds
9. **Use `peruz do` for multi-step tasks** - Reduces token overhead and improves reliability
10. **Dry-run workflows first** - `peruz do '...' --dry-run` validates without executing
11. **Window isolation** - Use `window.new` + `--window-id` to keep agent work separate from your browsing
12. **Semantic locators** - `locate.role`, `locate.text`, `locate.label` for more robust element finding
13. **Frame context** - Use `frame.switch` before interacting with iframe content

## Socket API

For programmatic access:

```bash
echo '{"type":"tool_request","method":"execute_tool","params":{"tool":"tab.list","args":{}},"id":"1"}' | nc -U /tmp/surf.sock
```
