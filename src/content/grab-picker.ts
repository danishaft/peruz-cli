(() => {
  interface GrabBundle {
    element: {
      tag: string;
      role: string;
      box: { x: number; y: number; width: number; height: number };
    };
  }

  interface GrabExtractorApi {
    extractGrab(element: Element, options?: { depth?: number; verbose?: boolean }): GrabBundle;
    getResolvedRole(element: Element): string;
  }

  type PickerResponse =
    | { status: "committed"; bundle: GrabBundle }
    | { status: "cancelled" }
    | { status: "error"; error: string };
  type PickerMode = "oneshot" | "watch";

  type GrabWindow = Window & {
    __peruzGrabExtractor?: GrabExtractorApi;
    __peruzGrabPickerInstalled?: boolean;
  };

  type ShadowHost = Element & {
    openOrClosedShadowRoot?: ShadowRoot | null;
  };

  const grabWindow = window as GrabWindow;
  if (grabWindow.__peruzGrabPickerInstalled) return;
  grabWindow.__peruzGrabPickerInstalled = true;

  let outline: HTMLDivElement | null = null;
  let label: HTMLDivElement | null = null;
  let currentElement: Element | null = null;
  let lockedElement: Element | null = null;
  let activeResolve: ((response: PickerResponse) => void) | null = null;
  let activeDepth = 5;
  let activeMode: PickerMode = "oneshot";
  let activeVerbose = false;

  function isPeruzUiElement(element: Element | null): boolean {
    return element?.closest?.(".peruz-grab-ui, #peruz-grab-launcher") !== null;
  }

  function ensureOverlay(): void {
    if (outline && label) return;

    outline = document.createElement("div");
    outline.className = "peruz-grab-outline";
    outline.style.cssText = [
      "position: fixed",
      "z-index: 2147483646",
      "pointer-events: none",
      "border: 1.5px solid #2dd4bf",
      "box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.45)",
      "border-radius: 3px",
      "display: none",
      "box-sizing: border-box",
    ].join(";");

    label = document.createElement("div");
    label.className = "peruz-grab-label";
    label.style.cssText = [
      "position: fixed",
      "z-index: 2147483647",
      "pointer-events: none",
      "display: none",
      "background: #0f172a",
      "color: #ffffff",
      "font: 12px/16px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
      "padding: 2px 6px",
      "border-radius: 4px",
      "box-shadow: 0 4px 12px rgba(15, 23, 42, 0.25)",
      "white-space: nowrap",
    ].join(";");

    document.documentElement.append(outline, label);
  }

  function targetFromEvent(event: MouseEvent): Element | null {
    const deepTarget = deepElementFromPoint(event.clientX, event.clientY);
    if (deepTarget) return deepTarget;

    const path = event.composedPath();
    for (const target of path) {
      if (target instanceof Element && target !== outline && target !== label) {
        if (target.classList.contains("peruz-grab-outline") || target.classList.contains("peruz-grab-label")) continue;
        if (isPeruzUiElement(target)) continue;
        return target;
      }
    }
    return null;
  }

  function getShadowRoot(element: Element): ShadowRoot | null {
    const host = element as ShadowHost;
    return host.openOrClosedShadowRoot || element.shadowRoot || null;
  }

  function deepElementFromPoint(x: number, y: number): Element | null {
    let target = document.elementFromPoint(x, y);
    let guard = 0;

    while (target && guard < 20) {
      if (target === outline || target === label) return null;
      if (target.classList.contains("peruz-grab-outline") || target.classList.contains("peruz-grab-label")) return null;
      if (isPeruzUiElement(target)) return null;

      const shadowRoot = getShadowRoot(target);
      const inner = shadowRoot?.elementFromPoint(x, y);
      if (!inner || inner === target) return target;
      target = inner;
      guard++;
    }

    return target;
  }

  function labelText(element: Element): string {
    const tag = element.tagName.toLowerCase();
    const role = grabWindow.__peruzGrabExtractor?.getResolvedRole(element) || "generic";
    return role === "generic" ? tag : `${tag} ${role}`;
  }

  function positionOverlay(element: Element | null): void {
    ensureOverlay();
    if (!outline || !label) return;
    if (!element) {
      outline.style.display = "none";
      label.style.display = "none";
      return;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      outline.style.display = "none";
      label.style.display = "none";
      return;
    }

    outline.style.display = "block";
    outline.style.left = `${Math.round(rect.left)}px`;
    outline.style.top = `${Math.round(rect.top)}px`;
    outline.style.width = `${Math.round(rect.width)}px`;
    outline.style.height = `${Math.round(rect.height)}px`;

    label.textContent = labelText(element);
    label.style.display = "block";
    const labelTop = rect.top < 22 ? rect.top + 4 : rect.top - 22;
    const labelLeft = Math.min(Math.max(4, rect.left), window.innerWidth - label.offsetWidth - 4);
    label.style.left = `${Math.round(labelLeft)}px`;
    label.style.top = `${Math.round(labelTop)}px`;
  }

  function updateElement(element: Element | null): void {
    currentElement = element;
    if (!lockedElement) positionOverlay(element);
  }

  function lockCurrent(): void {
    if (!currentElement) return;
    lockedElement = currentElement;
    positionOverlay(lockedElement);
  }

  function unlockCurrent(): void {
    lockedElement = null;
    positionOverlay(currentElement);
  }

  function cleanup(): void {
    window.removeEventListener("mousemove", onMouseMove, true);
    window.removeEventListener("mousedown", onMouseDown, true);
    window.removeEventListener("click", onClick, true);
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("keyup", onKeyUp, true);
    window.removeEventListener("scroll", onViewportChange, true);
    window.removeEventListener("resize", onViewportChange, true);
    outline?.remove();
    label?.remove();
    outline = null;
    label = null;
    currentElement = null;
    lockedElement = null;
  }

  function stopPicker(): void {
    if (activeResolve) {
      finish({ status: "cancelled" });
      return;
    }
    cleanup();
  }

  function finish(response: PickerResponse): void {
    const resolve = activeResolve;
    activeResolve = null;
    cleanup();
    resolve?.(response);
  }

  function onMouseMove(event: MouseEvent): void {
    if (lockedElement) return;
    const target = targetFromEvent(event);
    updateElement(target);
    if (event.altKey) lockCurrent();
  }

  function onMouseDown(event: MouseEvent): void {
    if (!event.altKey) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!lockedElement) lockCurrent();
  }

  function onClick(event: MouseEvent): void {
    if (activeMode === "watch" && !event.altKey && !lockedElement) return;
    event.preventDefault();
    event.stopImmediatePropagation();

    const target = lockedElement || currentElement || targetFromEvent(event);
    if (!target) {
      finish({ status: "error", error: "No element under cursor" });
      return;
    }

    const extractor = grabWindow.__peruzGrabExtractor;
    if (!extractor) {
      finish({ status: "error", error: "Grab extractor not loaded" });
      return;
    }

    try {
      const bundle = extractor.extractGrab(target, { depth: activeDepth, verbose: activeVerbose });
      finish({ status: "committed", bundle });
    } catch (error) {
      finish({ status: "error", error: error instanceof Error ? error.message : String(error) });
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      finish({ status: "cancelled" });
      return;
    }
    if (event.key === "Alt") lockCurrent();
  }

  function onKeyUp(event: KeyboardEvent): void {
    if (event.key === "Alt") unlockCurrent();
  }

  function onViewportChange(): void {
    positionOverlay(lockedElement || currentElement);
  }

  function startPicker(options: { depth?: number; mode?: PickerMode; verbose?: boolean } = {}): Promise<PickerResponse> {
    if (activeResolve) finish({ status: "cancelled" });

    activeDepth = Math.max(1, Math.min(20, options.depth ?? 5));
    activeMode = options.mode || "oneshot";
    activeVerbose = options.verbose === true;
    ensureOverlay();

    window.addEventListener("mousemove", onMouseMove, true);
    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("click", onClick, true);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("keyup", onKeyUp, true);
    window.addEventListener("scroll", onViewportChange, true);
    window.addEventListener("resize", onViewportChange, true);

    return new Promise((resolve) => {
      activeResolve = resolve;
    });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "STOP_GRAB_PICKER") {
      stopPicker();
      sendResponse({ status: "cancelled" });
      return false;
    }
    if (message?.type !== "START_GRAB_PICKER") return false;
    startPicker({ depth: message.depth, mode: message.mode, verbose: message.verbose })
      .then(sendResponse)
      .catch((error: unknown) => sendResponse({ status: "error", error: error instanceof Error ? error.message : String(error) }));
    return true;
  });
})();
