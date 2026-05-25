const PI_COLOR = "59, 178, 191";
const DEFAULT_HEARTBEAT_INTERVAL = 10000;

let glowBorder: HTMLDivElement | null = null;
let stopButton: HTMLDivElement | null = null;
let staticIndicator: HTMLDivElement | null = null;
let isActive = false;
let isStaticActive = false;
let wasActiveBeforeToolUse = false;
let wasStaticActiveBeforeToolUse = false;
let heartbeatIntervalId: number | null = null;
let heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL;

chrome.storage.local.get("heartbeatInterval").then(({ heartbeatInterval }) => {
  if (heartbeatInterval && typeof heartbeatInterval === "number") {
    heartbeatIntervalMs = heartbeatInterval * 1000;
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.heartbeatInterval) {
    const newValue = changes.heartbeatInterval.newValue;
    if (newValue && typeof newValue === "number") {
      heartbeatIntervalMs = newValue * 1000;
      if (isStaticActive && heartbeatIntervalId) {
        clearInterval(heartbeatIntervalId);
        startHeartbeat();
      }
    }
  }
});

function startHeartbeat() {
  heartbeatIntervalId = window.setInterval(async () => {
    try {
      const response = await chrome.runtime.sendMessage({ type: "STATIC_INDICATOR_HEARTBEAT" });
      if (!response?.success) hideStaticIndicator();
    } catch {
      hideStaticIndicator();
    }
  }, heartbeatIntervalMs);
}

function injectStyles() {
  if (document.getElementById("pi-agent-styles")) return;

  const style = document.createElement("style");
  style.id = "pi-agent-styles";
  style.textContent = `
    @keyframes pi-pulse {
      0% {
        box-shadow: 
          inset 0 0 10px rgba(${PI_COLOR}, 0.5),
          inset 0 0 20px rgba(${PI_COLOR}, 0.3),
          inset 0 0 30px rgba(${PI_COLOR}, 0.1);
      }
      50% {
        box-shadow: 
          inset 0 0 15px rgba(${PI_COLOR}, 0.7),
          inset 0 0 25px rgba(${PI_COLOR}, 0.5),
          inset 0 0 35px rgba(${PI_COLOR}, 0.2);
      }
      100% {
        box-shadow: 
          inset 0 0 10px rgba(${PI_COLOR}, 0.5),
          inset 0 0 20px rgba(${PI_COLOR}, 0.3),
          inset 0 0 30px rgba(${PI_COLOR}, 0.1);
      }
    }
  `;
  document.head.appendChild(style);
}

function createGlowBorder(): HTMLDivElement {
  const el = document.createElement("div");
  el.id = "pi-agent-glow";
  el.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    z-index: 2147483646;
    opacity: 0;
    transition: opacity 0.3s ease-in-out;
    animation: pi-pulse 2s ease-in-out infinite;
    box-shadow: 
      inset 0 0 10px rgba(${PI_COLOR}, 0.5),
      inset 0 0 20px rgba(${PI_COLOR}, 0.3),
      inset 0 0 30px rgba(${PI_COLOR}, 0.1);
  `;
  return el;
}

function createStopButton(): HTMLDivElement {
  const container = document.createElement("div");
  container.id = "pi-agent-stop-container";
  container.style.cssText = `
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: none;
    z-index: 2147483647;
  `;

  const button = document.createElement("button");
  button.id = "pi-agent-stop-button";
  button.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" style="margin-right: 12px; vertical-align: middle;">
      <path d="M128,20A108,108,0,1,0,236,128,108.12,108.12,0,0,0,128,20Zm0,192a84,84,0,1,1,84-84A84.09,84.09,0,0,1,128,212Zm40-112v56a12,12,0,0,1-12,12H100a12,12,0,0,1-12-12V100a12,12,0,0,1,12-12h56A12,12,0,0,1,168,100Z"></path>
    </svg>
    <span style="vertical-align: middle;">Stop Peruz</span>
  `;
  button.style.cssText = `
    position: relative;
    transform: translateY(100px);
    padding: 12px 16px;
    background: #FAF9F5;
    color: #141413;
    border: 0.5px solid rgba(31, 30, 29, 0.4);
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: 
      0 40px 80px rgba(${PI_COLOR}, 0.24),
      0 4px 14px rgba(${PI_COLOR}, 0.24);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0;
    user-select: none;
    pointer-events: auto;
    white-space: nowrap;
    margin: 0 auto;
  `;

  button.addEventListener("mouseenter", () => {
    if (isActive) button.style.background = "#F5F4F0";
  });

  button.addEventListener("mouseleave", () => {
    if (isActive) button.style.background = "#FAF9F5";
  });

  button.addEventListener("click", async () => {
    await chrome.runtime.sendMessage({ type: "STOP_AGENT", fromTabId: "CURRENT_TAB" });
  });

  container.appendChild(button);
  return container;
}

