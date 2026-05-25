import { SourceMapGenerator } from "@jridgewell/source-map";
import { vi } from "vitest";
import {
  findSourceMappingUrl,
  resolveSourceMapLocation,
} from "../../../src/grab/source-map-resolver";

function makeMap(): string {
  const generator = new SourceMapGenerator({ file: "bundle.js" });
  generator.addMapping({
    generated: { line: 10, column: 4 },
    original: { line: 42, column: 0 },
    source: "src/components/Foo.tsx",
    name: "",
  });
  return generator.toString();
}

describe("source map resolver", () => {
  it("finds sourceMappingURL comments", () => {
    expect(findSourceMappingUrl("console.log(1);\n//# sourceMappingURL=bundle.js.map")).toBe(
      "bundle.js.map",
    );
  });

  it("maps generated bundle locations back to original source", async () => {
    const map = makeMap();
    const fetchText = vi.fn(async (url: string) => {
      if (url === "https://app.test/assets/bundle.js") {
        return "function Foo() {}\n//# sourceMappingURL=bundle.js.map";
      }
      if (url === "https://app.test/assets/bundle.js.map") {
        return map;
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    const source = await resolveSourceMapLocation(
      { url: "https://app.test/assets/bundle.js", line: 10, column: 4 },
      fetchText,
    );

    expect(source).toBe("https://app.test/assets/src/components/Foo.tsx:42");
    expect(fetchText).toHaveBeenCalledWith("https://app.test/assets/bundle.js.map");
  });
});
