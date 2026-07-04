import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, act } from "@testing-library/react";
import { PwaInstallBanner } from "../pwa-install-banner";

const STORAGE_KEY = "chukta-pwa-banner-dismissed";

// jsdom's localStorage is limited in this environment — replace with an in-memory stub.
const localStore: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem:    (k: string) => localStore[k] ?? null,
  setItem:    (k: string, v: string) => { localStore[k] = v; },
  removeItem: (k: string) => { delete localStore[k]; },
  clear:      () => { for (const k of Object.keys(localStore)) delete localStore[k]; },
});

afterEach(cleanup);

// Helper: mock window.matchMedia to control standalone detection.
function mockMatchMedia(standalone: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn((q: string) => ({
      matches: standalone && q === "(display-mode: standalone)",
      media: q,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Helper: fire a beforeinstallprompt event and return a mock prompt function.
function fireInstallPrompt() {
  const userChoice = Promise.resolve({ outcome: "accepted" as const });
  const promptFn   = vi.fn().mockResolvedValue(undefined);
  const event      = Object.assign(new Event("beforeinstallprompt"), { prompt: promptFn, userChoice });
  act(() => { window.dispatchEvent(event); });
  return { promptFn, userChoice };
}

beforeEach(() => {
  vi.clearAllMocks();
  delete localStore[STORAGE_KEY];
  mockMatchMedia(false); // default: browser mode, not standalone
  Object.defineProperty(window.navigator, "standalone", { configurable: true, value: undefined });
});

describe("PwaInstallBanner", () => {
  it("does not render anything before beforeinstallprompt fires", () => {
    const { container } = render(<PwaInstallBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the banner when beforeinstallprompt fires", () => {
    render(<PwaInstallBanner />);
    fireInstallPrompt();
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Install" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Not now" })).toBeInTheDocument();
  });

  it("does not render when in standalone (PWA) mode", () => {
    mockMatchMedia(true); // simulate display-mode: standalone
    render(<PwaInstallBanner />);
    fireInstallPrompt();
    expect(screen.queryByRole("banner")).toBeNull();
  });

  it("does not render when dismissed within the cooldown window", () => {
    localStore[STORAGE_KEY] = String(Date.now() - 1000);
    render(<PwaInstallBanner />);
    fireInstallPrompt();
    expect(screen.queryByRole("banner")).toBeNull();
  });

  it("shows the banner again when the cooldown has expired", () => {
    const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
    localStore[STORAGE_KEY] = String(Date.now() - fourteenDaysMs - 1000);
    render(<PwaInstallBanner />);
    fireInstallPrompt();
    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("calls prompt() and hides the banner when Install is clicked", async () => {
    render(<PwaInstallBanner />);
    const { promptFn } = fireInstallPrompt();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Install" }));
    });

    expect(promptFn).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("banner")).toBeNull();
  });

  it("hides the banner and stores dismissed timestamp when Not now is clicked", () => {
    render(<PwaInstallBanner />);
    fireInstallPrompt();

    fireEvent.click(screen.getByRole("button", { name: "Not now" }));

    expect(screen.queryByRole("banner")).toBeNull();
    expect(Number(localStore[STORAGE_KEY])).toBeGreaterThan(0);
  });
});
