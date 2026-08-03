const fs = require("fs");
const os = require("os");
const path = require("path");

const PRIVATE_DIRECTORY_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;

function getRuntimeDirectory(env = process.env) {
  if (env.PERUZ_RUNTIME_DIR) return path.resolve(env.PERUZ_RUNTIME_DIR);
  if (env.XDG_RUNTIME_DIR) return path.join(path.resolve(env.XDG_RUNTIME_DIR), "peruz");

  const identity = typeof process.getuid === "function"
    ? String(process.getuid())
    : os.userInfo().username.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(os.tmpdir(), `peruz-${identity}`);
}

const RUNTIME_DIRECTORY = getRuntimeDirectory();
const SOCKET_PATH = process.platform === "win32"
  ? "\\\\.\\pipe\\peruz-browser"
  : path.join(RUNTIME_DIRECTORY, "host.sock");

function ensurePrivateDirectory(directory = RUNTIME_DIRECTORY) {
  fs.mkdirSync(directory, { recursive: true, mode: PRIVATE_DIRECTORY_MODE });
  if (process.platform !== "win32") fs.chmodSync(directory, PRIVATE_DIRECTORY_MODE);
  return directory;
}

function runtimePath(filename) {
  return path.join(RUNTIME_DIRECTORY, filename);
}

function writeRestrictedFile(filePath, data, options = {}) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, data, { ...options, mode: PRIVATE_FILE_MODE });
  if (process.platform !== "win32") fs.chmodSync(filePath, PRIVATE_FILE_MODE);
}

function appendRestrictedFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, data, { mode: PRIVATE_FILE_MODE });
  if (process.platform !== "win32") fs.chmodSync(filePath, PRIVATE_FILE_MODE);
}

module.exports = {
  PRIVATE_DIRECTORY_MODE,
  PRIVATE_FILE_MODE,
  RUNTIME_DIRECTORY,
  SOCKET_PATH,
  appendRestrictedFile,
  ensurePrivateDirectory,
  getRuntimeDirectory,
  runtimePath,
  writeRestrictedFile,
};
