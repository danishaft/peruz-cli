// @ts-expect-error - CommonJS module without type definitions
import * as grabMarkdown from "../../../native/formatters/grab-markdown.cjs";

describe("grab markdown formatter", () => {
  it("emits the locked section order and omits empty component data", () => {
    const output = grabMarkdown.formatGrabMarkdown(
      {
        page: {
          url: "http://localhost:3000/dashboard/applications/app-1/subscriptions/sub-1",
          title: "Subscription Detail",
        },
        element: {
          tag: "button",
          role: "button",
          text: "Sign In",
          selector: "nav.header > button.primary",
          xpath: "//*[@id='sign-in']",
          box: { x: 1142, y: 64, width: 248, height: 40 },
          frame: "top",
          shadow: "none",
        },
        styles: {
          color: "#FFFFFF",
          background: "#2563EB",
          font: "14px/20px Inter 500",
          padding: "8px 16px",
          "border-radius": "6px",
        },
        ancestors: [
          { html: '<nav class="header">', indent: 0, grabbed: false },
          { html: '<button class="primary">', indent: 1, grabbed: true },
        ],
      },
      { number: 1, screenshotPath: "/tmp/peruz-grab-001.png" },
    );

    expect(output).toContain("# peruz-grab #001");
    expect(output).toContain("## Page");
    expect(output).toContain(
      "- URL: http://localhost:3000/dashboard/applications/app-1/subscriptions/sub-1",
    );
    expect(output).toContain("## Element");
    expect(output).not.toContain("## Component");
    expect(output.indexOf("## Page")).toBeLessThan(output.indexOf("## Element"));
    expect(output.indexOf("## Element")).toBeLessThan(output.indexOf("## Styles"));
    expect(output.indexOf("## Styles")).toBeLessThan(output.indexOf("## Ancestors"));
    expect(output.indexOf("## Ancestors")).toBeLessThan(output.indexOf("## Screenshot"));
    expect(output).toContain("- Box: 248x40 @ (1142, 64)");
    expect(output).toContain('2.   <button class="primary">          <-- grabbed');
    expect(output).toContain("/tmp/peruz-grab-001.png");
  });

  it("emits a component section when component data exists", () => {
    const output = grabMarkdown.formatGrabMarkdown({
      page: { url: "https://app.example.com/settings", title: "Settings" },
      element: { tag: "button", role: "button", text: "", frame: "top", shadow: "none" },
      component: {
        via: "__source",
        stack: ["SignInButton", "Header"],
        source: "src/components/SignInButton.tsx:14",
        props: { variant: "primary" },
      },
    });

    expect(output).toContain("## Component (React, via __source)");
    expect(output).toContain("- URL: https://app.example.com/settings");
    expect(output).toContain("- Stack: SignInButton -> Header");
    expect(output).toContain("- Source: src/components/SignInButton.tsx:14");
    expect(output).toContain('- Props: {"variant":"primary"}');
  });

  it("emits fiber-tagged component and verbose details", () => {
    const output = grabMarkdown.formatGrabMarkdown({
      element: { tag: "button", role: "button", text: "", frame: "top", shadow: "none" },
      component: {
        via: "fiber",
        stack: ["SignInButton", "Header"],
        props: { variant: "primary" },
      },
      styles: {
        color: "#fff",
      },
      ancestors: [{ html: '<button class="primary">', indent: 0, grabbed: true }],
      verbose: {
        computedStyles: {
          color: "rgb(255, 255, 255)",
          display: "inline-flex",
        },
        eventListeners: [{ type: "click", passive: true }],
        siblings: {
          previous: '<a class="previous">',
          next: '<span class="next">',
        },
      },
    });

    expect(output).toContain("## Component (React, via fiber)");
    expect(output).toContain("- Event listeners: click (passive)");
    expect(output).toContain("- computed styles:");
    expect(output).toContain("  - display: inline-flex");
    expect(output).toContain('- Previous sibling: <a class="previous">');
    expect(output).toContain('- Next sibling: <span class="next">');
  });
});
