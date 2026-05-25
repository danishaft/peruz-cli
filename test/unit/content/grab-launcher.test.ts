// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

describe("grab launcher", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
    document.documentElement.querySelector("#peruz-grab-launcher")?.remove();
    (window as Window & { __peruzGrabLauncherInstalled?: boolean }).__peruzGrabLauncherInstalled =
      undefined;
  });

  it("falls back to GRAB_ELEMENT when the loaded service worker is older than the UI message", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const sendMessage = vi.fn(async (message: { type: string }) => {
      if (message.type === "PERUZ_GRAB_FROM_UI") {
        return { error: "Unknown message type: PERUZ_GRAB_FROM_UI" };
      }
      if (message.type === "GRAB_ELEMENT") {
        return {
          bundle: {
            page: {
              url: "https://app.example.com/billing",
              title: "Billing",
            },
            element: {
              tag: "button",
              role: "button",
              text: "Subscribe",
              selector: "#subscribe",
              xpath: "//*[@id='subscribe']",
              box: { x: 12, y: 24, width: 120, height: 40 },
              frame: "top",
              shadow: "none",
            },
            styles: { color: "rgb(255, 255, 255)" },
            ancestors: [{ html: '<button id="subscribe">Subscribe</button>', grabbed: true }],
          },
        };
      }
      return { error: `Unexpected message: ${message.type}` };
    });

    Object.defineProperty(globalThis, "chrome", {
      value: {
        runtime: {
          sendMessage,
          onMessage: { addListener: vi.fn() },
        },
      },
      configurable: true,
    });
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    // @ts-expect-error This content script is side-effect only, not a typed module.
    await import("../../../src/content/grab-launcher");

    const button = document.querySelector<HTMLButtonElement>("#peruz-grab-launcher button");
    expect(button).toBeTruthy();

    button?.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(sendMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "PERUZ_GRAB_FROM_UI" }),
    );
    expect(sendMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "GRAB_ELEMENT", noScreenshot: true, mode: "oneshot" }),
    );
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("# peruz-grab #001"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("## Page"));
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("- URL: https://app.example.com/billing"),
    );
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("- Selector: #subscribe"));
  });
});
