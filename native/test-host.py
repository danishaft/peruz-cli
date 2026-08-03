#!/usr/bin/env python3
import json
import os
import struct
import sys
import tempfile
from pathlib import Path

if configured_runtime_dir := os.environ.get("PERUZ_RUNTIME_DIR"):
    runtime_dir = Path(configured_runtime_dir)
elif xdg_runtime_dir := os.environ.get("XDG_RUNTIME_DIR"):
    runtime_dir = Path(xdg_runtime_dir) / "peruz"
else:
    runtime_dir = Path(tempfile.gettempdir()) / f"peruz-{os.getuid()}"
runtime_dir.mkdir(mode=0o700, parents=True, exist_ok=True)
runtime_dir.chmod(0o700)
log_path = runtime_dir / "test-host.log"


def log(message):
    descriptor = os.open(log_path, os.O_APPEND | os.O_CREAT | os.O_WRONLY, 0o600)
    os.chmod(log_path, 0o600)
    with os.fdopen(descriptor, "a", encoding="utf-8") as file:
        file.write(f"{message}\n")


log("Python host starting")


def send_message(message):
    encoded = json.dumps(message).encode('utf-8')
    sys.stdout.buffer.write(struct.pack('I', len(encoded)))
    sys.stdout.buffer.write(encoded)
    sys.stdout.buffer.flush()

# Send ready message
send_message({"type": "HOST_READY"})

log("Sent HOST_READY, waiting for messages")

# Read messages
while True:
    try:
        length_bytes = sys.stdin.buffer.read(4)
        if len(length_bytes) == 0:
            break
        length = struct.unpack('I', length_bytes)[0]
        message = sys.stdin.buffer.read(length).decode('utf-8')
        data = json.loads(message)
        log(f"Received: type={data.get('type', 'unknown')} id={data.get('id', 'none')}")
        # Echo back
        send_message({"id": data.get("id"), "success": True})
    except Exception as error:
        log(f"Error: {type(error).__name__}")
        break

log("Host exiting")
