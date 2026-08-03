const { execFileSync } = require("child_process");

const DEFAULT_MAX_SIZE = 1200;
const MAX_IMAGE_SIZE = 16384;

function normalizeMaxSize(value) {
  const size = Number(value ?? DEFAULT_MAX_SIZE);
  if (!Number.isInteger(size) || size < 1 || size > MAX_IMAGE_SIZE) {
    throw new Error(`maxSize must be an integer between 1 and ${MAX_IMAGE_SIZE}`);
  }
  return size;
}

function resizeImage(filePath, requestedMaxSize) {
  const maxSize = normalizeMaxSize(requestedMaxSize);

  try {
    if (process.platform === "darwin") {
      execFileSync("sips", ["--resampleHeightWidthMax", String(maxSize), filePath, "--out", filePath], {
        stdio: "pipe",
      });
      const sizeInfo = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", filePath], {
        encoding: "utf8",
      });
      const width = Number.parseInt(sizeInfo.match(/pixelWidth:\s*(\d+)/)?.[1] || "0", 10);
      const height = Number.parseInt(sizeInfo.match(/pixelHeight:\s*(\d+)/)?.[1] || "0", 10);
      return { success: true, width, height };
    }

    const resizeArgs = [filePath, "-resize", `${maxSize}x${maxSize}>`, filePath];
    try {
      execFileSync("convert", resizeArgs, { stdio: "pipe" });
    } catch {
      execFileSync("magick", resizeArgs, { stdio: "pipe" });
    }

    let sizeInfo;
    try {
      sizeInfo = execFileSync("identify", ["-format", "%w %h", filePath], { encoding: "utf8" });
    } catch {
      sizeInfo = execFileSync("magick", ["identify", "-format", "%w %h", filePath], {
        encoding: "utf8",
      });
    }
    const [width, height] = sizeInfo.trim().split(" ").map(Number);
    return { success: true, width, height };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

module.exports = { MAX_IMAGE_SIZE, normalizeMaxSize, resizeImage };
