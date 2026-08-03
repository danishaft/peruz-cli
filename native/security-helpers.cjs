const fs = require("fs");
const path = require("path");
const { appendRestrictedFile, writeRestrictedFile } = require("./runtime-paths.cjs");

const DEFAULT_MAX_LOG_BYTES = 5 * 1024 * 1024;
const SENSITIVE_VALUE_PATTERN = /(authorization|cookie|token|secret|password|api[-_]?key)(["'\s:=]+)([^\s,"'}]+)/gi;

function redactLogMessage(value) {
  return String(value)
    .replace(SENSITIVE_VALUE_PATTERN, "$1$2[REDACTED]")
    .replace(/([?&](?:key|token|secret|password)=)[^&\s]+/gi, "$1[REDACTED]");
}

function describeMessage(message) {
  if (!message || typeof message !== "object") return "invalid message";
  const fields = [
    `type=${String(message.type || "unknown")}`,
    message.id === undefined ? null : `id=${String(message.id)}`,
    message.method ? `method=${String(message.method)}` : null,
    message.params?.tool ? `tool=${String(message.params.tool)}` : null,
  ];
  return fields.filter(Boolean).join(" ");
}

function rotateLog(logPath, maxBytes) {
  try {
    if (fs.statSync(logPath).size < maxBytes) return;
    const backupPath = `${logPath}.1`;
    try {
      fs.unlinkSync(backupPath);
    } catch {}
    fs.renameSync(logPath, backupPath);
    if (process.platform !== "win32") fs.chmodSync(backupPath, 0o600);
  } catch {}
}

function createBoundedLogger(logPath, maxBytes = DEFAULT_MAX_LOG_BYTES) {
  return (message) => {
    rotateLog(logPath, maxBytes);
    appendRestrictedFile(logPath, `${new Date().toISOString()} ${redactLogMessage(message)}\n`);
  };
}

function writePrivateJson(filePath, value) {
  writeRestrictedFile(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8" });
}

module.exports = {
  DEFAULT_MAX_LOG_BYTES,
  createBoundedLogger,
  describeMessage,
  redactLogMessage,
  writePrivateJson,
};
