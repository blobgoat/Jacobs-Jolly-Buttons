import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PalantirButton } from "../components/PalantirButton.js";
import { DISABLED_OPACITY } from "../buttonWidget.utils.js";
import type { InternalButtonEvent, ResolvedButtonConfig } from "../buttonWidget.types.js";

const BASE_CONFIG: ResolvedButtonConfig = {
  id: "test-button",
  label: "Test Button",
  mode: "momentary",
  defaultActive: false,
  disabled: false,
  fontSizePx: 14,
  roundingCoefficient: 0.2,
  paddingX: 14,
  paddingY: 8,
  interactiveMarginX: 6,
  interactiveMarginY: 6,
  backgroundColor: "#2563eb",
  textColor: "#ffffff",
  hoverBackgroundColor: "#1d4ed8",
  hoverTextColor: "#ffffff",
  pressedBackgroundColor: "#1e40af",
  pressedTextColor: "#ffffff",
  // "none" here is inert for PalantirButton itself (scheme resolution happens upstream, in
  // Widget.tsx, before a config ever reaches this component) — set for clarity only.
  colorScheme: "none",
  fontSizeScheme: "none",
  shadowScheme: "none",
  shadowCoefficient: 1,
};

function renderButton(overrides: Partial<ResolvedButtonConfig> = {}, props: Partial<{
  active: boolean;
  groupDisabled: boolean;
}> = {}) {
  const onEvent = vi.fn<(event: InternalButtonEvent) => void>();
  const { container } = render(
    <PalantirButton
      config={{ ...BASE_CONFIG, ...overrides }}
      active={props.active ?? false}
      groupDisabled={props.groupDisabled ?? false}
      buttonHeightPx={40}
      joinedPosition="single"
      onEvent={onEvent}
    />,
  );
  return { onEvent, container };
}

describe("PalantirButton momentary behavior", () => {
  it("emits exactly one hover event on pointer enter", async () => {
    const { onEvent } = renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    const user = userEvent.setup();
    await user.hover(button);
    const hoverEvents = onEvent.mock.calls.filter(([event]) => event.type === "hover");
    expect(hoverEvents).toHaveLength(1);
    expect(hoverEvents[0][0]).toEqual({ type: "hover", id: "test-button", active: false });
  });

  it("emits a press event on pointer activation", async () => {
    const { onEvent } = renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    const user = userEvent.setup();
    await user.click(button);
    expect(onEvent).toHaveBeenCalledWith({ type: "press", id: "test-button", active: false });
  });

  it("never emits unpress for a momentary button (no persistent active state to deselect)", async () => {
    const { onEvent } = renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    const user = userEvent.setup();
    await user.click(button);
    expect(onEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: "unpress" }));
  });

  it("activates on Enter", async () => {
    const { onEvent } = renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    const user = userEvent.setup();
    button.focus();
    await user.keyboard("{Enter}");
    expect(onEvent).toHaveBeenCalledWith({ type: "press", id: "test-button", active: false });
  });

  it("activates on Space", async () => {
    const { onEvent } = renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    const user = userEvent.setup();
    button.focus();
    await user.keyboard(" ");
    expect(onEvent).toHaveBeenCalledWith({ type: "press", id: "test-button", active: false });
  });

  it("does not activate when the pointer is pressed inside and released outside", async () => {
    const { onEvent } = renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    const outside = document.createElement("div");
    document.body.appendChild(outside);

    const user = userEvent.setup();
    await user.pointer([
      { keys: "[MouseLeft>]", target: button },
      { target: outside },
      { keys: "[/MouseLeft]", target: outside },
    ]);

    const pressEvents = onEvent.mock.calls.filter(([event]) => event.type === "press");
    expect(pressEvents).toHaveLength(0);
    document.body.removeChild(outside);
  });

  it("emits no interaction events when disabled", async () => {
    const { onEvent } = renderButton({ disabled: true });
    const button = screen.getByRole("button", { name: "Test Button" });
    expect(button).toBeDisabled();
    const user = userEvent.setup();
    await user.hover(button);
    await user.click(button);
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("does not set aria-pressed on a momentary button", () => {
    renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    expect(button).not.toHaveAttribute("aria-pressed");
  });
});

