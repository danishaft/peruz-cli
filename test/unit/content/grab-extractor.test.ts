// @vitest-environment jsdom

import "../../../src/content/grab-extractor";

interface GrabExtractorApi {
  extractGrab(
    element: Element,
    options?: { depth?: number; verbose?: boolean },
  ): {
    page: {
      url: string;
      title: string;
    };
    element: {
      tag: string;
      id?: string;
      classes: string[];
      role: string;
      text: string;
      selector: string;
      xpath: string;
      box: { x: number; y: number; width: number; height: number };
      frame: string;
      shadow: string;
    };
    component?: {
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
    };
    styles: Record<string, string>;
    ancestors: Array<{ html: string; indent: number; grabbed: boolean }>;
    verbose?: {
      computedStyles?: Record<string, string>;
      siblings?: {
        previous?: string;
        next?: string;
      };
    };
  };
  getResolvedRole(element: Element): string;
}

interface TestFiber {
  type?: unknown;
  memoizedProps?: unknown;
  pendingProps?: unknown;
  return?: TestFiber | null;
  _debugSource?: {
    fileName?: string;
    lineNumber?: number;
  } | null;
  _debugGeneratedSource?: {
    url?: string;
    fileName?: string;
    line?: number;
    lineNumber?: number;
    column?: number;
    columnNumber?: number;
    sourceMapUrl?: string;
  } | null;
}

function extractor(): GrabExtractorApi {
  return (window as unknown as { __peruzGrabExtractor: GrabExtractorApi }).__peruzGrabExtractor;
}

function attachReactFiber(element: Element, fiber: TestFiber): void {
  Object.defineProperty(element, "__reactFiber$peruztest", {
    value: fiber,
    enumerable: true,
    configurable: true,
  });
}

