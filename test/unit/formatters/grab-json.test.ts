// @ts-expect-error - CommonJS module without type definitions
import * as grabJson from "../../../native/formatters/grab-json.cjs";

describe("grab json formatter", () => {
  it("emits JSON sections matching the markdown schema", () => {
    const output = grabJson.formatGrabJson(
      {
        page: {
          url: "https://app.example.com/dashboard",
          title: "Dashboard",
          frameUrl: "https://embed.example.com/widget",
        },
        element: {
          tag: "button",
          id: "sign-in",
          classes: ["primary"],
          role: "button",
          aria: { "aria-label": "Sign in" },
          text: "Sign In",
          selector: "#sign-in",
          xpath: "//*[@id='sign-in']",
          box: { x: 1142, y: 64, width: 248, height: 40 },
          frame: "top",
          shadow: "none",
        },
        component: {
          label: "React",
          via: "sourcemap",
          stack: ["SignInButton", "Header"],
          source: "src/components/SignInButton.tsx:14",
          props: { variant: "primary" },
        },
        styles: {
          color: "#fff",
        },
        ancestors: [{ html: '<button class="primary">', indent: 0, grabbed: true }],
        verbose: {
          eventListeners: [{ type: "click", passive: true }],
        },
      },
      { number: 7, screenshotPath: "/tmp/peruz-grab-007.png" },
    );

    expect(output).toEqual({
      Number: 7,
      Page: {
        URL: "https://app.example.com/dashboard",
        Title: "Dashboard",
        FrameURL: "https://embed.example.com/widget",
      },
      Element: {
        Tag: "button",
        Id: "sign-in",
        Classes: ["primary"],
        Role: "button",
        Aria: { "aria-label": "Sign in" },
        Text: "Sign In",
        Selector: "#sign-in",
        XPath: "//*[@id='sign-in']",
        Box: { width: 248, height: 40, x: 1142, y: 64 },
        Frame: "top",
        Shadow: "none",
        EventListeners: [{ type: "click", passive: true }],
      },
      Component: {
        Label: "React",
        Via: "sourcemap",
        Stack: ["SignInButton", "Header"],
        Source: "src/components/SignInButton.tsx:14",
        Props: { variant: "primary" },
      },
      Styles: {
        color: "#fff",
      },
      Ancestors: [{ Index: 1, Html: '<button class="primary">', Indent: 0, Grabbed: true }],
      Screenshot: "/tmp/peruz-grab-007.png",
    });
  });

  it("omits empty optional sections", () => {
    const output = grabJson.formatGrabJson({
      element: { tag: "input", role: "textbox" },
    });

    expect(output).toEqual({
      Number: 1,
      Element: {
        Tag: "input",
        Role: "textbox",
      },
    });
  });
});
