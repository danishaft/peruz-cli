(() => {
  interface GrabBox {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  interface GrabAncestor {
    html: string;
    indent: number;
    grabbed: boolean;
  }

  interface GrabComponent {
    label: "React";
    via: "__source" | "fiber" | "sourcemap";
    stack: string[];
    source?: string;
    generatedSource?: {
      url: string;
      line: number;
      column?: number;
      sourceMapUrl?: string;
    };
    props?: Record<string, unknown>;
  }

  interface GrabVerbose {
    computedStyles?: Record<string, string>;
    siblings?: {
      previous?: string;
      next?: string;
    };
  }

  interface GrabPage {
    url: string;
    title: string;
  }

  interface GrabBundle {
    page: GrabPage;
    element: {
      tag: string;
      id?: string;
      classes: string[];
      role: string;
      aria: Record<string, string>;
      text: string;
      selector: string;
      xpath: string;
      box: GrabBox;
      frame: string;
      shadow: string;
    };
    component?: GrabComponent;
    styles: Record<string, string>;
    ancestors: GrabAncestor[];
    verbose?: GrabVerbose;
  }

  interface GrabExtractOptions {
    depth?: number;
    verbose?: boolean;
  }

  interface GrabExtractorApi {
    extractGrab(element: Element, options?: GrabExtractOptions): GrabBundle;
    getResolvedRole(element: Element): string;
  }

  interface ReactDebugSource {
    fileName?: string;
    lineNumber?: number;
    columnNumber?: number;
  }

  interface ReactGeneratedSource {
    url?: string;
    fileName?: string;
    line?: number;
    lineNumber?: number;
    column?: number;
    columnNumber?: number;
    sourceMapUrl?: string;
    sourceMapURL?: string;
    mapUrl?: string;
  }

  interface ReactFiber {
    type?: unknown;
    elementType?: unknown;
    memoizedProps?: unknown;
    pendingProps?: unknown;
    return?: ReactFiber | null;
    _debugOwner?: ReactFiber | null;
    _debugSource?: ReactDebugSource | null;
    _debugGeneratedSource?: ReactGeneratedSource | null;
  }

  type GrabWindow = Window & {
    __peruzGrabExtractor?: GrabExtractorApi;
  };

  type ShadowHost = Element & {
    openOrClosedShadowRoot?: ShadowRoot | null;
  };

  const VALID_ARIA_ROLES = new Set([
    "alert", "alertdialog", "application", "article", "banner", "blockquote",
    "button", "caption", "cell", "checkbox", "code", "columnheader", "combobox",
    "complementary", "contentinfo", "definition", "deletion", "dialog", "directory",
    "document", "emphasis", "feed", "figure", "form", "generic", "grid", "gridcell",
    "group", "heading", "img", "insertion", "link", "list", "listbox", "listitem",
    "log", "main", "mark", "marquee", "math", "menu", "menubar", "menuitem",
    "menuitemcheckbox", "menuitemradio", "meter", "navigation", "none", "note",
    "option", "paragraph", "presentation", "progressbar", "radio", "radiogroup",
    "region", "row", "rowgroup", "rowheader", "scrollbar", "search", "searchbox",
    "separator", "slider", "spinbutton", "status", "strong", "subscript",
    "superscript", "switch", "tab", "table", "tablist", "tabpanel", "term",
    "textbox", "time", "timer", "toolbar", "tooltip", "tree", "treegrid", "treeitem",
  ]);

  function isFocusable(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    if (["button", "input", "select", "textarea"].includes(tagName)) {
      return !(element as HTMLButtonElement).disabled;
    }
    if (tagName === "a" && element.hasAttribute("href")) return true;
    if (element.hasAttribute("tabindex")) {
      const tabindex = Number.parseInt(element.getAttribute("tabindex") || "", 10);
      return !Number.isNaN(tabindex) && tabindex >= 0;
    }
    return element.getAttribute("contenteditable") === "true";
  }

  function getExplicitRole(element: Element): string | null {
    const roleAttr = element.getAttribute("role");
    if (!roleAttr) return null;
    const roles = roleAttr.split(/\s+/).filter(Boolean);
    return roles.find((role) => VALID_ARIA_ROLES.has(role)) || null;
  }

  function getImplicitRole(element: Element): string {
    const tag = element.tagName.toLowerCase();
    const type = element.getAttribute("type") || "";

    if (tag === "a") return element.hasAttribute("href") ? "link" : "generic";
    if (tag === "article") return "article";
    if (tag === "aside") return "complementary";
    if (tag === "button") return "button";
    if (tag === "details") return "group";
    if (tag === "dialog") return "dialog";
    if (tag === "footer") return element.closest("article, aside, main, nav, section") ? "generic" : "contentinfo";
    if (tag === "form") return element.hasAttribute("aria-label") || element.hasAttribute("aria-labelledby") ? "form" : "generic";
    if (/^h[1-6]$/.test(tag)) return "heading";
    if (tag === "header") return element.closest("article, aside, main, nav, section") ? "generic" : "banner";
    if (tag === "hr") return "separator";
    if (tag === "img") return element.getAttribute("alt") === "" ? "presentation" : "img";
    if (tag === "li") return "listitem";
    if (tag === "main") return "main";
    if (tag === "nav") return "navigation";
    if (tag === "ol" || tag === "ul" || tag === "menu") return "list";
    if (tag === "option") return "option";
    if (tag === "progress") return "progressbar";
    if (tag === "section") return element.hasAttribute("aria-label") || element.hasAttribute("aria-labelledby") ? "region" : "generic";
    if (tag === "select") return (element as HTMLSelectElement).multiple || (element as HTMLSelectElement).size > 1 ? "listbox" : "combobox";
    if (tag === "table") return "table";
    if (tag === "textarea") return "textbox";

    if (tag === "input") {
      const roles: Record<string, string> = {
        button: "button",
        checkbox: "checkbox",
        email: "textbox",
        file: "button",
        image: "button",
        number: "spinbutton",
        radio: "radio",
        range: "slider",
        reset: "button",
        search: "searchbox",
        submit: "button",
        tel: "textbox",
        text: "textbox",
        url: "textbox",
      };
      return roles[type] || "textbox";
    }

    return "generic";
  }

  function getResolvedRole(element: Element): string {
    const explicit = getExplicitRole(element);
    if (!explicit) return getImplicitRole(element);
    if ((explicit === "none" || explicit === "presentation") && isFocusable(element)) {
      return getImplicitRole(element);
    }
    return explicit;
  }

  function textForElement(element: Element): string {
    const tag = element.tagName.toLowerCase();
    if (tag === "input" || tag === "textarea") {
      const input = element as HTMLInputElement | HTMLTextAreaElement;
      return normalizeText(input.value || input.placeholder || input.getAttribute("aria-label") || "");
    }
    if (tag === "img") {
      return normalizeText(element.getAttribute("alt") || element.getAttribute("aria-label") || "");
    }
    return normalizeText(element.textContent || element.getAttribute("aria-label") || "");
  }

  function normalizeText(value: string): string {
    const text = value.replace(/\s+/g, " ").trim();
    return text.length > 160 ? `${text.slice(0, 157)}...` : text;
  }

  function cssEscape(value: string): string {
    const css = globalThis.CSS as { escape?: (input: string) => string } | undefined;
    if (css?.escape) return css.escape(value);
    return value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`);
  }

  function selectorPart(element: Element): string {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${cssEscape(element.id)}` : "";
    const classes = [...element.classList]
      .filter((className) => className && !className.startsWith("peruz-grab-"))
      .slice(0, 3)
      .map((className) => `.${cssEscape(className)}`)
      .join("");
    let part = `${tag}${id}${classes}`;
    if (id) return part;

    const parent = element.parentElement;
    if (!parent) return part;
    const sameTagSiblings = [...parent.children].filter((child) => child.tagName === element.tagName);
    if (sameTagSiblings.length > 1) {
      part += `:nth-of-type(${sameTagSiblings.indexOf(element) + 1})`;
    }
    return part;
  }

  function rootForElement(element: Element): Document | ShadowRoot {
    const root = element.getRootNode();
    return root instanceof ShadowRoot ? root : document;
  }

  function queryRoot(root: Document | ShadowRoot, selector: string): NodeListOf<Element> {
    return root.querySelectorAll(selector);
  }

  function uniqueCssSelector(element: Element): string {
    const root = rootForElement(element);
    if (element.id) {
      const idSelector = `#${cssEscape(element.id)}`;
      if (queryRoot(root, idSelector).length === 1) return idSelector;
    }

    const parts: string[] = [];
    let current: Element | null = element;
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.documentElement) {
      parts.unshift(selectorPart(current));
      const selector = parts.join(" > ");
      try {
        if (queryRoot(root, selector).length === 1) return selector;
      } catch {}
      current = current.parentElement;
    }
    return parts.join(" > ") || element.tagName.toLowerCase();
  }

  function getShadowRoot(element: Element): ShadowRoot | null {
    const host = element as ShadowHost;
    return host.openOrClosedShadowRoot || element.shadowRoot || null;
  }

  function shadowAccessor(host: Element): "shadowRoot" | "openOrClosedShadowRoot" {
    const root = getShadowRoot(host);
    return root?.mode === "closed" ? "openOrClosedShadowRoot" : "shadowRoot";
  }

  function shadowDescriptor(element: Element): { selector: string; shadow: string } | null {
    const chain: Array<{ host: Element; innerSelector: string; accessor: "shadowRoot" | "openOrClosedShadowRoot" }> = [];
    let current: Element = element;
    let root = current.getRootNode();

    while (root instanceof ShadowRoot) {
      const host = root.host;
      chain.push({
        host,
        innerSelector: uniqueCssSelector(current),
        accessor: shadowAccessor(host),
      });
      current = host;
      root = current.getRootNode();
    }

    if (chain.length === 0) return null;

    const outsideIn = chain.reverse();
    const [first, ...rest] = outsideIn;
    let selector = `document.querySelector(${JSON.stringify(uniqueCssSelector(first.host))})`;
    const shadowPath = [uniqueCssSelector(first.host)];

    for (const segment of [first, ...rest]) {
      selector += `.${segment.accessor}.querySelector(${JSON.stringify(segment.innerSelector)})`;
      shadowPath.push("#shadow-root", segment.innerSelector);
    }

    return {
      selector,
      shadow: `pierced: ${shadowPath.join(" > ")}`,
    };
  }

  function quoteXPath(value: string): string {
    if (!value.includes("'")) return `'${value}'`;
    if (!value.includes('"')) return `"${value}"`;
    return `concat('${value.replace(/'/g, "', \"'\", '")}')`;
  }

  function xpathForElement(element: Element): string {
    if (element.id) return `//*[@id=${quoteXPath(element.id)}]`;

    const segments: string[] = [];
    let current: Element | null = element;
    while (current && current.nodeType === Node.ELEMENT_NODE) {
      const tag = current.tagName.toLowerCase();
      const parent: Element | null = current.parentElement;
      if (!parent) {
        segments.unshift(tag);
        break;
      }
      const currentTagName = current.tagName;
      const sameTagSiblings = [...parent.children].filter((child) => child.tagName === currentTagName);
      const index = sameTagSiblings.length > 1 ? `[${sameTagSiblings.indexOf(current) + 1}]` : "";
      segments.unshift(`${tag}${index}`);
      current = parent;
    }
    return `/${segments.join("/")}`;
  }

  function getAriaAttributes(element: Element): Record<string, string> {
    const aria: Record<string, string> = {};
    for (const attr of [...element.attributes]) {
      if (attr.name.startsWith("aria-") && attr.value) aria[attr.name] = attr.value;
    }
    return aria;
  }

  function boxForElement(element: Element): GrabBox {
    const rect = element.getBoundingClientRect();
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  }

  function styleSubset(element: Element): Record<string, string> {
    const computed = window.getComputedStyle(element);
    const fontFamily = computed.fontFamily.split(",")[0]?.replaceAll('"', "").replaceAll("'", "").trim() || "sans-serif";
    return {
      color: computed.color,
      background: computed.backgroundColor,
      font: `${computed.fontSize}/${computed.lineHeight} ${fontFamily} ${computed.fontWeight}`,
      padding: computed.padding,
      "border-radius": computed.borderRadius,
      display: computed.display,
      position: computed.position,
    };
  }

  function computedStyleDump(element: Element): Record<string, string> {
    const computed = window.getComputedStyle(element);
    const styles: Record<string, string> = {};
    for (let i = 0; i < computed.length; i++) {
      const property = computed.item(i);
      if (property) styles[property] = computed.getPropertyValue(property);
    }
    return styles;
  }

  function htmlPreview(element: Element): string {
    const tag = element.tagName.toLowerCase();
    const attrs: string[] = [];
    if (element.id) attrs.push(`id="${element.id}"`);
    if (element.classList.length > 0) attrs.push(`class="${[...element.classList].slice(0, 4).join(" ")}"`);
    const role = element.getAttribute("role");
    if (role) attrs.push(`role="${role}"`);
    const ariaLabel = element.getAttribute("aria-label");
    if (ariaLabel) attrs.push(`aria-label="${ariaLabel}"`);
    return `<${tag}${attrs.length ? ` ${attrs.join(" ")}` : ""}>`;
  }

  function composedParent(element: Element): Element | null {
    if (element.parentElement) return element.parentElement;
    const root = element.getRootNode();
    return root instanceof ShadowRoot ? root.host : null;
  }

  function ancestorChain(element: Element, depth: number): GrabAncestor[] {
    const chain: Element[] = [];
    let current: Element | null = element;
    while (current && current !== document.documentElement) {
      chain.unshift(current);
      current = composedParent(current);
    }

    const limited = chain.slice(Math.max(0, chain.length - depth));
    return limited.map((item, index) => ({
      html: htmlPreview(item),
      indent: index,
      grabbed: item === element,
    }));
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  function findReactFiberOnElement(element: Element): ReactFiber | null {
    const key = Object.getOwnPropertyNames(element).find((name) => name.startsWith("__reactFiber$") || name.startsWith("__reactInternalInstance$"));
    if (!key) return null;
    const candidate = (element as unknown as Record<string, unknown>)[key];
    return isRecord(candidate) ? (candidate as ReactFiber) : null;
  }

  function findReactFiber(element: Element): ReactFiber | null {
    let current: Element | null = element;
    while (current) {
      const fiber = findReactFiberOnElement(current);
      if (fiber) return fiber;
      current = composedParent(current);
    }
    return null;
  }

  function componentNameForFiber(fiber: ReactFiber): string | null {
    const type = fiber.type ?? fiber.elementType;
    if (typeof type === "string") return null;
    if (typeof type === "function") {
      const named = type as { displayName?: string; name?: string };
      return named.displayName || named.name || "Anonymous";
    }
    if (!isRecord(type)) return null;

    const displayName = type.displayName;
    if (typeof displayName === "string" && displayName) return displayName;

    const name = type.name;
    if (typeof name === "string" && name) return name;

    const render = type.render;
    if (typeof render === "function") {
      const named = render as { displayName?: string; name?: string };
      return named.displayName || named.name || "Anonymous";
    }

    const innerType = type.type;
    if (typeof innerType === "function") {
      const named = innerType as { displayName?: string; name?: string };
      return named.displayName || named.name || "Anonymous";
    }

    return "Anonymous";
  }

  function sourceForFiber(fiber: ReactFiber): string | undefined {
    const source = fiber._debugSource;
    if (!source?.fileName || typeof source.lineNumber !== "number") return undefined;
    return `${source.fileName}:${source.lineNumber}`;
  }

  function generatedSourceForFiber(fiber: ReactFiber): GrabComponent["generatedSource"] | undefined {
    const source = fiber._debugGeneratedSource;
    if (!source) return undefined;
    const url = source.url || source.fileName;
    const line = source.line ?? source.lineNumber;
    if (!url || typeof line !== "number") return undefined;
    const column = source.column ?? source.columnNumber;
    return {
      url,
      line,
      ...(typeof column === "number" ? { column } : {}),
      ...(source.sourceMapUrl || source.sourceMapURL || source.mapUrl
        ? { sourceMapUrl: source.sourceMapUrl || source.sourceMapURL || source.mapUrl }
        : {}),
    };
  }

  function isNodeLike(value: unknown): boolean {
    return typeof Node !== "undefined" && value instanceof Node;
  }

  function sanitizePropValue(value: unknown): unknown {
    if (value === null) return null;
    const valueType = typeof value;
    if (valueType === "string" || valueType === "number" || valueType === "boolean") return value;
    if (valueType === "function" || valueType === "symbol" || valueType === "undefined" || valueType === "bigint") return undefined;
    if (isNodeLike(value)) return undefined;
    if (Array.isArray(value)) {
      const sanitized = value.map((item) => sanitizePropValue(item)).filter((item) => item !== undefined);
      return sanitized.length > 0 ? sanitized : undefined;
    }
    if (!isRecord(value)) return undefined;
    if ("current" in value) return undefined;

    const sanitized: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value).slice(0, 12)) {
      const nestedType = typeof nestedValue;
      if (nestedValue === null || nestedType === "string" || nestedType === "number" || nestedType === "boolean") {
        sanitized[key] = nestedValue;
      }
    }
    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  }

  function sanitizeProps(props: unknown): Record<string, unknown> | undefined {
    if (!isRecord(props)) return undefined;
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (key === "children" || key === "ref") continue;
      const sanitizedValue = sanitizePropValue(value);
      if (sanitizedValue !== undefined) sanitized[key] = sanitizedValue;
    }
    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  }

  function componentForElement(element: Element): GrabComponent | undefined {
    const fiber = findReactFiber(element);
    if (!fiber) return undefined;

    const stack: string[] = [];
    let source: string | undefined;
    let generatedSource: GrabComponent["generatedSource"] | undefined;
    let props: Record<string, unknown> | undefined;
    let current: ReactFiber | null | undefined = fiber;
    let guard = 0;

    while (current && guard < 100) {
      source ||= sourceForFiber(current);
      if (!source) generatedSource ||= generatedSourceForFiber(current);
      const componentName = componentNameForFiber(current);
      if (componentName) {
        stack.push(componentName);
        props ||= sanitizeProps(current.memoizedProps ?? current.pendingProps);
      }
      current = current.return ?? current._debugOwner ?? null;
      guard++;
    }

    if (!source && stack.length === 0) return undefined;

    return {
      label: "React",
      via: source ? "__source" : "fiber",
      stack: stack.length > 0 ? stack : ["Anonymous"],
      ...(source ? { source } : {}),
      ...(!source && generatedSource ? { generatedSource } : {}),
      ...(props ? { props } : {}),
    };
  }

  function verboseForElement(element: Element): GrabVerbose {
    const previous = element.previousElementSibling ? htmlPreview(element.previousElementSibling) : undefined;
    const next = element.nextElementSibling ? htmlPreview(element.nextElementSibling) : undefined;
    return {
      computedStyles: computedStyleDump(element),
      siblings: {
        ...(previous ? { previous } : {}),
        ...(next ? { next } : {}),
      },
    };
  }

  function extractGrab(element: Element, options: GrabExtractOptions = {}): GrabBundle {
    const depth = Math.max(1, Math.min(20, options.depth ?? 5));
    const shadow = shadowDescriptor(element);
    const bundle: GrabBundle = {
      page: {
        url: window.location.href,
        title: document.title,
      },
      element: {
        tag: element.tagName.toLowerCase(),
        id: element.id || undefined,
        classes: [...element.classList],
        role: getResolvedRole(element),
        aria: getAriaAttributes(element),
        text: textForElement(element),
        selector: shadow?.selector || uniqueCssSelector(element),
        xpath: xpathForElement(element),
        box: boxForElement(element),
        frame: window.top === window ? "top" : window.location.href,
        shadow: shadow?.shadow || "none",
      },
      styles: styleSubset(element),
      ancestors: ancestorChain(element, depth),
    };

    const component = componentForElement(element);
    if (component) bundle.component = component;
    if (options.verbose) bundle.verbose = verboseForElement(element);

    return bundle;
  }

  (window as GrabWindow).__peruzGrabExtractor = {
    extractGrab,
    getResolvedRole,
  };
})();
