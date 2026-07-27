import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PalantirButtonGroup } from "../components/PalantirButtonGroup.js";
import type { ResolvedButtonConfig } from "../buttonWidget.types.js";

function makeButton(overrides: Partial<ResolvedButtonConfig>): ResolvedButtonConfig {
  return {
    id: overrides.id ?? "button",
    label: overrides.label ?? "Button",
    mode: "momentary",
    defaultActive: false,
    disabled: false,
    iconPosition: "left",
    backgroundImageFit: "cover",
    fontSizePx: 14,
    roundingCoefficient: 0.2,
    paddingX: 14,
    paddingY: 8,
    interactiveMarginX: 0,
    interactiveMarginY: 0,
    backgroundColor: "#2563eb",
    textColor: "#ffffff",
    hoverBackgroundColor: "#1d4ed8",
    hoverTextColor: "#ffffff",
    pressedBackgroundColor: "#1e40af",
    pressedTextColor: "#ffffff",
    activeBackgroundColor: "#1e40af",
    activeTextColor: "#ffffff",
    disabledBackgroundColor: "#d1d5db",
    disabledTextColor: "#4b5563",
    shadowCoefficient: 1,
    ...overrides,
  };
}

describe("PalantirButtonGroup layout modes", () => {
  it("applies joined first/middle/last corner behavior and zero internal gap", () => {
    const { container } = render(
      <PalantirButtonGroup
        buttons={[makeButton({ id: "a", label: "A" }), makeButton({ id: "b", label: "B" }), makeButton({ id: "c", label: "C" })]}
        layoutMode="joined"
        customGapPx={8}
        groupPaddingPx={0}
        buttonHeightPx={40}
        disabled={false}
        activeButtonIds={new Set()}
        onButtonEvent={vi.fn()}
      />,
    );

    const group = screen.getByTestId("palantir-button-group");
    expect(group.style.gap).toBe("0");

    const surfaces = container.querySelectorAll(".palantir-button-visual-surface");
    expect(surfaces).toHaveLength(3);

    const first = surfaces[0] as HTMLElement;
    expect(first.style.borderTopLeftRadius).not.toBe("0px");
    expect(first.style.borderTopRightRadius).toBe("0px");

    const middle = surfaces[1] as HTMLElement;
    expect(middle.style.borderTopLeftRadius).toBe("0px");
    expect(middle.style.borderTopRightRadius).toBe("0px");

    const last = surfaces[2] as HTMLElement;
    expect(last.style.borderTopRightRadius).not.toBe("0px");
    expect(last.style.borderTopLeftRadius).toBe("0px");
  });

  it("keeps all corner radii for a single joined button", () => {
    const { container } = render(
      <PalantirButtonGroup
        buttons={[makeButton({ id: "a", label: "A" })]}
        layoutMode="joined"
        customGapPx={8}
        groupPaddingPx={0}
        buttonHeightPx={40}
        disabled={false}
        activeButtonIds={new Set()}
        onButtonEvent={vi.fn()}
      />,
    );
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    expect(surface.style.borderTopLeftRadius).not.toBe("0px");
    expect(surface.style.borderTopRightRadius).not.toBe("0px");
    expect(surface.style.borderBottomLeftRadius).not.toBe("0px");
    expect(surface.style.borderBottomRightRadius).not.toBe("0px");
  });

  it("uses distributed (space-between) layout", () => {
    render(
      <PalantirButtonGroup
        buttons={[makeButton({ id: "a", label: "A" }), makeButton({ id: "b", label: "B" })]}
        layoutMode="space-between"
        customGapPx={8}
        groupPaddingPx={0}
        buttonHeightPx={40}
        disabled={false}
        activeButtonIds={new Set()}
        onButtonEvent={vi.fn()}
      />,
    );
    const group = screen.getByTestId("palantir-button-group");
    expect(group.style.justifyContent).toBe("space-between");
    expect(group.style.width).toBe("100%");
  });

  it("applies the configured custom gap", () => {
    render(
      <PalantirButtonGroup
        buttons={[makeButton({ id: "a", label: "A" }), makeButton({ id: "b", label: "B" })]}
        layoutMode="custom-gap"
        customGapPx={24}
        groupPaddingPx={0}
        buttonHeightPx={40}
        disabled={false}
        activeButtonIds={new Set()}
        onButtonEvent={vi.fn()}
      />,
    );
    const group = screen.getByTestId("palantir-button-group");
    expect(group.style.gap).toBe("24px");
  });

  it("does not create overlapping internal hit areas for joined buttons with interactive margins", () => {
    render(
      <PalantirButtonGroup
        buttons={[
          makeButton({ id: "a", label: "A", interactiveMarginX: 10, interactiveMarginY: 10 }),
          makeButton({ id: "b", label: "B", interactiveMarginX: 10, interactiveMarginY: 10 }),
        ]}
        layoutMode="joined"
        customGapPx={8}
        groupPaddingPx={0}
        buttonHeightPx={40}
        disabled={false}
        activeButtonIds={new Set()}
        onButtonEvent={vi.fn()}
      />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
    // The interior seam (first button's right edge, second button's left edge) must be zeroed
    // so the two transparent hit areas never overlap or double up.
    expect(buttons[0].style.paddingRight).toBe("0px");
    expect(buttons[1].style.paddingLeft).toBe("0px");
    // The outer edges retain the configured margin.
    expect(buttons[0].style.paddingLeft).toBe("10px");
    expect(buttons[1].style.paddingRight).toBe("10px");
  });

  it("lets the row overflow horizontally instead of collapsing when it doesn't fit", () => {
    render(
      <PalantirButtonGroup
        buttons={[makeButton({ id: "a", label: "A" }), makeButton({ id: "b", label: "B" })]}
        layoutMode="custom-gap"
        customGapPx={8}
        groupPaddingPx={0}
        buttonHeightPx={40}
        disabled={false}
        activeButtonIds={new Set()}
        onButtonEvent={vi.fn()}
      />,
    );
    const group = screen.getByTestId("palantir-button-group");
    expect(group.style.overflowX).toBe("auto");
    // Every button always renders its full label — there is no icon-only collapsed state.
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("uses overflowY: hidden rather than visible, so hover/press transforms can never spuriously reveal a vertical scrollbar", () => {
    // Per the CSS overflow spec, pairing overflow-x: auto with overflow-y: visible forces the
    // "visible" axis to compute as "auto" too — which let a button's press/hover transform
    // reveal an unwanted vertical scrollbar that ate into the row's width and shifted every
    // other button. "hidden" avoids that forced pairing; the reserved animation buffer (see
    // `computeAnimationBufferPx`) ensures nothing ever actually needs to be clipped.
    render(
      <PalantirButtonGroup
        buttons={[makeButton({ id: "a", label: "A" })]}
        layoutMode="custom-gap"
        customGapPx={8}
        groupPaddingPx={0}
        buttonHeightPx={40}
        disabled={false}
        activeButtonIds={new Set()}
        onButtonEvent={vi.fn()}
      />,
    );
    const group = screen.getByTestId("palantir-button-group");
    expect(group.style.overflowY).toBe("hidden");
  });

  it("reserves extra padding beyond groupPaddingPx to accommodate hover/press animations", () => {
    const { rerender } = render(
      <PalantirButtonGroup
        buttons={[makeButton({ id: "a", label: "A" })]}
        layoutMode="custom-gap"
        customGapPx={8}
        groupPaddingPx={0}
        buttonHeightPx={40}
        disabled={false}
        activeButtonIds={new Set()}
        onButtonEvent={vi.fn()}
      />,
    );
    const group = screen.getByTestId("palantir-button-group");
    const zeroPaddingBuffer = parseFloat(group.style.padding);
    expect(zeroPaddingBuffer).toBeGreaterThan(0);

    rerender(
      <PalantirButtonGroup
        buttons={[makeButton({ id: "a", label: "A" })]}
        layoutMode="custom-gap"
        customGapPx={8}
        groupPaddingPx={20}
        buttonHeightPx={40}
        disabled={false}
        activeButtonIds={new Set()}
        onButtonEvent={vi.fn()}
      />,
    );
    // Configured groupPaddingPx is additive on top of the reserved animation buffer, not
    // replaced by it.
    expect(parseFloat(group.style.padding)).toBe(zeroPaddingBuffer + 20);
  });
});
