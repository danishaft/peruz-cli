# Peruz Skills

This directory contains skill files for AI coding agents.

## Pi Agent

To use the peruz skill with [Pi coding agent](https://github.com/badlogic/pi-mono):

```bash
# Option 1: Symlink (auto-updates)
ln -s "$(pwd)/skills/peruz" ~/.pi/agent/skills/peruz

# Option 2: Copy
cp -r skills/peruz ~/.pi/agent/skills/
```

The skill will be available when pi detects browser automation tasks.

## Other Agents

The `SKILL.md` file is a comprehensive reference that can be adapted for other AI coding agents or used as documentation for LLM prompts.