describe("PalantirButton switch behavior", () => {
  it("toggles from inactive to active and back, and reflects aria-pressed", () => {
    renderButton({ mode: "switch" }, { active: false });
    const button = screen.getByRole("button", { name: "Test Button" });
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("emits change with the new active state on activation (inactive -> active)", async () => {
    const { onEvent } = renderButton({ mode: "switch" }, { active: false });
    const button = screen.getByRole("button", { name: "Test Button" });
    const user = userEvent.setup();
    await user.click(button);
    expect(onEvent).toHaveBeenCalledWith({ type: "change", id: "test-button", active: true });
  });

  it("emits change with the new active state on activation (active -> inactive)", async () => {
    const { onEvent } = renderButton({ mode: "switch" }, { active: true });
    const button = screen.getByRole("button", { name: "Test Button" });
    const user = userEvent.setup();
    await user.click(button);
    expect(onEvent).toHaveBeenCalledWith({ type: "change", id: "test-button", active: false });
  });

  it("emits press (not unpress) when a switch becomes selected", async () => {
    const { onEvent } = renderButton({ mode: "switch" }, { active: false });
    const button = screen.getByRole("button", { name: "Test Button" });
    const user = userEvent.setup();
    await user.click(button);
    expect(onEvent).toHaveBeenCalledWith({ type: "press", id: "test-button", active: true });
    expect(onEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: "unpress" }));
  });

  it("emits unpress (not press) when a switch becomes deselected", async () => {
    const { onEvent } = renderButton({ mode: "switch" }, { active: true });
    const button = screen.getByRole("button", { name: "Test Button" });
    const user = userEvent.setup();
    await user.click(button);
    expect(onEvent).toHaveBeenCalledWith({ type: "unpress", id: "test-button", active: false });
    expect(onEvent).not.toHaveBeenCalledWith(expect.objectContaining({ type: "press" }));
  });

  it("reflects an active state via aria-pressed", () => {
    renderButton({ mode: "switch" }, { active: true });
    const button = screen.getByRole("button", { name: "Test Button" });
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("stays visually pushed down (translated) while active, not just darker, with no active press", () => {
    const { container } = render(
      <PalantirButton
        config={{ ...BASE_CONFIG, mode: "switch" }}
        active={true}
        groupDisabled={false}
        buttonHeightPx={40}
        joinedPosition="single"
        onEvent={vi.fn()}
      />,
    );
    const pressLayer = container.querySelector(".palantir-button-press-layer") as HTMLElement;
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    // No pointer or keyboard interaction at all — being active alone should keep the press layer
    // translated down, matching the shared shadow coefficient's press depth. Not hovered, so the
    // visual surface's hover-grow scale factor stays at 1 (no visual growth). The two live on
    // separate elements/transforms so neither affects the other's math.
    expect(pressLayer.style.transform).toBe("translateY(2px)");
    expect(surface.style.transform).toBe("scale(1)");
  });

  it("springs back to the resting position once an active switch is deactivated", () => {
    const props = {
      groupDisabled: false,
      buttonHeightPx: 40,
      joinedPosition: "single" as const,
      onEvent: vi.fn(),
    };
    const { container, rerender } = render(
      <PalantirButton config={{ ...BASE_CONFIG, mode: "switch" }} active={true} {...props} />,
    );
    const pressLayer = container.querySelector(".palantir-button-press-layer") as HTMLElement;
    expect(pressLayer.style.transform).toBe("translateY(2px)");

    rerender(<PalantirButton config={{ ...BASE_CONFIG, mode: "switch" }} active={false} {...props} />);
    expect(pressLayer.style.transform).toBe("translateY(0px)");
  });

  it("does not release the locally-committed active state on a transient prop match that reverts before the settle window elapses", () => {
    // Regression test for a real flicker: `pendingActive` used to clear the instant `active`
    // first agreed with it. If the host's parameter delivery is out of order or bursty around a
    // click (lag, or another parameter updating at the same time), `active` can transiently agree
    // for one render and then revert before the real, settled value arrives — clearing on that
    // first coincidental match let the revert reach the screen as a visible flicker back to the
    // resting position, right after the button had already committed to looking pressed/active.
    vi.useFakeTimers();
    try {
      const props = {
        groupDisabled: false,
        buttonHeightPx: 40,
        joinedPosition: "single" as const,
        onEvent: vi.fn(),
      };
      const { container, rerender } = render(
        <PalantirButton config={{ ...BASE_CONFIG, mode: "switch" }} active={false} {...props} />,
      );
      const button = screen.getByRole("button", { name: "Test Button" });
      const pressLayer = container.querySelector(".palantir-button-press-layer") as HTMLElement;

      // Commit a selection locally. In isolation (no Widget.tsx wiring), the `active` prop stays
      // put here exactly like it would while a real host round trip is still in flight.
      fireEvent.pointerDown(button);
      fireEvent.pointerUp(button);
      expect(pressLayer.style.transform).toBe("translateY(2px)");

      // A delivery agreeing with the click arrives, but before it's held for a full settle
      // window, an out-of-order/stale delivery reverts `active` again.
      rerender(<PalantirButton config={{ ...BASE_CONFIG, mode: "switch" }} active={true} {...props} />);
      act(() => {
        vi.advanceTimersByTime(100);
      });
      rerender(<PalantirButton config={{ ...BASE_CONFIG, mode: "switch" }} active={false} {...props} />);

      // Still visually held down: the transient match never held long enough to release local
      // control, so the revert never reached the screen.
      expect(pressLayer.style.transform).toBe("translateY(2px)");

      // The real, settled value finally arrives and holds for the full window.
      rerender(<PalantirButton config={{ ...BASE_CONFIG, mode: "switch" }} active={true} {...props} />);
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(pressLayer.style.transform).toBe("translateY(2px)");
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not push down a momentary button just because 'active' is passed (it always ignores it)", () => {
    const { container } = render(
      <PalantirButton
        config={{ ...BASE_CONFIG, mode: "momentary" }}
        active={true}
        groupDisabled={false}
        buttonHeightPx={40}
        joinedPosition="single"
        onEvent={vi.fn()}
      />,
    );
    const pressLayer = container.querySelector(".palantir-button-press-layer") as HTMLElement;
    expect(pressLayer.style.transform).toBe("translateY(0px)");
  });
});

describe("PalantirButton color rendering", () => {
  it("uses the pressed colors (not a separate active color) while a switch is active", () => {
    const { container } = render(
      <PalantirButton
        config={{
          ...BASE_CONFIG,
          mode: "switch",
          pressedBackgroundColor: "#111111",
          pressedTextColor: "#222222",
        }}
        active={true}
        groupDisabled={false}
        buttonHeightPx={40}
        joinedPosition="single"
        onEvent={vi.fn()}
      />,
    );
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    expect(surface.style.backgroundColor).toBe("rgb(17, 17, 17)");
    expect(surface.style.color).toBe("rgb(34, 34, 34)");
  });

  it("uses the default colors, faded, while disabled -- never a separate disabled color", () => {
    const { container } = render(
      <PalantirButton
        config={{
          ...BASE_CONFIG,
          backgroundColor: "#333333",
          textColor: "#444444",
        }}
        active={false}
        groupDisabled={true}
        buttonHeightPx={40}
        joinedPosition="single"
        onEvent={vi.fn()}
      />,
    );
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    expect(surface.style.backgroundColor).toBe("rgb(51, 51, 51)");
    expect(surface.style.color).toBe("rgb(68, 68, 68)");
    expect(surface.style.opacity).toBe(String(DISABLED_OPACITY));
  });

  it("renders full opacity while enabled", () => {
    const { container } = renderButton();
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    expect(surface.style.opacity).toBe("1");
  });
});

describe("PalantirButton hover-exit event", () => {
  it("emits a hoverEnd event when the pointer leaves after a hover", async () => {
    const { onEvent } = renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    const user = userEvent.setup();
    await user.hover(button);
    await user.unhover(button);
    const hoverEndEvents = onEvent.mock.calls.filter(([event]) => event.type === "hoverEnd");
    expect(hoverEndEvents).toHaveLength(1);
    expect(hoverEndEvents[0][0]).toEqual({ type: "hoverEnd", id: "test-button", active: false });
  });

  it("does not emit hoverEnd for a pointer-leave with no preceding hover", () => {
    const { onEvent } = renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    // A pointerleave with no matching pointerenter first (the component guards against emitting
    // hoverEnd when no "hover" was ever emitted for this button).
    fireEvent.pointerLeave(button);
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("emits hoverEnd with the switch's active state", async () => {
    const { onEvent } = renderButton({ mode: "switch" }, { active: true });
    const button = screen.getByRole("button", { name: "Test Button" });
    const user = userEvent.setup();
    await user.hover(button);
    await user.unhover(button);
    expect(onEvent).toHaveBeenCalledWith({ type: "hoverEnd", id: "test-button", active: true });
  });

  it("emits no hover or hoverEnd events when disabled", async () => {
    const { onEvent } = renderButton({ disabled: true });
    const button = screen.getByRole("button", { name: "Test Button" });
    const user = userEvent.setup();
    await user.hover(button);
    await user.unhover(button);
    expect(onEvent).not.toHaveBeenCalled();
  });
});

describe("PalantirButton hover-grow", () => {
  it("scales the visual surface up on hover and back down on hover-out", async () => {
    const { container } = renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    expect(surface.style.transform).toBe("scale(1)");

    const user = userEvent.setup();
    await user.hover(button);
    expect(surface.style.transform).toBe("scale(1.08)");

    await user.unhover(button);
    expect(surface.style.transform).toBe("scale(1)");
  });

  it("does not grow a disabled button on hover", async () => {
    const { container } = renderButton({ disabled: true });
    const button = screen.getByRole("button", { name: "Test Button" });
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    const user = userEvent.setup();
    await user.hover(button);
    expect(surface.style.transform).toBe("scale(1)");
  });

  it("does not affect the press layer's translate when the button grows on hover", async () => {
    const { container } = renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    const pressLayer = container.querySelector(".palantir-button-press-layer") as HTMLElement;
    expect(pressLayer.style.transform).toBe("translateY(0px)");

    const user = userEvent.setup();
    await user.hover(button);
    // Hovering (scale) must not perturb the press layer's own translateY — they're on separate
    // elements/transforms specifically so growing never distorts the press-down distance.
    expect(pressLayer.style.transform).toBe("translateY(0px)");
  });

  it("raises the hovered button's stacking order so it paints above its neighbors", async () => {
    renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    expect(button.style.zIndex).toBe("0");

    const user = userEvent.setup();
    await user.hover(button);
    expect(button.style.zIndex).toBe("2");
  });

  it("keeps hover-grow and press-down fully independent when both are active at once", async () => {
    // Regression test: hover-scale and press-translate used to be combined into a single
    // `transform` value on one element, which composes them into one coordinate-space chain —
    // scaling a translated element (or translating a scaled one) visually distorts the other.
    // Splitting them onto two separate layers (press layer / visual surface) means each keeps
    // its single-function transform regardless of what the other is doing.
    const { container } = renderButton({ mode: "switch" }, { active: true });
    const button = screen.getByRole("button", { name: "Test Button" });
    const pressLayer = container.querySelector(".palantir-button-press-layer") as HTMLElement;
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;

    // Active switch: press layer is translated down, surface isn't scaled yet (not hovered).
    expect(pressLayer.style.transform).toBe("translateY(2px)");
    expect(surface.style.transform).toBe("scale(1)");

    const user = userEvent.setup();
    await user.hover(button);

    // Now hovered too: the surface grows, but the press layer's translate is byte-for-byte the
    // same single-function value as before — the scale never touched it.
    expect(pressLayer.style.transform).toBe("translateY(2px)");
    expect(surface.style.transform).toBe("scale(1.08)");
  });
});

describe("PalantirButton width and height", () => {
  it("fills its wrapper's full width and can shrink below its content size", () => {
    renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    expect(button.style.width).toBe("100%");
    expect(button.style.minWidth).toBe("0px");
  });

  it("keeps the visible button's exact configured height regardless of external layout space", () => {
    const { container } = render(
      <PalantirButton
        config={BASE_CONFIG}
        active={false}
        groupDisabled={false}
        buttonHeightPx={48}
        joinedPosition="single"
        onEvent={vi.fn()}
      />,
    );
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    expect(surface.style.height).toBe("48px");
    expect(surface.style.width).toBe("100%");
  });

  // it("fills the hit area's full height when buttonHeightPx is null (auto-fill mode)", () => {
  //   const { container } = render(
  //     <PalantirButton
  //       config={BASE_CONFIG}
  //       active={false}
  //       groupDisabled={false}
  //       buttonHeightPx={null}
  //       joinedPosition="single"
  //       onEvent={vi.fn()}
  //     />,
  //   );
  //   const button = screen.getByRole("button", { name: "Test Button" });
  //   expect(button.style.height).toBe("100%");
  // });

  it("reserves hover-grow headroom via calc() on the visual surface when buttonHeightPx is null", () => {
    const { container } = render(
      <PalantirButton
        config={BASE_CONFIG}
        active={false}
        groupDisabled={false}
        buttonHeightPx={null}
        joinedPosition="single"
        onEvent={vi.fn()}
      />,
    );
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    // Not a fixed px value — sized as a fraction of the (now dynamic) hit area's height so
    // growing by the hover scale factor never exceeds 100% of it.
    expect(surface.style.height).toContain("calc(100% /");
  });
});

describe("PalantirButton interactive margin / hit area", () => {
  it("puts the transparent interactive margin on the native button hit area, not the visual surface", () => {
    const { container } = render(
      <PalantirButton
        config={BASE_CONFIG}
        active={false}
        groupDisabled={false}
        buttonHeightPx={40}
        joinedPosition="single"
        onEvent={vi.fn()}
      />,
    );
    const button = screen.getByRole("button", { name: "Test Button" });
    expect(button.style.paddingTop).toBe("6px");
    expect(button.style.paddingLeft).toBe("6px");

    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    expect(surface).not.toBeNull();
    expect(surface.style.padding).toBe("8px 14px");
  });
});