function createStaticIndicator(): HTMLDivElement {
  const container = document.createElement("div");
  container.id = "pi-agent-static-indicator";
  container.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="width: 16px; height: 16px; margin-right: 8px; flex-shrink: 0;">
      <circle cx="8" cy="8" r="7" fill="rgb(${PI_COLOR})"/>
      <text x="8" y="11" font-size="9" fill="white" text-anchor="middle" font-weight="bold">π</text>
    </svg>
    <span style="color: #141413; font-size: 14px;">Peruz is active in this tab group</span>
    <div style="width: 0.5px; height: 32px; background: rgba(31, 30, 29, 0.15); margin: 0 8px;"></div>
    <button id="pi-static-chat-button" style="display: inline-flex; align-items: center; justify-content: center; padding: 6px; background: transparent; border: none; cursor: pointer; width: 32px; height: 32px; border-radius: 8px; transition: background 0.2s;">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="#141413">
        <path d="M10 2.5C14.1421 2.5 17.5 5.85786 17.5 10C17.5 14.1421 14.1421 17.5 10 17.5H3C2.79779 17.5 2.61549 17.3782 2.53809 17.1914C2.4607 17.0046 2.50349 16.7895 2.64648 16.6465L4.35547 14.9365C3.20124 13.6175 2.5 11.8906 2.5 10C2.5 5.85786 5.85786 2.5 10 2.5Z"/>
      </svg>
    </button>
    <button id="pi-static-close-button" style="display: inline-flex; align-items: center; justify-content: center; padding: 6px; background: transparent; border: none; cursor: pointer; width: 32px; height: 32px; margin-left: 4px; border-radius: 8px; transition: background 0.2s;">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M15.1464 4.14642C15.3417 3.95121 15.6582 3.95118 15.8534 4.14642C16.0486 4.34168 16.0486 4.65822 15.8534 4.85346L10.7069 9.99997L15.8534 15.1465C16.0486 15.3417 16.0486 15.6583 15.8534 15.8535C15.6826 16.0244 15.4186 16.0461 15.2245 15.918L15.1464 15.8535L9.99989 10.707L4.85338 15.8535C4.65813 16.0486 4.34155 16.0486 4.14634 15.8535C3.95115 15.6583 3.95129 15.3418 4.14634 15.1465L9.29286 9.99997L4.14634 4.85346C3.95129 4.65818 3.95115 4.34162 4.14634 4.14642C4.34154 3.95128 4.65812 3.95138 4.85338 4.14642L9.99989 9.29294L15.1464 4.14642Z" fill="#141413"/>
      </svg>
    </button>
  `;
  container.style.cssText = `
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    display: inline-flex;
    align-items: center;
    padding: 6px 6px 6px 16px;
    background: #FAF9F5;
    border: 0.5px solid rgba(31, 30, 29, 0.30);
    border-radius: 14px;
    box-shadow: 0 40px 80px 0 rgba(0, 0, 0, 0.15);
    z-index: 2147483647;
    pointer-events: none;
    white-space: nowrap;
    user-select: none;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  `;

  const chatButton = container.querySelector("#pi-static-chat-button") as HTMLButtonElement;
  const closeButton = container.querySelector("#pi-static-close-button") as HTMLButtonElement;

  if (chatButton) {
    chatButton.style.pointerEvents = "auto";
    chatButton.addEventListener("mouseenter", () => chatButton.style.background = "#F0EEE6");
    chatButton.addEventListener("mouseleave", () => chatButton.style.background = "transparent");
    chatButton.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({ type: "OPEN_SIDEPANEL" });
    });
  }

  if (closeButton) {
    closeButton.style.pointerEvents = "auto";
    closeButton.addEventListener("mouseenter", () => closeButton.style.background = "#F0EEE6");
    closeButton.addEventListener("mouseleave", () => closeButton.style.background = "transparent");
    closeButton.addEventListener("click", async () => {
      await chrome.runtime.sendMessage({ type: "DISMISS_STATIC_INDICATOR" });
      hideStaticIndicator();
    });
  }

  return container;
}

function showIndicators() {
  if (isActive) return;
  isActive = true;

  injectStyles();

  if (!glowBorder) {
    glowBorder = createGlowBorder();
    document.body.appendChild(glowBorder);
  } else {
    glowBorder.style.display = "";
  }

  if (!stopButton) {
    stopButton = createStopButton();
    document.body.appendChild(stopButton);
  } else {
    stopButton.style.display = "";
  }

  requestAnimationFrame(() => {
    if (glowBorder) glowBorder.style.opacity = "1";
    if (stopButton) {
      const btn = stopButton.querySelector("#pi-agent-stop-button") as HTMLElement;
      if (btn) {
        btn.style.transform = "translateY(0)";
        btn.style.opacity = "1";
      }
    }
  });
}

function hideIndicators() {
  if (!isActive) return;
  isActive = false;

  if (glowBorder) glowBorder.style.opacity = "0";
  if (stopButton) {
    const btn = stopButton.querySelector("#pi-agent-stop-button") as HTMLElement;
    if (btn) {
      btn.style.transform = "translateY(100px)";
      btn.style.opacity = "0";
    }
  }

  setTimeout(() => {
    if (!isActive) {
      if (glowBorder?.parentNode) {
        glowBorder.parentNode.removeChild(glowBorder);
        glowBorder = null;
      }
      if (stopButton?.parentNode) {
        stopButton.parentNode.removeChild(stopButton);
        stopButton = null;
      }
    }
  }, 300);
}

function showStaticIndicator() {
  if (isStaticActive) return;
  isStaticActive = true;

  if (!staticIndicator) {
    staticIndicator = createStaticIndicator();
    document.body.appendChild(staticIndicator);
  } else {
    staticIndicator.style.display = "";
  }

  if (heartbeatIntervalId) clearInterval(heartbeatIntervalId);
  startHeartbeat();
}

function hideStaticIndicator() {
  if (!isStaticActive) return;
  isStaticActive = false;

  if (heartbeatIntervalId) {
    clearInterval(heartbeatIntervalId);
    heartbeatIntervalId = null;
  }

  if (staticIndicator?.parentNode) {
    staticIndicator.parentNode.removeChild(staticIndicator);
    staticIndicator = null;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "SHOW_AGENT_INDICATORS":
      showIndicators();
      sendResponse({ success: true });
      return false;
    case "HIDE_AGENT_INDICATORS":
      hideIndicators();
      sendResponse({ success: true });
      return false;
    case "HIDE_FOR_TOOL_USE":
      wasActiveBeforeToolUse = isActive;
      wasStaticActiveBeforeToolUse = isStaticActive;
      if (glowBorder) glowBorder.style.display = "none";
      if (stopButton) stopButton.style.display = "none";
      if (staticIndicator && isStaticActive) staticIndicator.style.display = "none";
      sendResponse({ success: true });
      return false;
    case "SHOW_AFTER_TOOL_USE":
      if (wasActiveBeforeToolUse) {
        if (glowBorder) glowBorder.style.display = "";
        if (stopButton) stopButton.style.display = "";
      }
      if (wasStaticActiveBeforeToolUse && staticIndicator) {
        staticIndicator.style.display = "";
      }
      wasActiveBeforeToolUse = false;
      wasStaticActiveBeforeToolUse = false;
      sendResponse({ success: true });
      return false;
    case "SHOW_STATIC_INDICATOR":
      showStaticIndicator();
      sendResponse({ success: true });
      return false;
    case "HIDE_STATIC_INDICATOR":
      hideStaticIndicator();
      sendResponse({ success: true });
      return false;
    default:
      return false;
  }
});

window.addEventListener("beforeunload", () => {
  hideIndicators();
  hideStaticIndicator();
});

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
