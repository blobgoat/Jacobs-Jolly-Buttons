import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PalantirButtonGroup } from "../components/PalantirButtonGroup.js";
import type { PalantirButtonGroupProps, ResolvedButtonConfig } from "../buttonWidget.types.js";

function makeButton(overrides: Partial<ResolvedButtonConfig>): ResolvedButtonConfig {
  return {
    id: overrides.id ?? "button",
    label: overrides.label ?? "Button",
    mode: "momentary",
    defaultActive: false,
    disabled: false,
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
    colorScheme: "none",
    fontSizeScheme: "none",
    shadowScheme: "none",
    shadowCoefficient: 1,
    ...overrides,
  };
}

const DEFAULT_PROPS: Omit<PalantirButtonGroupProps, "buttons" | "layoutMode"> = {
  customGapPx: 8,
  groupPaddingPx: 0,
  buttonHeightPx: 40,
  buttonVerticalPaddingPx: 0,
  disabled: false,
  activeButtonIds: new Set(),
  onButtonEvent: vi.fn(),
};

function renderGroup(props: Partial<PalantirButtonGroupProps> & Pick<PalantirButtonGroupProps, "buttons" | "layoutMode">) {
  return render(<PalantirButtonGroup {...DEFAULT_PROPS} {...props} onButtonEvent={props.onButtonEvent ?? vi.fn()} />);
}

