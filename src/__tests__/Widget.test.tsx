import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWidgetContext } from "../context.js";
import { Widget } from "../Widget.js";

vi.mock("../context.js", () => ({
  useWidgetContext: vi.fn(),
}));

const mockedUseWidgetContext = vi.mocked(useWidgetContext);

const BUTTONS_JSON = JSON.stringify([
  { id: "run", label: "Run", mode: "momentary" },
  { id: "layer", label: "Layer", mode: "switch", defaultActive: false },
]);

function setContext(overrides: {
  state?: "not-started" | "loading" | "loaded";
  values?: Record<string, unknown>;
  emitEvent?: ReturnType<typeof vi.fn>;
}) {
  const emitEvent = overrides.emitEvent ?? vi.fn();
  mockedUseWidgetContext.mockReturnValue({
    parameters: {
      state: overrides.state ?? "loaded",
      values: {
        buttonsJson: BUTTONS_JSON,
        layoutMode: "custom-gap",
        customGapPx: 8,
        groupPaddingPx: 0,
        buttonHeightPx: 40,
        buttonVerticalPaddingPx: 0,
        disabled: false,
        disabledButtonIdsArray: [],
        hiddenButtonIdsArray: [],
        lastButtonId: "",
        lastButtonInteraction: "",
        lastButtonActive: false,
        activeButtonIdsJson: [],
        ...overrides.values,
      },
    },
    emitEvent,
  } as unknown as ReturnType<typeof useWidgetContext>);
  return emitEvent;
}

describe("Widget loading state", () => {
  beforeEach(() => {
    mockedUseWidgetContext.mockReset();
  });

  it("renders a skeleton while parameters are loading", () => {
    setContext({ state: "loading" });
    const { container } = render(<Widget />);
    expect(container.querySelector(".rt-Skeleton")).not.toBeNull();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a skeleton when parameters have not started loading", () => {
    setContext({ state: "not-started" });
    const { container } = render(<Widget />);
    expect(container.querySelector(".rt-Skeleton")).not.toBeNull();
  });
});

