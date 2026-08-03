declare const require: (name: string) => any;
declare const process: { platform: string };

const fs = require("fs");
const os = require("os");
const path = require("path");

// @ts-expect-error - CommonJS module without type definitions
import * as imageTools from "../../native/image-tools.cjs";
// @ts-expect-error - CommonJS module without type definitions
import * as runtimePaths from "../../native/runtime-paths.cjs";
// @ts-expect-error - CommonJS module without type definitions
import * as securityHelpers from "../../native/security-helpers.cjs";
import { isDomainOrSubdomain } from "../../src/utils/domain";

describe("private runtime storage", () => {
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "peruz-security-test-"));
  });

  afterEach(() => {
    fs.rmSync(directory, { force: true, recursive: true });
  });

  it("creates owner-only directories and files", () => {
    const privateDirectory = path.join(directory, "runtime");
    const privateFile = path.join(privateDirectory, "state.json");

    runtimePaths.ensurePrivateDirectory(privateDirectory);
    runtimePaths.writeRestrictedFile(privateFile, "secret");

    if (process.platform !== "win32") {
      expect(fs.statSync(privateDirectory).mode & 0o777).toBe(0o700);
      expect(fs.statSync(privateFile).mode & 0o777).toBe(0o600);
    }
  });

  it("redacts credentials and rotates oversized logs", () => {
    const logPath = path.join(directory, "host.log");
    const log = securityHelpers.createBoundedLogger(logPath, 24);

    log("authorization: Bearer-sensitive-value");
    log("token=another-secret");

    const current = fs.readFileSync(logPath, "utf8");
    const rotated = fs.readFileSync(`${logPath}.1`, "utf8");
    expect(`${current}${rotated}`).not.toContain("sensitive-value");
    expect(`${current}${rotated}`).not.toContain("another-secret");
    expect(`${current}${rotated}`).toContain("[REDACTED]");
  });
});

describe("runtime input validation", () => {
  it("rejects invalid image dimensions before launching a subprocess", () => {
    expect(() => imageTools.normalizeMaxSize("1200; touch /tmp/injected")).toThrow();
    expect(() => imageTools.normalizeMaxSize(0)).toThrow();
    expect(imageTools.normalizeMaxSize("2048")).toBe(2048);
  });

  it("matches only an exact domain or a real subdomain", () => {
    expect(isDomainOrSubdomain(".x.com", "x.com")).toBe(true);
    expect(isDomainOrSubdomain("api.x.com", "x.com")).toBe(true);
    expect(isDomainOrSubdomain("notx.com", "x.com")).toBe(false);
    expect(isDomainOrSubdomain("x.com.attacker.test", "x.com")).toBe(false);
  });
});
