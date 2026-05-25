import { vi } from "vitest";
import { sendToNativeHost } from "../../../src/native/port-manager";
import { createChromeMock, resetChromeMock } from "../../mocks/chrome";

// Mock the native port-manager to prevent initNativeMessaging side effects
vi.mock("../../../src/native/port-manager", () => ({
  initNativeMessaging: vi.fn(),
  postToNativeHost: vi.fn(),
  sendToNativeHost: vi.fn(),
}));

// Use dynamic import to ensure chrome mock is set up BEFORE module loads
let handleMessage: (message: any, sender: any) => Promise<any>;

beforeAll(async () => {
  // Set up chrome mock BEFORE importing the module
  (globalThis as any).chrome = createChromeMock();

  // Dynamic import after mock is ready
  const mod = await import("../../../src/service-worker/index");
  handleMessage = mod.handleMessage;
});

describe("window command handlers", () => {
  beforeEach(() => {
    // Fresh mock for each test
    (globalThis as any).chrome = createChromeMock();
    vi.mocked(sendToNativeHost).mockReset();
  });

  afterEach(() => {
    resetChromeMock();
  });

  describe("WINDOW_NEW", () => {
    it("creates window with URL", async () => {
      const chrome = (globalThis as any).chrome;
      chrome.windows.create.mockResolvedValue({ id: 123 });
      chrome.tabs.query.mockResolvedValue([{ id: 456 }]);

      const result = await handleMessage({ type: "WINDOW_NEW", url: "https://example.com" }, {});

      expect(chrome.windows.create).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "https://example.com",
          focused: true,
          type: "normal",
        }),
      );
      expect(result.windowId).toBe(123);
      expect(result.tabId).toBe(456);
    });

    it("creates window with dimensions", async () => {
      const chrome = (globalThis as any).chrome;
      chrome.windows.create.mockResolvedValue({ id: 1 });
      chrome.tabs.query.mockResolvedValue([{ id: 1 }]);

      await handleMessage({ type: "WINDOW_NEW", width: 1280, height: 720 }, {});

      expect(chrome.windows.create).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 1280,
          height: 720,
        }),
      );
    });

    it("creates incognito window", async () => {
      const chrome = (globalThis as any).chrome;
      chrome.windows.create.mockResolvedValue({ id: 1 });
      chrome.tabs.query.mockResolvedValue([{ id: 1 }]);

      await handleMessage({ type: "WINDOW_NEW", incognito: true }, {});

      expect(chrome.windows.create).toHaveBeenCalledWith(
        expect.objectContaining({
          incognito: true,
        }),
      );
    });

    it("includes hint in response", async () => {
      const chrome = (globalThis as any).chrome;
      chrome.windows.create.mockResolvedValue({ id: 999 });
      chrome.tabs.query.mockResolvedValue([{ id: 1 }]);

      const result = await handleMessage({ type: "WINDOW_NEW" }, {});

      expect(result.hint).toContain("--window-id 999");
    });
  });

  describe("WINDOW_LIST", () => {
    it("returns all windows", async () => {
      const chrome = (globalThis as any).chrome;
      chrome.windows.getAll.mockResolvedValue([
        { id: 1, focused: true, width: 800, height: 600, tabs: [] },
        { id: 2, focused: false, width: 1024, height: 768, tabs: [] },
      ]);

      const result = await handleMessage({ type: "WINDOW_LIST" }, {});

      expect(result.windows).toHaveLength(2);
      expect(result.windows[0].id).toBe(1);
      expect(result.windows[0].focused).toBe(true);
    });

    it("includes tabs when requested", async () => {
      const chrome = (globalThis as any).chrome;
      chrome.windows.getAll.mockResolvedValue([
        { id: 1, tabs: [{ id: 10, title: "Tab 1", url: "https://a.com" }] },
      ]);

      const result = await handleMessage({ type: "WINDOW_LIST", includeTabs: true }, {});

      expect(result.windows[0].tabs).toHaveLength(1);
      expect(result.windows[0].tabs[0].title).toBe("Tab 1");
    });
  });

  describe("WINDOW_FOCUS", () => {
    it("focuses window by ID", async () => {
      const chrome = (globalThis as any).chrome;
      chrome.windows.update.mockResolvedValue({});

      const result = await handleMessage({ type: "WINDOW_FOCUS", windowId: 123 }, {});

      expect(chrome.windows.update).toHaveBeenCalledWith(123, { focused: true });
      expect(result.success).toBe(true);
    });

    it("throws without windowId", async () => {
      await expect(handleMessage({ type: "WINDOW_FOCUS" }, {})).rejects.toThrow(
        "No windowId provided",
      );
    });
  });

  describe("WINDOW_CLOSE", () => {
    it("closes window by ID", async () => {
      const chrome = (globalThis as any).chrome;
      chrome.windows.remove.mockResolvedValue(undefined);

      const result = await handleMessage({ type: "WINDOW_CLOSE", windowId: 123 }, {});

      expect(chrome.windows.remove).toHaveBeenCalledWith(123);
      expect(result.success).toBe(true);
    });
  });

  describe("WINDOW_RESIZE", () => {
    it("resizes window", async () => {
      const chrome = (globalThis as any).chrome;
      chrome.windows.update.mockResolvedValue({ width: 1920, height: 1080 });

      const result = await handleMessage(
        {
          type: "WINDOW_RESIZE",
          windowId: 123,
          width: 1920,
          height: 1080,
        },
        {},
      );

      expect(chrome.windows.update).toHaveBeenCalledWith(
        123,
        expect.objectContaining({
          width: 1920,
          height: 1080,
        }),
      );
      expect(result.width).toBe(1920);
    });
  });

  describe("tab commands with windowId", () => {
    describe("LIST_TABS", () => {
      it("filters by windowId when provided", async () => {
        const chrome = (globalThis as any).chrome;
        chrome.tabs.query.mockResolvedValue([{ id: 1, title: "Tab 1" }]);

        await handleMessage({ type: "LIST_TABS", windowId: 123 }, {});

        expect(chrome.tabs.query).toHaveBeenCalledWith({ windowId: 123 });
      });

      it("queries all windows when no windowId", async () => {
        const chrome = (globalThis as any).chrome;
        chrome.tabs.query.mockResolvedValue([]);

        await handleMessage({ type: "LIST_TABS" }, {});

        expect(chrome.tabs.query).toHaveBeenCalledWith({});
      });
    });

    describe("NEW_TAB", () => {
      it("creates tab in specified window", async () => {
        const chrome = (globalThis as any).chrome;
        chrome.tabs.create.mockResolvedValue({ id: 1 });

        await handleMessage({ type: "NEW_TAB", url: "https://example.com", windowId: 123 }, {});

        expect(chrome.tabs.create).toHaveBeenCalledWith(
          expect.objectContaining({
            url: "https://example.com",
            windowId: 123,
          }),
        );
      });
    });
  });

  describe("GRAB_ELEMENT", () => {
    it("injects the grab picker into frames and returns the committing frame bundle", async () => {
      const chrome = (globalThis as any).chrome;
      let pendingResolver: unknown;
      const pending = new Promise((resolve) => {
        pendingResolver = resolve;
      });
      expect(pendingResolver).toBeTypeOf("function");
      chrome.webNavigation.getAllFrames.mockResolvedValue([
        { frameId: 0, parentFrameId: -1, url: "https://shop.example" },
        { frameId: 9, parentFrameId: 0, url: "https://checkout.example/frame" },
      ]);
      chrome.scripting.executeScript.mockResolvedValue([]);
      chrome.tabs.sendMessage.mockImplementation((_tabId: number, message: any, options: any) => {
        if (message.type === "STOP_GRAB_PICKER") {
          return Promise.resolve({ status: "cancelled" });
        }
        if (message.type === "START_GRAB_PICKER" && options.frameId === 9) {
          return Promise.resolve({
            status: "committed",
            bundle: {
              element: {
                box: { x: 10, y: 20, width: 30, height: 40 },
                selector: "#pay",
                frame: "top",
                shadow: "none",
              },
              styles: {},
              ancestors: [],
            },
          });
        }
        return pending;
      });
      chrome.debugger.sendCommand
        .mockResolvedValueOnce({}) // Page.enable from Target.getTargets attach
        .mockResolvedValueOnce({ targetInfos: [] })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          frameTree: {
            frame: { id: "main", url: "https://shop.example", name: "" },
            childFrames: [
              {
                frame: { id: "checkout-frame", url: "https://checkout.example/frame", name: "" },
              },
            ],
          },
        })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ backendNodeId: 44 })
        .mockResolvedValueOnce({
          model: {
            border: [100, 150, 500, 150, 500, 450, 100, 450],
          },
        });

      const result = await handleMessage(
        {
          type: "GRAB_ELEMENT",
          tabId: 777,
          noScreenshot: true,
        },
        {},
      );

      expect(chrome.scripting.executeScript).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { tabId: 777, frameIds: [0] },
        }),
      );
      expect(chrome.scripting.executeScript).toHaveBeenCalledWith(
        expect.objectContaining({
          target: { tabId: 777, frameIds: [9] },
        }),
      );
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        777,
        expect.objectContaining({ type: "START_GRAB_PICKER", mode: "oneshot" }),
        { frameId: 9 },
      );
      expect(result.bundle.element.frame).toBe("https://checkout.example/frame");
      expect(result.bundle.element.box).toEqual({ x: 110, y: 170, width: 30, height: 40 });
    });

    it("passes watch mode to frame pickers", async () => {
      const chrome = (globalThis as any).chrome;
      chrome.webNavigation.getAllFrames.mockResolvedValue([
        { frameId: 0, parentFrameId: -1, url: "https://shop.example" },
      ]);
      chrome.scripting.executeScript.mockResolvedValue([]);
      chrome.tabs.sendMessage.mockImplementation((_tabId: number, message: any) => {
        if (message.type === "STOP_GRAB_PICKER") {
          return Promise.resolve({ status: "cancelled" });
        }
        return Promise.resolve({
          status: "committed",
          bundle: {
            element: {
              box: { x: 10, y: 20, width: 30, height: 40 },
              selector: "#pay",
              frame: "top",
              shadow: "none",
            },
            styles: {},
            ancestors: [],
          },
        });
      });
      chrome.debugger.sendCommand
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ targetInfos: [] });

      await handleMessage(
        {
          type: "GRAB_ELEMENT",
          tabId: 777,
          mode: "watch",
          noScreenshot: true,
        },
        {},
      );

      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        777,
        expect.objectContaining({ type: "START_GRAB_PICKER", mode: "watch" }),
        { frameId: 0 },
      );
    });

    it("stops active grab pickers in all frames", async () => {
      const chrome = (globalThis as any).chrome;
      chrome.webNavigation.getAllFrames.mockResolvedValue([
        { frameId: 0, parentFrameId: -1, url: "https://shop.example" },
        { frameId: 4, parentFrameId: 0, url: "https://shop.example/frame" },
      ]);
      chrome.tabs.sendMessage.mockResolvedValue({ status: "cancelled" });

      const result = await handleMessage(
        {
          type: "GRAB_STOP",
          tabId: 777,
        },
        {},
      );

      expect(result).toEqual({ success: true });
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        777,
        { type: "STOP_GRAB_PICKER" },
        { frameId: 0 },
      );
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(
        777,
        { type: "STOP_GRAB_PICKER" },
        { frameId: 4 },
      );
    });

    it("captures from extension UI and saves through the native host", async () => {
      const chrome = (globalThis as any).chrome;
      vi.mocked(sendToNativeHost).mockResolvedValue({
        success: true,
        copied: true,
        output: "# peruz-grab #001\n",
        screenshotPath: "/tmp/peruz-grab-001.png",
      });
      chrome.webNavigation.getAllFrames.mockResolvedValue([
        { frameId: 0, parentFrameId: -1, url: "https://shop.example" },
      ]);
      chrome.scripting.executeScript.mockResolvedValue([]);
      chrome.tabs.sendMessage.mockImplementation((_tabId: number, message: any) => {
        if (message.type === "STOP_GRAB_PICKER") {
          return Promise.resolve({ status: "cancelled" });
        }
        return Promise.resolve({
          status: "committed",
          bundle: {
            element: {
              box: { x: 10, y: 20, width: 30, height: 40 },
              selector: "#pay",
              frame: "top",
              shadow: "none",
            },
            styles: {},
            ancestors: [],
          },
        });
      });
      chrome.debugger.sendCommand
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ targetInfos: [] });
      chrome.debugger.sendCommand.mockResolvedValueOnce({
        layoutViewport: { clientWidth: 800, clientHeight: 600 },
      });
      chrome.debugger.sendCommand.mockResolvedValueOnce({
        data: "aGVsbG8=",
      });

      const result = await handleMessage(
        {
          type: "PERUZ_GRAB_FROM_UI",
          format: "markdown",
          depth: 5,
          noScreenshot: true,
        },
        { tab: { id: 777 } } as any,
      );

      expect(result).toMatchObject({
        success: true,
        copied: true,
        screenshotPath: "/tmp/peruz-grab-001.png",
      });
      expect(sendToNativeHost).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "EXTENSION_GRAB_SAVE",
          format: "markdown",
          bundle: expect.objectContaining({
            element: expect.objectContaining({ selector: "#pay" }),
          }),
        }),
      );
    });
  });
});