describe("grab extractor", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <nav class="header">
        <div class="actions">
          <button
            id="sign-in"
            class="primary rounded"
            aria-label="Sign in to dashboard"
            style="color: rgb(255, 255, 255); background-color: rgb(37, 99, 235); padding: 8px 16px; border-radius: 6px; font-size: 14px; line-height: 20px; font-weight: 500;"
          >
            Sign In
          </button>
        </div>
      </nav>
    `;
  });

  it("extracts DOM-only element context from fixture HTML", () => {
    const button = document.querySelector("#sign-in");
    expect(button).toBeTruthy();
    Object.defineProperty(button, "getBoundingClientRect", {
      value: () => ({
        x: 1142,
        y: 64,
        width: 248,
        height: 40,
        top: 64,
        left: 1142,
        right: 1390,
        bottom: 104,
      }),
    });

    const bundle = extractor().extractGrab(button as Element, { depth: 4 });

    expect(bundle.page.url).toBe(window.location.href);
    expect(bundle.page.title).toBe(document.title);
    expect(bundle.element.tag).toBe("button");
    expect(bundle.element.id).toBe("sign-in");
    expect(bundle.element.classes).toEqual(["primary", "rounded"]);
    expect(bundle.element.role).toBe("button");
    expect(bundle.element.text).toBe("Sign In");
    expect(bundle.element.selector).toBe("#sign-in");
    expect(bundle.element.xpath).toBe("//*[@id='sign-in']");
    expect(bundle.element.box).toEqual({ x: 1142, y: 64, width: 248, height: 40 });
    expect(bundle.element.frame).toBe("top");
    expect(bundle.element.shadow).toBe("none");
    expect(bundle.styles.color).toBe("rgb(255, 255, 255)");
    expect(bundle.styles.background).toBe("rgb(37, 99, 235)");
    expect(bundle.styles.padding).toContain("8px");
    expect(bundle.ancestors.at(-1)?.grabbed).toBe(true);
    expect(bundle.ancestors.at(-1)?.html).toContain("<button");
    expect(bundle.component).toBeUndefined();
  });

  it("extracts React __source, component stack, and sanitized props from fiber stubs", () => {
    function HeaderActions() {
      return null;
    }
    function SignInButton() {
      return null;
    }

    const button = document.querySelector("#sign-in") as Element;
    const headerFiber: TestFiber = {
      type: HeaderActions,
      memoizedProps: { layout: "desktop" },
      return: null,
    };
    const signInFiber: TestFiber = {
      type: SignInButton,
      memoizedProps: {
        variant: "primary",
        size: "md",
        disabled: false,
        onClick: () => undefined,
        children: "Sign In",
        ref: { current: button },
      },
      _debugSource: {
        fileName: "src/components/auth/SignInButton.tsx",
        lineNumber: 14,
      },
      return: headerFiber,
    };
    const buttonFiber: TestFiber = {
      type: "button",
      memoizedProps: {},
      return: signInFiber,
    };
    attachReactFiber(button, buttonFiber);

    const bundle = extractor().extractGrab(button);

    expect(bundle.component).toEqual({
      label: "React",
      via: "__source",
      stack: ["SignInButton", "HeaderActions"],
      source: "src/components/auth/SignInButton.tsx:14",
      props: {
        variant: "primary",
        size: "md",
        disabled: false,
      },
    });
  });

  it("falls back to React fiber stack when __source is unavailable", () => {
    function HeaderActions() {
      return null;
    }
    function SignInButton() {
      return null;
    }

    const button = document.querySelector("#sign-in") as Element;
    const headerFiber: TestFiber = {
      type: HeaderActions,
      memoizedProps: {},
      return: null,
    };
    const signInFiber: TestFiber = {
      type: SignInButton,
      memoizedProps: { variant: "secondary" },
      return: headerFiber,
    };
    attachReactFiber(button, {
      type: "button",
      return: signInFiber,
    });

    const bundle = extractor().extractGrab(button);

    expect(bundle.component?.via).toBe("fiber");
    expect(bundle.component?.source).toBeUndefined();
    expect(bundle.component?.stack).toEqual(["SignInButton", "HeaderActions"]);
    expect(bundle.component?.props).toEqual({ variant: "secondary" });
  });

  it("keeps generated bundle source metadata for sourcemap resolution", () => {
    function SignInButton() {
      return null;
    }

    const button = document.querySelector("#sign-in") as Element;
    attachReactFiber(button, {
      type: "button",
      return: {
        type: SignInButton,
        memoizedProps: { variant: "secondary" },
        _debugGeneratedSource: {
          url: "https://app.test/assets/bundle.js",
          line: 1234,
          column: 56,
          sourceMapUrl: "https://app.test/assets/bundle.js.map",
        },
        return: null,
      },
    });

    const bundle = extractor().extractGrab(button);

    expect(bundle.component?.via).toBe("fiber");
    expect(bundle.component?.generatedSource).toEqual({
      url: "https://app.test/assets/bundle.js",
      line: 1234,
      column: 56,
      sourceMapUrl: "https://app.test/assets/bundle.js.map",
    });
  });

  it("adds verbose computed styles and sibling neighbors when requested", () => {
    const button = document.querySelector("#sign-in") as Element;
    button.insertAdjacentHTML("beforebegin", '<a id="prev-link" href="/pricing">Pricing</a>');
    button.insertAdjacentHTML("afterend", '<span id="next-help">Help</span>');

    const bundle = extractor().extractGrab(button, { verbose: true });

    expect(bundle.verbose?.computedStyles).toMatchObject({
      color: "rgb(255, 255, 255)",
      "background-color": "rgb(37, 99, 235)",
    });
    expect(bundle.verbose?.siblings?.previous).toContain('<a id="prev-link">');
    expect(bundle.verbose?.siblings?.next).toContain('<span id="next-help">');
  });

  it("emits a hybrid selector and pierce path for open shadow DOM", () => {
    document.body.innerHTML = '<my-card id="billing-card"></my-card>';
    const host = document.querySelector("my-card");
    expect(host).toBeTruthy();
    const shadow = (host as HTMLElement).attachShadow({ mode: "open" });
    shadow.innerHTML = '<button class="inner-action">Pay now</button>';
    const button = shadow.querySelector("button");
    expect(button).toBeTruthy();

    const bundle = extractor().extractGrab(button as Element, { depth: 5 });

    expect(bundle.element.selector).toBe(
      'document.querySelector("#billing-card").shadowRoot.querySelector("button.inner-action")',
    );
    expect(bundle.element.shadow).toBe(
      "pierced: #billing-card > #shadow-root > button.inner-action",
    );
    expect(bundle.element.text).toBe("Pay now");
    expect(bundle.ancestors.map((ancestor) => ancestor.html)).toContain(
      '<my-card id="billing-card">',
    );
    expect(bundle.ancestors.at(-1)?.grabbed).toBe(true);
  });

  it("uses Chrome's closed-shadow accessor when available", () => {
    document.body.innerHTML = "<secure-card></secure-card>";
    const host = document.querySelector("secure-card") as HTMLElement;
    const shadow = host.attachShadow({ mode: "closed" });
    shadow.innerHTML = '<button id="secure-action">Authorize</button>';
    Object.defineProperty(host, "openOrClosedShadowRoot", {
      value: shadow,
      configurable: true,
    });
    const button = shadow.querySelector("button");
    expect(button).toBeTruthy();

    const bundle = extractor().extractGrab(button as Element);

    expect(bundle.element.selector).toBe(
      'document.querySelector("secure-card").openOrClosedShadowRoot.querySelector("#secure-action")',
    );
    expect(bundle.element.shadow).toBe("pierced: secure-card > #shadow-root > #secure-action");
  });

  it("resolves implicit and explicit roles", () => {
    const link = document.createElement("a");
    link.href = "/settings";
    expect(extractor().getResolvedRole(link)).toBe("link");

    const div = document.createElement("div");
    div.setAttribute("role", "button");
    expect(extractor().getResolvedRole(div)).toBe("button");
  });
});
