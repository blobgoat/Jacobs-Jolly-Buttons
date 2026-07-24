import "@testing-library/jest-dom/vitest";

// jsdom does not implement ResizeObserver. Individual collapse-behavior tests install their
// own controllable mock (capturing the callback so they can simulate resize notifications);
// this fallback exists so that any test rendering `PalantirButtonGroup` without configuring
// its own mock does not crash with a ReferenceError.
class NoopResizeObserver implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = NoopResizeObserver;
}

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