describe("PalantirButtonGroup layout modes", () => {
  it("applies joined first/middle/last corner behavior and zero internal gap", () => {
    const { container } = renderGroup({
      buttons: [makeButton({ id: "a", label: "A" }), makeButton({ id: "b", label: "B" }), makeButton({ id: "c", label: "C" })],
      layoutMode: "joined",
    });

    const group = screen.getByTestId("palantir-button-group");
    expect(group.style.gap).toBe("0px");

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
    const { container } = renderGroup({
      buttons: [makeButton({ id: "a", label: "A" })],
      layoutMode: "joined",
    });
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    expect(surface.style.borderTopLeftRadius).not.toBe("0px");
    expect(surface.style.borderTopRightRadius).not.toBe("0px");
    expect(surface.style.borderBottomLeftRadius).not.toBe("0px");
    expect(surface.style.borderBottomRightRadius).not.toBe("0px");
  });

  it("gives every joined-mode wrapper an equal flexible width with no horizontal gap", () => {
    const { container } = renderGroup({
      buttons: [makeButton({ id: "a", label: "A" }), makeButton({ id: "b", label: "B" }), makeButton({ id: "c", label: "C" })],
      layoutMode: "joined",
    });
    const wrappers = container.querySelectorAll<HTMLElement>('[data-testid="button-layout-wrapper"]');
    expect(wrappers).toHaveLength(3);
    wrappers.forEach((wrapper) => {
      // The flex shorthand's basis is normalized with a unit when serialized back out, even
      // though it was authored as the unitless "1 1 0".
      expect(wrapper.style.flex).toBe("1 1 0px");
      expect(wrapper.style.minWidth).toBe("0px");
    });
    const group = screen.getByTestId("palantir-button-group");
    expect(group.style.gap).toBe("0px");
  });

  it("uses equal-width columns for space-between instead of natural-width distribution", () => {
    const { container } = renderGroup({
      buttons: [makeButton({ id: "a", label: "A" }), makeButton({ id: "b", label: "B" })],
      layoutMode: "space-between",
    });
    const group = screen.getByTestId("palantir-button-group");
    // The old natural-width "space-between" distribution assertion (`justifyContent ===
    // "space-between"`) no longer applies: the row is now filled edge-to-edge by equal-width
    // columns, so there's no leftover space left for justify-content to distribute.
    expect(group.style.justifyContent).not.toBe("space-between");
    expect(group.style.width).toBe("100%");

    const wrappers = container.querySelectorAll<HTMLElement>('[data-testid="button-layout-wrapper"]');
    expect(wrappers).toHaveLength(2);
    wrappers.forEach((wrapper) => {
      expect(wrapper.style.flex).toBe("1 1 0px");
    });
  });

  it("always uses a fixed 24px gap in space-between mode, ignoring customGapPx", () => {
    renderGroup({
      buttons: [makeButton({ id: "a", label: "A" }), makeButton({ id: "b", label: "B" })],
      layoutMode: "space-between",
      customGapPx: 32,
    });
    const group = screen.getByTestId("palantir-button-group");
    expect(group.style.gap).toBe("24px");
  });

  it("uses the fixed 24px space-between gap even when customGapPx is unset", () => {
    renderGroup({
      buttons: [makeButton({ id: "a", label: "A" }), makeButton({ id: "b", label: "B" })],
      layoutMode: "space-between",
    });
    const group = screen.getByTestId("palantir-button-group");
    expect(group.style.gap).toBe("24px");
  });

  it("does not apply joined seam corner treatment in space-between mode", () => {
    const { container } = renderGroup({
      buttons: [makeButton({ id: "a", label: "A" }), makeButton({ id: "b", label: "B" }), makeButton({ id: "c", label: "C" })],
      layoutMode: "space-between",
    });
    const surfaces = container.querySelectorAll<HTMLElement>(".palantir-button-visual-surface");
    // Every button in space-between mode is treated as a standalone ("single") button — full
    // corner radii on every side, not the joined first/middle/last seam treatment.
    surfaces.forEach((surface) => {
      expect(surface.style.borderTopLeftRadius).not.toBe("0px");
      expect(surface.style.borderTopRightRadius).not.toBe("0px");
      expect(surface.style.borderBottomLeftRadius).not.toBe("0px");
      expect(surface.style.borderBottomRightRadius).not.toBe("0px");
    });
  });

  it("applies the configured custom gap and equal-width columns", () => {
    const { container } = renderGroup({
      buttons: [makeButton({ id: "a", label: "A" }), makeButton({ id: "b", label: "B" })],
      layoutMode: "custom-gap",
      customGapPx: 24,
    });
    const group = screen.getByTestId("palantir-button-group");
    expect(group.style.gap).toBe("24px");

    const wrappers = container.querySelectorAll<HTMLElement>('[data-testid="button-layout-wrapper"]');
    wrappers.forEach((wrapper) => {
      expect(wrapper.style.flex).toBe("1 1 0px");
    });
  });

  it("does not create overlapping internal hit areas for joined buttons with interactive margins", () => {
    renderGroup({
      buttons: [
        makeButton({ id: "a", label: "A", interactiveMarginX: 10, interactiveMarginY: 10 }),
        makeButton({ id: "b", label: "B", interactiveMarginX: 10, interactiveMarginY: 10 }),
      ],
      layoutMode: "joined",
    });
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

  it("no longer scrolls horizontally: overflow-x is not 'auto'", () => {
    renderGroup({
      buttons: [makeButton({ id: "a", label: "A" }), makeButton({ id: "b", label: "B" })],
      layoutMode: "custom-gap",
    });
    const group = screen.getByTestId("palantir-button-group");
    expect(group.style.overflowX).not.toBe("auto");
    // Every button always renders its full label — there is no icon-only collapsed state.
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("gives every wrapper min-width: 0 so columns can shrink instead of overflowing", () => {
    const { container } = renderGroup({
      buttons: [makeButton({ id: "a", label: "Averylonglabelthatwouldotherwiseoverflow" }), makeButton({ id: "b", label: "B" })],
      layoutMode: "custom-gap",
    });
    const wrappers = container.querySelectorAll<HTMLElement>('[data-testid="button-layout-wrapper"]');
    wrappers.forEach((wrapper) => {
      expect(wrapper.style.minWidth).toBe("0px");
    });
  });

  it("fills the group with a single button's wrapper at full flexible width", () => {
    const { container } = renderGroup({
      buttons: [makeButton({ id: "a", label: "A" })],
      layoutMode: "custom-gap",
    });
    const wrappers = container.querySelectorAll<HTMLElement>('[data-testid="button-layout-wrapper"]');
    expect(wrappers).toHaveLength(1);
    expect(wrappers[0].style.flex).toBe("1 1 0px");
    const group = screen.getByTestId("palantir-button-group");
    expect(group.style.width).toBe("100%");
  });

  it("makes every visible button fill its wrapper's width", () => {
    renderGroup({
      buttons: [makeButton({ id: "a", label: "A" }), makeButton({ id: "b", label: "B" }), makeButton({ id: "c", label: "C" })],
      layoutMode: "custom-gap",
    });
    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button.style.width).toBe("100%");
      expect(button.style.minWidth).toBe("0px");
    });
  });

  it("uses overflowY: hidden rather than visible, so hover/press transforms can never spuriously reveal a vertical scrollbar", () => {
    renderGroup({
      buttons: [makeButton({ id: "a", label: "A" })],
      layoutMode: "custom-gap",
    });
    const group = screen.getByTestId("palantir-button-group");
    expect(group.style.overflowY).toBe("hidden");
  });

  it("reserves extra padding beyond groupPaddingPx to accommodate hover/press animations", () => {
    const { rerender } = render(
      <PalantirButtonGroup
        {...DEFAULT_PROPS}
        buttons={[makeButton({ id: "a", label: "A" })]}
        layoutMode="custom-gap"
        groupPaddingPx={0}
      />,
    );
    const group = screen.getByTestId("palantir-button-group");
    const zeroPaddingBuffer = parseFloat(group.style.padding);
    expect(zeroPaddingBuffer).toBeGreaterThan(0);

    rerender(
      <PalantirButtonGroup
        {...DEFAULT_PROPS}
        buttons={[makeButton({ id: "a", label: "A" })]}
        layoutMode="custom-gap"
        groupPaddingPx={20}
      />,
    );
    // Configured groupPaddingPx is additive on top of the reserved animation buffer, not
    // replaced by it.
    expect(parseFloat(group.style.padding)).toBe(zeroPaddingBuffer + 20);
  });
});

describe("PalantirButtonGroup buttonVerticalPadding", () => {
  it("applies the configured vertical padding above and below each button's wrapper, and no horizontal padding", () => {
    const { container } = renderGroup({
      buttons: [makeButton({ id: "a", label: "A" }), makeButton({ id: "b", label: "B" })],
      layoutMode: "custom-gap",
      buttonVerticalPaddingPx: 10,
    });
    const wrappers = container.querySelectorAll<HTMLElement>('[data-testid="button-layout-wrapper"]');
    wrappers.forEach((wrapper) => {
      expect(wrapper.style.paddingTop).toBe("10px");
      expect(wrapper.style.paddingBottom).toBe("10px");
      expect(wrapper.style.paddingLeft).toBe("0px");
      expect(wrapper.style.paddingRight).toBe("0px");
    });
  });

  it("preserves a configured value of 0 (no vertical padding)", () => {
    const { container } = renderGroup({
      buttons: [makeButton({ id: "a", label: "A" })],
      layoutMode: "custom-gap",
      buttonVerticalPaddingPx: 0,
    });
    const wrapper = container.querySelector<HTMLElement>('[data-testid="button-layout-wrapper"]')!;
    expect(wrapper.style.paddingTop).toBe("0px");
    expect(wrapper.style.paddingBottom).toBe("0px");
  });

  it("does not change the visible button's exact height", () => {
    const { container } = renderGroup({
      buttons: [makeButton({ id: "a", label: "A" })],
      layoutMode: "custom-gap",
      buttonHeightPx: 48,
      buttonVerticalPaddingPx: 10,
    });
    const surface = container.querySelector<HTMLElement>(".palantir-button-visual-surface")!;
    expect(surface.style.height).toBe("48px");
  });

  it("does not add horizontal gaps between joined buttons even when configured", () => {
    const { container } = renderGroup({
      buttons: [makeButton({ id: "a", label: "A" }), makeButton({ id: "b", label: "B" })],
      layoutMode: "joined",
      buttonVerticalPaddingPx: 16,
    });
    const group = screen.getByTestId("palantir-button-group");
    expect(group.style.gap).toBe("0px");
    const wrappers = container.querySelectorAll<HTMLElement>('[data-testid="button-layout-wrapper"]');
    wrappers.forEach((wrapper) => {
      expect(wrapper.style.paddingLeft).toBe("0px");
      expect(wrapper.style.paddingRight).toBe("0px");
    });
  });

  it("keeps interactiveMarginY behavior independent of buttonVerticalPaddingPx", () => {
    renderGroup({
      buttons: [makeButton({ id: "a", label: "A", interactiveMarginY: 12 })],
      layoutMode: "custom-gap",
      buttonVerticalPaddingPx: 20,
    });
    const button = screen.getByRole("button", { name: "A" });
    // The hit area's own transparent margin is unaffected by the wrapper's external padding —
    // both add space independently at different levels of the tree.
    expect(button.style.paddingTop).toBe("12px");
    expect(button.style.paddingBottom).toBe("12px");
  });
});

describe("PalantirButtonGroup row containment (bounded to real available height)", () => {
  it("always gives the row flex: 1 1 auto and min-height: 0, regardless of buttonHeightPx mode", () => {
    const fixed = renderGroup({
      buttons: [makeButton({ id: "a", label: "A" })],
      layoutMode: "custom-gap",
      buttonHeightPx: 40,
    });
    const fixedGroup = screen.getByTestId("palantir-button-group");
    expect(fixedGroup.style.flex).toBe("1 1 auto");
    expect(fixedGroup.style.minHeight).toBe("0px");
    fixed.unmount();

    renderGroup({
      buttons: [makeButton({ id: "a", label: "A" })],
      layoutMode: "custom-gap",
      buttonHeightPx: null,
    });
    const autoGroup = screen.getByTestId("palantir-button-group");
    expect(autoGroup.style.flex).toBe("1 1 auto");
    expect(autoGroup.style.minHeight).toBe("0px");
  });

  it("uses alignItems: center for fixed buttonHeightPx", () => {
    renderGroup({
      buttons: [makeButton({ id: "a", label: "A" })],
      layoutMode: "custom-gap",
      buttonHeightPx: 40,
    });
    const group = screen.getByTestId("palantir-button-group");
    expect(group.style.alignItems).toBe("center");
  });

  it("switches to alignItems: stretch when buttonHeightPx is null (auto-fill)", () => {
    renderGroup({
      buttons: [makeButton({ id: "a", label: "A" })],
      layoutMode: "custom-gap",
      buttonHeightPx: null,
    });
    const group = screen.getByTestId("palantir-button-group");
    expect(group.style.alignItems).toBe("stretch");
  });

  it("passes buttonHeightPx: null through to every rendered button's hit area", () => {
    renderGroup({
      buttons: [makeButton({ id: "a", label: "A" }), makeButton({ id: "b", label: "B" })],
      layoutMode: "joined",
      buttonHeightPx: null,
    });
    screen.getAllByRole("button").forEach((button) => {
      expect(button.style.height).toBe("100%");
    });
  });
});
