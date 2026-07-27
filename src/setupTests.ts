import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// jsdom's matchMedia support is inconsistent across environments; guard with a deterministic
// fallback so `useDarkTheme()` never throws.
if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// jsdom does not implement scrollIntoView or pointer capture APIs, which some Radix primitives
// call defensively.
if (typeof window !== "undefined") {
  if (typeof window.HTMLElement.prototype.scrollIntoView !== "function") {
    window.HTMLElement.prototype.scrollIntoView = () => {};
  }
  if (typeof window.HTMLElement.prototype.hasPointerCapture !== "function") {
    window.HTMLElement.prototype.hasPointerCapture = () => false;
  }
  if (typeof window.HTMLElement.prototype.setPointerCapture !== "function") {
    window.HTMLElement.prototype.setPointerCapture = () => {};
  }
  if (typeof window.HTMLElement.prototype.releasePointerCapture !== "function") {
    window.HTMLElement.prototype.releasePointerCapture = () => {};
  }
}

// jsdom does not implement the Blob URL registry that PalantirButton's credentialed icon-fetch
// relies on (URL.createObjectURL / URL.revokeObjectURL). Individual tests still mock
// `global.fetch` themselves; this just keeps the createObjectURL/revokeObjectURL calls from
// throwing "not a function" in that environment.
if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = vi.fn(() => "blob:mock-object-url");
}
if (typeof URL.revokeObjectURL !== "function") {
  URL.revokeObjectURL = vi.fn();
}
