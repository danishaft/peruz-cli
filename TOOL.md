# Peruz CLI

`Peruz CLI` is the browser automation and visual verification tool for agents.
Use it when an agent needs to open pages, inspect UI state, take screenshots,
read page text, or check localhost apps from your phone workflow.

## Status

- `active`

## Command name

- Primary: `peruz`
- Alias: `surf` (legacy compatibility alias)
- Local path fallback: `node /home/ayodele/Desktop/catharis/active/peruz-cli/native/cli.cjs`

## When agents should use it

- Open and inspect web pages.
- Take screenshots for Telegram updates.
- Verify localhost apps visually.
- Read page text and basic DOM state.
- Run browser health/smoke checks.

## Safety and approval notes

- Read and screenshot actions are low risk and are usually auto-approved in the
  Telegram bridge.
- Actions that click, type, submit, or run larger workflows can require manual
  approval.
- Payment and account actions must be explicit and monitored.

## Requirements on this PC

- Browser extension is loaded and enabled.
- Native host is installed and linked to the current extension ID.
- Browser is running.
- For some commands, an active tab must exist.

## Quick test

1. `node /home/ayodele/Desktop/catharis/active/peruz-cli/native/cli.cjs --version`
2. `node /home/ayodele/Desktop/catharis/active/peruz-cli/native/cli.cjs tab.new http://localhost:3000`
3. `node /home/ayodele/Desktop/catharis/active/peruz-cli/native/cli.cjs page.read`
4. `node /home/ayodele/Desktop/catharis/active/peruz-cli/native/cli.cjs screenshot --output /tmp/peruz-test.png`

## Known limits

- Native messaging host name remains `surf.browser.host` for compatibility.
- Socket path still uses `/tmp/surf.sock` for compatibility.
- Sites with CAPTCHA, anti-bot checks, or strong fraud controls can block
  automation.
- `health` checks can time out even when basic browser control works.
