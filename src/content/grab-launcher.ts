(() => {
  type LauncherState = "idle" | "selecting" | "success" | "error";

  type GrabBox = { x: number; y: number; width: number; height: number };

  type GrabBundle = {
    page?: {
      url?: string;
      title?: string;
      frameUrl?: string;
    };
    element?: {
      tag?: string;
      role?: string;
      text?: string;
      selector?: string;
      xpath?: string;
      box?: GrabBox;
      frame?: string;
      shadow?: string;
    };
    component?: {
      label?: string;
      via?: string;
      stack?: string[] | string;
      source?: string;
      props?: unknown;
    };
    styles?: Record<string, string>;
    ancestors?: Array<{ html?: string; indent?: number; grabbed?: boolean }>;
    verbose?: {
      eventListeners?: Array<{
        type?: string;
        useCapture?: boolean;
        passive?: boolean;
        once?: boolean;
      }>;
      computedStyles?: Record<string, string>;
      siblings?: {
        previous?: string;
        next?: string;
      };
    };
  };

  type GrabUiResponse = {
    success?: boolean;
    cancelled?: boolean;
    copied?: boolean;
    screenshotPath?: string;
    warning?: string;
    error?: string;
    output?: string;
    bundle?: GrabBundle;
  };

  type GrabLauncherWindow = Window & {
    __peruzGrabLauncherInstalled?: boolean;
  };

  const grabWindow = window as GrabLauncherWindow;
  if (window.top !== window || grabWindow.__peruzGrabLauncherInstalled) return;
  grabWindow.__peruzGrabLauncherInstalled = true;

  let root: HTMLDivElement | null = null;
  let button: HTMLButtonElement | null = null;
  let status: HTMLDivElement | null = null;
  let state: LauncherState = "idle";
  let resetTimer: number | undefined;

  function setStatus(text: string): void {
    if (status) status.textContent = text;
  }

  function setState(nextState: LauncherState, message: string): void {
    state = nextState;
    if (!root || !button) return;
    root.dataset.state = nextState;
    button.disabled = nextState === "selecting";
    button.setAttribute("aria-busy", nextState === "selecting" ? "true" : "false");
    setStatus(message);
    window.clearTimeout(resetTimer);
    if (nextState === "success" || nextState === "error") {
      resetTimer = window.setTimeout(() => setState("idle", "Ready"), 2400);
    }
  }

  function ensureLauncher(): void {
    if (root) return;

    root = document.createElement("div");
    root.id = "peruz-grab-launcher";
    root.className = "peruz-grab-ui";
    root.dataset.state = "idle";
    root.style.cssText = [
      "position: fixed",
      "right: 18px",
      "bottom: 18px",
      "z-index: 2147483645",
      "display: flex",
      "align-items: center",
      "gap: 8px",
      "font: 12px/16px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      "color: #0f172a",
    ].join(";");

    status = document.createElement("div");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.style.cssText = [
      "min-width: 72px",
      "max-width: 220px",
      "padding: 7px 10px",
      "border: 1px solid rgba(15, 23, 42, 0.12)",
      "border-radius: 8px",
      "background: rgba(255, 255, 255, 0.96)",
      "box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16)",
      "white-space: nowrap",
      "overflow: hidden",
      "text-overflow: ellipsis",
      "opacity: 0",
      "transform: translateX(4px)",
      "transition: opacity 120ms ease, transform 120ms ease",
      "pointer-events: none",
    ].join(";");
    status.textContent = "Ready";

    button = document.createElement("button");
    button.type = "button";
    button.title = "Grab element for agent";
    button.setAttribute("aria-label", "Grab element for agent");
    button.style.cssText = [
      "height: 40px",
      "min-width: 76px",
      "display: inline-flex",
      "align-items: center",
      "justify-content: center",
      "gap: 7px",
      "padding: 0 12px",
      "border: 1px solid rgba(15, 23, 42, 0.14)",
      "border-radius: 8px",
      "background: #0f172a",
      "color: #ffffff",
      "box-shadow: 0 10px 28px rgba(15, 23, 42, 0.28)",
      "cursor: pointer",
      "font: 600 13px/16px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    ].join(";");

    const mark = document.createElement("span");
    mark.setAttribute("aria-hidden", "true");
    mark.style.cssText = [
      "width: 16px",
      "height: 16px",
      "border: 1.5px solid currentColor",
      "border-radius: 50%",
      "box-shadow: inset 0 0 0 3px #0f172a, inset 0 0 0 5px currentColor",
      "display: inline-block",
      "flex: 0 0 auto",
    ].join(";");

    const text = document.createElement("span");
    text.textContent = "Grab";

    button.append(mark, text);
    button.addEventListener("click", () => startGrab());
    button.addEventListener("mouseenter", () => {
      if (state === "idle") setStatus("Grab element");
      if (status) {
        status.style.opacity = "1";
        status.style.transform = "translateX(0)";
      }
    });
    button.addEventListener("mouseleave", () => {
      if (status && state === "idle") {
        status.style.opacity = "0";
        status.style.transform = "translateX(4px)";
      }
    });

    root.append(status, button);
    document.documentElement.append(root);
  }

  function quoteText(text: string | undefined): string {
    if (!text) return '\"\"';
    return `"${String(text).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }

  function formatBox(box: GrabBox | undefined): string {
    if (!box) return "";
    return `${box.width}x${box.height} @ (${box.x}, ${box.y})`;
  }

  function formatEventListeners(bundle: GrabBundle): string[] {
    const eventListeners = bundle.verbose?.eventListeners;
    if (!Array.isArray(eventListeners)) return [];
    if (eventListeners.length === 0) return ["- Event listeners: none"];
    const labels = eventListeners.map((listener) => {
      const type = listener.type || "unknown";
      const flags = [
        listener.useCapture ? "capture" : "",
        listener.passive ? "passive" : "",
        listener.once ? "once" : "",
      ].filter(Boolean);
      return flags.length > 0 ? `${type} (${flags.join(", ")})` : type;
    });
    return [`- Event listeners: ${labels.join(", ")}`];
  }

  function formatPage(bundle: GrabBundle): string[] {
    const page = bundle.page || { url: window.location.href, title: document.title };
    const lines: string[] = [];
    if (page.url) lines.push(`- URL: ${page.url}`);
    if (page.title) lines.push(`- Title: ${page.title}`);
    if (page.frameUrl && page.frameUrl !== page.url) lines.push(`- Frame URL: ${page.frameUrl}`);
    return lines.length > 0 ? ["## Page", ...lines] : [];
  }

  function formatFallbackMarkdown(bundle: GrabBundle): string {
    const element = bundle.element || {};
    const lines = ["# peruz-grab #001", ""];
    const pageLines = formatPage(bundle);
    if (pageLines.length > 0) lines.push(...pageLines, "");
    lines.push("## Element");
    if (element.tag) lines.push(`- Tag: ${element.tag}`);
    if (element.role) lines.push(`- Role: ${element.role}`);
    if (element.text !== undefined) lines.push(`- Text: ${quoteText(element.text)}`);
    if (element.selector) lines.push(`- Selector: ${element.selector}`);
    if (element.xpath) lines.push(`- XPath: ${element.xpath}`);
    if (element.box) lines.push(`- Box: ${formatBox(element.box)}`);
    if (element.frame) lines.push(`- Frame: ${element.frame}`);
    if (element.shadow) lines.push(`- Shadow: ${element.shadow}`);
    lines.push(...formatEventListeners(bundle));

    if (bundle.component) {
      const via = bundle.component.via ? ` (${bundle.component.label || "React"}, via ${bundle.component.via})` : "";
      lines.push("", `## Component${via}`);
      if (bundle.component.stack) {
        lines.push(`- Stack: ${Array.isArray(bundle.component.stack) ? bundle.component.stack.join(" -> ") : bundle.component.stack}`);
      }
      if (bundle.component.source) lines.push(`- Source: ${bundle.component.source}`);
      if (bundle.component.props) {
        lines.push(`- Props: ${typeof bundle.component.props === "string" ? bundle.component.props : JSON.stringify(bundle.component.props)}`);
      }
    }

    const styles = bundle.styles || {};
    const styleLines = [
      ["color", "color"],
      ["background", "background"],
      ["font", "font"],
      ["padding", "padding"],
      ["border-radius", "border-radius"],
    ].flatMap(([field, label]) => styles[field] ? [`- ${label}: ${styles[field]}`] : []);
    const computedStyles = bundle.verbose?.computedStyles || {};
    const computedKeys = Object.keys(computedStyles).sort();
    if (computedKeys.length > 0) {
      styleLines.push("- computed styles:");
      for (const key of computedKeys) styleLines.push(`  - ${key}: ${computedStyles[key]}`);
    }
    if (styleLines.length > 0) lines.push("", "## Styles", ...styleLines);

    const ancestors = bundle.ancestors || [];
    if (ancestors.length > 0) {
      lines.push("", `## Ancestors (${ancestors.length})`);
      ancestors.forEach((ancestor, index) => {
        const indent = "  ".repeat(Math.max(0, ancestor.indent || 0));
        const grabbed = ancestor.grabbed ? "          <-- grabbed" : "";
        lines.push(`${index + 1}. ${indent}${ancestor.html || ""}${grabbed}`);
      });
      if (bundle.verbose?.siblings?.previous) lines.push(`- Previous sibling: ${bundle.verbose.siblings.previous}`);
      if (bundle.verbose?.siblings?.next) lines.push(`- Next sibling: ${bundle.verbose.siblings.next}`);
    }

    return `${lines.join("\n")}\n`;
  }

  function isUnknownUiMessage(response: GrabUiResponse | undefined): boolean {
    return typeof response?.error === "string" && response.error.includes("Unknown message type: PERUZ_GRAB_FROM_UI");
  }

  async function copyFallback(output: string | undefined): Promise<boolean> {
    if (!output) return false;
    try {
      await navigator.clipboard?.writeText(output);
      return true;
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = output;
      textarea.style.cssText = "position: fixed; left: -9999px; top: 0; opacity: 0";
      document.documentElement.append(textarea);
      textarea.focus();
      textarea.select();
      try {
        return document.execCommand("copy");
      } catch {
        return false;
      } finally {
        textarea.remove();
      }
    }
  }

  async function captureWithLegacyWorker(): Promise<GrabUiResponse> {
    const response = await chrome.runtime.sendMessage({
      type: "GRAB_ELEMENT",
      depth: 5,
      mode: "oneshot",
      noScreenshot: true,
    }) as GrabUiResponse;

    if (response?.cancelled) return { cancelled: true };
    if (response?.error || !response?.bundle) return { success: false, error: response?.error || "Grab failed" };

    const output = formatFallbackMarkdown(response.bundle);
    const copied = await copyFallback(output);
    return {
      success: true,
      copied,
      output,
      warning: copied ? "Copied for agent" : "Captured; copy blocked",
    };
  }

  async function captureFromUi(): Promise<GrabUiResponse> {
    const response = await chrome.runtime.sendMessage({
      type: "PERUZ_GRAB_FROM_UI",
      depth: 5,
      format: "markdown",
    }) as GrabUiResponse;

    if (isUnknownUiMessage(response)) return captureWithLegacyWorker();
    return response;
  }

  async function startGrab(): Promise<void> {
    if (state === "selecting") return;
    ensureLauncher();
    setState("selecting", "Select an element");
    if (status) {
      status.style.opacity = "1";
      status.style.transform = "translateX(0)";
    }

    try {
      const response = await captureFromUi();

      if (response?.cancelled) {
        setState("idle", "Cancelled");
        return;
      }
      if (response?.error || !response?.success) {
        setState("error", response?.error || "Grab failed");
        return;
      }

      const fallbackCopied = response.copied ? false : await copyFallback(response.output);
      const copied = response.copied || fallbackCopied;
      const message = response.warning
        ? response.warning
        : copied
          ? response.screenshotPath
            ? "Copied with screenshot"
            : "Copied for agent"
          : "Captured";
      setState("success", message);
    } catch (error) {
      setState("error", error instanceof Error ? error.message : "Grab failed");
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "PERUZ_GRAB_LAUNCHER_START") return false;
    startGrab()
      .then(() => sendResponse({ success: true }))
      .catch((error: unknown) => sendResponse({ error: error instanceof Error ? error.message : String(error) }));
    return true;
  });

  ensureLauncher();
})();
