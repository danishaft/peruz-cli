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

  it("drags within the viewport without starting a grab", async () => {
    const sendMessage = vi.fn();
    Object.defineProperty(globalThis, "chrome", {
      value: {
        runtime: {
          sendMessage,
          onMessage: { addListener: vi.fn() },
        },
      },
      configurable: true,
    });
    Object.defineProperty(window, "innerWidth", { value: 500, configurable: true });
    Object.defineProperty(window, "innerHeight", { value: 300, configurable: true });

    await import("../../../src/content/grab-launcher");

    const launcher = document.querySelector<HTMLDivElement>("#peruz-grab-launcher");
    const button = launcher?.querySelector<HTMLButtonElement>("button");
    expect(launcher).toBeTruthy();
    expect(button).toBeTruthy();

    vi.spyOn(launcher as HTMLDivElement, "getBoundingClientRect").mockReturnValue({
      x: 350,
      y: 240,
      left: 350,
      top: 240,
      right: 492,
      bottom: 282,
      width: 142,
      height: 42,
      toJSON: () => ({}),
    });

    function pointerEvent(
      type: string,
      properties: { clientX: number; clientY: number; pointerId: number },
    ): Event {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, { ...properties, button: 0 });
      return event;
    }

    launcher?.dispatchEvent(
      pointerEvent("pointerdown", { clientX: 400, clientY: 260, pointerId: 1 }),
    );
    window.dispatchEvent(pointerEvent("pointermove", { clientX: 900, clientY: 700, pointerId: 1 }));
    window.dispatchEvent(pointerEvent("pointerup", { clientX: 900, clientY: 700, pointerId: 1 }));
    button?.click();

    expect(launcher?.style.left).toBe("350px");
    expect(launcher?.style.top).toBe("250px");
    expect(launcher?.dataset.dragging).toBe("false");
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
