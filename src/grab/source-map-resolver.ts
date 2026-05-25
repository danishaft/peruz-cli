import { SourceMapConsumer } from "@jridgewell/source-map";

export interface GeneratedSourceLocation {
  url: string;
  line: number;
  column?: number;
  sourceMapUrl?: string;
}

type FetchText = (url: string) => Promise<string>;

const SOURCE_MAPPING_URL_RE = /\/\/# sourceMappingURL=([^\s]+)/;

function decodeDataUrl(url: string): string | undefined {
  const match = url.match(/^data:application\/json(?:;charset=[^;,]+)?(;base64)?,(.*)$/i);
  if (!match) return undefined;
  const encoded = match[2] || "";
  if (match[1]) {
    const binary = globalThis.atob(encoded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return decodeURIComponent(encoded);
}

function resolveUrl(input: string, base: string): string | undefined {
  try {
    return new URL(input, base).toString();
  } catch {
    return undefined;
  }
}

export function findSourceMappingUrl(scriptText: string): string | undefined {
  const match = scriptText.match(SOURCE_MAPPING_URL_RE);
  return match?.[1];
}

async function defaultFetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
  return response.text();
}

async function readSourceMap(
  generated: GeneratedSourceLocation,
  fetchText: FetchText,
): Promise<{ content: string; url: string } | undefined> {
  let mapUrl = generated.sourceMapUrl;
  if (!mapUrl) {
    const scriptText = await fetchText(generated.url);
    const mapped = findSourceMappingUrl(scriptText);
    if (!mapped) return undefined;
    mapUrl = mapped;
  }

  const resolvedMapUrl = mapUrl.startsWith("data:")
    ? mapUrl
    : resolveUrl(mapUrl, generated.url);
  if (!resolvedMapUrl) return undefined;

  const dataContent = decodeDataUrl(resolvedMapUrl);
  return {
    content: dataContent ?? await fetchText(resolvedMapUrl),
    url: resolvedMapUrl,
  };
}

export async function resolveSourceMapLocation(
  generated: GeneratedSourceLocation | undefined,
  fetchText: FetchText = defaultFetchText,
): Promise<string | undefined> {
  if (!generated?.url || !Number.isFinite(generated.line)) return undefined;

  try {
    const map = await readSourceMap(generated, fetchText);
    if (!map) return undefined;
    const consumer = new SourceMapConsumer(JSON.parse(map.content), map.url);
    const original = consumer.originalPositionFor({
      line: generated.line,
      column: generated.column ?? 0,
    });
    if (!original.source || !original.line) return undefined;
    return `${original.source}:${original.line}`;
  } catch {
    return undefined;
  }
}