describe("Widget Foundry event wiring", () => {
  beforeEach(() => {
    mockedUseWidgetContext.mockReset();
  });

  it("emits buttonHovered with the correct parameter updates", async () => {
    const emitEvent = setContext({});
    render(<Widget />);
    const button = screen.getByRole("button", { name: "Run" });
    const user = userEvent.setup();
    await user.hover(button);

    expect(emitEvent).toHaveBeenCalledWith("buttonHovered", {
      parameterUpdates: {
        lastButtonId: "run",
        lastButtonInteraction: "hover",
        lastButtonActive: false,
      },
    });
  });

  it("emits buttonHoverEnded with the correct parameter updates when the pointer leaves", async () => {
    const emitEvent = setContext({});
    render(<Widget />);
    const button = screen.getByRole("button", { name: "Run" });
    const user = userEvent.setup();
    await user.hover(button);
    await user.unhover(button);

    expect(emitEvent).toHaveBeenCalledWith("buttonHoverEnded", {
      parameterUpdates: {
        lastButtonId: "run",
        lastButtonInteraction: "hoverEnd",
        lastButtonActive: false,
      },
    });
  });

  it("emits buttonPressed with the correct parameter updates", async () => {
    const emitEvent = setContext({});
    render(<Widget />);
    const button = screen.getByRole("button", { name: "Run" });
    const user = userEvent.setup();
    await user.click(button);

    expect(emitEvent).toHaveBeenCalledWith("buttonPressed", {
      parameterUpdates: {
        lastButtonId: "run",
        lastButtonInteraction: "press",
        lastButtonActive: false,
      },
    });
  });

  it("emits buttonChanged with the new active state and updated activeButtonIdsJson", async () => {
    const emitEvent = setContext({});
    render(<Widget />);
    const button = screen.getByRole("button", { name: "Layer" });
    const user = userEvent.setup();
    await user.click(button);

    expect(emitEvent).toHaveBeenCalledWith("buttonChanged", {
      parameterUpdates: {
        lastButtonId: "layer",
        lastButtonInteraction: "change",
        lastButtonActive: true,
        activeButtonIdsJson: ["layer"],
      },
    });
  });

  it("toggles a switch back to inactive on a second activation", async () => {
    const emitEvent = setContext({});
    render(<Widget />);
    const button = screen.getByRole("button", { name: "Layer" });
    const user = userEvent.setup();

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(emitEvent).toHaveBeenCalledWith("buttonChanged", {
      parameterUpdates: {
        lastButtonId: "layer",
        lastButtonInteraction: "change",
        lastButtonActive: false,
        activeButtonIdsJson: [],
      },
    });
  });

  it("emits buttonPressed (not buttonUnpressed) when a switch becomes selected", async () => {
    const emitEvent = setContext({});
    render(<Widget />);
    const button = screen.getByRole("button", { name: "Layer" });
    const user = userEvent.setup();
    await user.click(button);

    expect(emitEvent).toHaveBeenCalledWith("buttonPressed", {
      parameterUpdates: {
        lastButtonId: "layer",
        lastButtonInteraction: "press",
        lastButtonActive: true,
      },
    });
    expect(emitEvent).not.toHaveBeenCalledWith("buttonUnpressed", expect.anything());
  });

  it("emits buttonUnpressed (not a second buttonPressed) when a switch becomes deselected", async () => {
    const emitEvent = setContext({});
    render(<Widget />);
    const button = screen.getByRole("button", { name: "Layer" });
    const user = userEvent.setup();
    await user.click(button); // select
    emitEvent.mockClear();
    await user.click(button); // deselect

    expect(emitEvent).toHaveBeenCalledWith("buttonUnpressed", {
      parameterUpdates: {
        lastButtonId: "layer",
        lastButtonInteraction: "unpress",
        lastButtonActive: false,
      },
    });
    expect(emitEvent).not.toHaveBeenCalledWith("buttonPressed", expect.anything());
  });

  it("shows the invalid-JSON message for malformed buttonsJson", () => {
    setContext({ values: { buttonsJson: "{ not json" } });
    render(<Widget />);
    // The message is dynamic (it appends the underlying JSON syntax error detail), so match on
    // the stable prefix rather than the full text.
    expect(screen.getByText(/The button configuration is not valid JSON\./)).toBeInTheDocument();
  });

  it("names the exact missing field and describes what it does when a button entry is missing its id", () => {
    setContext({
      values: { buttonsJson: JSON.stringify([{ label: "No Id Here" }]) },
    });
    render(<Widget />);
    expect(screen.getByText(/missing required field "id"/)).toBeInTheDocument();
    expect(screen.getByText(/unique identifier/)).toBeInTheDocument();
  });

  it("names the exact missing field, the button id, and describes what it does when a button entry is missing its label", () => {
    setContext({
      values: { buttonsJson: JSON.stringify([{ id: "no-label-button" }]) },
    });
    render(<Widget />);
    expect(screen.getByText(/"no-label-button"/)).toBeInTheDocument();
    expect(screen.getByText(/missing required field "label"/)).toBeInTheDocument();
    expect(screen.getByText(/text displayed on the button/)).toBeInTheDocument();
  });

  it("names the duplicated id when two button entries share one", () => {
    setContext({
      values: {
        buttonsJson: JSON.stringify([
          { id: "dup", label: "First" },
          { id: "dup", label: "Second" },
        ]),
      },
    });
    render(<Widget />);
    // The first "dup" button still renders normally...
    expect(screen.getByRole("button", { name: "First" })).toBeInTheDocument();
    // ...and the skipped second entry is called out by id, above the (still-rendered) group.
    expect(screen.getByText(/"dup".*duplicates/)).toBeInTheDocument();
  });

  it("silently recovers from unquoted keys/values in buttonsJson and renders the buttons", () => {
    setContext({
      values: { buttonsJson: "[{id: run, label: Run Analysis, mode: momentary}]" },
    });
    render(<Widget />);
    expect(screen.getByRole("button", { name: "Run Analysis" })).toBeInTheDocument();
    // The recovery happens silently — no callout should mention it in the UI.
    expect(screen.queryByText(/quotation marks/)).not.toBeInTheDocument();
  });

  it("falls back to the default example button instead of an error when buttonsJson is an empty string", () => {
    // Workshop delivers a never-configured string parameter as "" rather than `undefined` (this
    // SDK's parameter manifest has no `defaultValue` field), so an unconfigured widget instance
    // must not be treated as invalid JSON.
    setContext({ values: { buttonsJson: "" } });
    render(<Widget />);
    expect(
      screen.queryByText("The button configuration is not valid JSON."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Example Button" })).toBeInTheDocument();
  });

  it("falls back to the default example button when buttonsJson is whitespace-only", () => {
    setContext({ values: { buttonsJson: "   " } });
    render(<Widget />);
    expect(
      screen.queryByText("The button configuration is not valid JSON."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Example Button" })).toBeInTheDocument();
  });

  it("shows the no-valid-buttons message plus the specific reason when every entry is invalid", () => {
    setContext({ values: { buttonsJson: JSON.stringify([{ label: "missing id" }]) } });
    render(<Widget />);
    expect(screen.getByText(/No valid buttons are configured\./)).toBeInTheDocument();
    expect(screen.getByText(/missing required field "id"/)).toBeInTheDocument();
  });

  it("initializes a switch button's active state from activeButtonIdsJson", () => {
    setContext({ values: { activeButtonIdsJson: ["layer"] } });
    render(<Widget />);
    const button = screen.getByRole("button", { name: "Layer" });
    expect(button).toHaveAttribute("aria-pressed", "true");
  });
});

describe("Widget responsive layout", () => {
  beforeEach(() => {
    mockedUseWidgetContext.mockReset();
  });

  it("threads buttonVerticalPaddingPx from parameters down to each button's layout wrapper", () => {
    setContext({ values: { buttonVerticalPaddingPx: 12 } });
    const { container } = render(<Widget />);
    const wrappers = container.querySelectorAll<HTMLElement>('[data-testid="button-layout-wrapper"]');
    expect(wrappers.length).toBeGreaterThan(0);
    wrappers.forEach((wrapper) => {
      expect(wrapper.style.paddingTop).toBe("12px");
      expect(wrapper.style.paddingBottom).toBe("12px");
    });
  });

  it("gives every button an equal-width flexible wrapper that fills the group", () => {
    setContext({});
    const { container } = render(<Widget />);
    const wrappers = container.querySelectorAll<HTMLElement>('[data-testid="button-layout-wrapper"]');
    expect(wrappers).toHaveLength(2);
    wrappers.forEach((wrapper) => {
      expect(wrapper.style.flex).toBe("1 1 0px");
    });
    const group = screen.getByTestId("palantir-button-group");
    expect(group.style.width).toBe("100%");
  });

  it("auto-fills the available height when buttonHeightPx is never configured (undefined)", () => {
    const values: Record<string, unknown> = {
      buttonsJson: BUTTONS_JSON,
      layoutMode: "custom-gap",
      customGapPx: 8,
      groupPaddingPx: 0,
      buttonVerticalPaddingPx: 0,
      disabled: false,
      disabledButtonIdsArray: [],
      hiddenButtonIdsArray: [],
      lastButtonId: "",
      lastButtonInteraction: "",
      lastButtonActive: false,
      activeButtonIdsJson: [],
      // buttonHeightPx intentionally omitted — never configured.
    };
    mockedUseWidgetContext.mockReturnValue({
      parameters: { state: "loaded", values },
      emitEvent: vi.fn(),
    } as unknown as ReturnType<typeof useWidgetContext>);
    render(<Widget />);
    screen.getAllByRole("button").forEach((button) => {
      expect(button.style.height).toBe("100%");
    });
  });

  it("auto-fills the available height when buttonHeightPx is negative", () => {
    setContext({ values: { buttonHeightPx: -1 } });
    render(<Widget />);
    screen.getAllByRole("button").forEach((button) => {
      expect(button.style.height).toBe("100%");
    });
  });

  it("keeps the outer widget container sized to fill and center within the widget", () => {
    setContext({});
    const { container } = render(<Widget />);
    const outer = container.firstElementChild?.firstElementChild as HTMLElement;
    expect(outer.style.width).toBe("100%");
    expect(outer.style.height).toBe("100%");
  });
});

describe("Widget disabled propagation", () => {
  beforeEach(() => {
    mockedUseWidgetContext.mockReset();
  });

  it("disables all buttons when the widget-level disabled parameter is true", () => {
    setContext({ values: { disabled: true } });
    render(<Widget />);
    expect(screen.getByRole("button", { name: "Run" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Layer" })).toBeDisabled();
  });
});

describe("Widget color/font-size/rounding/shadow schemes", () => {
  beforeEach(() => {
    mockedUseWidgetContext.mockReset();
  });

  it("keeps every button's own inline colors and font size by default (colorScheme/fontSizeScheme default to 'none')", () => {
    setContext({
      values: {
        buttonsJson: JSON.stringify([
          { id: "run", label: "Run", mode: "momentary", backgroundColor: "#ff0000", fontSizePx: 18 },
        ]),
        // Configuring the schemes at all should have no effect on a button that never opts in.
        primaryBackgroundColor: "#00ff00",
        primaryFontSizePx: 30,
      },
    });
    const { container } = render(<Widget />);
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    expect(surface.style.backgroundColor).toBe("rgb(255, 0, 0)");
    expect(surface.style.fontSize).toBe("18px");
  });

  it("overrides a button's own inline colors and font size once it opts into a scheme", () => {
    setContext({
      values: {
        buttonsJson: JSON.stringify([
          {
            id: "run",
            label: "Run",
            mode: "momentary",
            backgroundColor: "#ff0000",
            fontSizePx: 10,
            colorScheme: "primary",
            fontSizeScheme: "primary",
          },
        ]),
        primaryBackgroundColor: "#00ff00",
        primaryFontSizePx: 20,
      },
    });
    const { container } = render(<Widget />);
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    expect(surface.style.backgroundColor).toBe("rgb(0, 255, 0)");
    expect(surface.style.fontSize).toBe("20px");
  });

  it("resolves a non-primary colorScheme (secondary) to that scheme's group-level colors", () => {
    setContext({
      values: {
        buttonsJson: JSON.stringify([
          { id: "run", label: "Run", mode: "momentary", colorScheme: "secondary" },
        ]),
        secondaryBackgroundColor: "#0000ff",
      },
    });
    const { container } = render(<Widget />);
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    expect(surface.style.backgroundColor).toBe("rgb(0, 0, 255)");
  });

  it("resolves colorScheme and fontSizeScheme independently through the full Widget pipeline", () => {
    setContext({
      values: {
        buttonsJson: JSON.stringify([
          {
            id: "run",
            label: "Run",
            mode: "momentary",
            colorScheme: "secondary",
            fontSizeScheme: "tertiary",
          },
        ]),
        secondaryBackgroundColor: "#0000ff",
        tertiaryFontSizePx: 26,
      },
    });
    const { container } = render(<Widget />);
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    expect(surface.style.backgroundColor).toBe("rgb(0, 0, 255)");
    expect(surface.style.fontSize).toBe("26px");
  });

  it("applies the group's single universal roundingCoefficient to every button, ignoring any per-button roundingCoefficient in buttonsJson", () => {
    setContext({
      values: {
        buttonsJson: JSON.stringify([
          { id: "run", label: "Run", mode: "momentary", roundingCoefficient: 0.1 },
        ]),
        buttonHeightPx: 40,
        roundingCoefficient: 0.5,
      },
    });
    const { container } = render(<Widget />);
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    // Single (non-joined) button: all four corners get the full radius, buttonHeightPx * coefficient.
    // The group's roundingCoefficient (0.5) wins over the button's own inline 0.1.
    expect(surface.style.borderTopLeftRadius).toBe("20px");
  });

  it("defaults the universal roundingCoefficient to 0.2 when unconfigured", () => {
    setContext({
      values: {
        buttonsJson: JSON.stringify([{ id: "run", label: "Run", mode: "momentary" }]),
        buttonHeightPx: 40,
      },
    });
    const { container } = render(<Widget />);
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    expect(surface.style.borderTopLeftRadius).toBe("8px");
  });

  it("overrides a button's own shadow coefficient once it opts into a shadowScheme", () => {
    setContext({
      values: {
        buttonsJson: JSON.stringify([
          { id: "run", label: "Run", mode: "momentary", shadowCoefficient: 0.5, shadowScheme: "secondary" },
        ]),
        secondaryShadowCoefficient: 2,
      },
    });
    const { container } = render(<Widget />);
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    // computeShadows(2)'s resting shadow -- see buttonWidget.utils.ts -- scales every value by the
    // coefficient; checking for its distinctive doubled px values is enough to prove the group's
    // shadowCoefficient (2), not the button's own inline one (0.5), was actually used.
    expect(surface.style.boxShadow).toContain("8px");
    expect(surface.style.boxShadow).toContain("16px");
  });
});

describe("Widget hiddenButtonIdsArray / disabledButtonIdsArray", () => {
  beforeEach(() => {
    mockedUseWidgetContext.mockReset();
  });

  it("does not render a button listed in hiddenButtonIdsArray", () => {
    setContext({ values: { hiddenButtonIdsArray: ["layer"] } });
    render(<Widget />);
    expect(screen.getByRole("button", { name: "Run" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Layer" })).not.toBeInTheDocument();
  });

  it("force-disables a button listed in disabledButtonIdsArray without disabling the others", () => {
    setContext({ values: { disabledButtonIdsArray: ["run"] } });
    render(<Widget />);
    expect(screen.getByRole("button", { name: "Run" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Layer" })).not.toBeDisabled();
  });

  it("preserves a hidden switch's active state so it's restored once un-hidden", () => {
    const emitEvent = setContext({
      values: {
        activeButtonIdsJson: ["layer"],
        hiddenButtonIdsArray: ["layer"],
      },
    });
    const { rerender } = render(<Widget />);
    expect(screen.queryByRole("button", { name: "Layer" })).not.toBeInTheDocument();

    setContext({
      values: { activeButtonIdsJson: ["layer"], hiddenButtonIdsArray: [] },
      emitEvent,
    });
    rerender(<Widget />);
    expect(screen.getByRole("button", { name: "Layer" })).toHaveAttribute("aria-pressed", "true");
  });

  it("renders an empty group instead of an error when every button is hidden", () => {
    setContext({ values: { hiddenButtonIdsArray: ["run", "layer"] } });
    render(<Widget />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/No valid buttons are configured\./)).not.toBeInTheDocument();
  });

  it("does not let disabledButtonIdsArray re-enable a button that's individually disabled in buttonsJson", () => {
    setContext({
      values: {
        buttonsJson: JSON.stringify([{ id: "run", label: "Run", disabled: true }]),
        disabledButtonIdsArray: [],
      },
    });
    render(<Widget />);
    expect(screen.getByRole("button", { name: "Run" })).toBeDisabled();
  });
});
