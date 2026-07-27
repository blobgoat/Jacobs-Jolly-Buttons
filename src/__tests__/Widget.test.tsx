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
        disabled: false,
        disabledButtonIdsJson: "[]",
        hiddenButtonIdsJson: "[]",
        lastButtonId: "",
        lastButtonInteraction: "",
        lastButtonActive: false,
        activeButtonIdsJson: "[]",
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
        activeButtonIdsJson: JSON.stringify(["layer"]),
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
        activeButtonIdsJson: JSON.stringify([]),
      },
    });
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
    setContext({ values: { activeButtonIdsJson: JSON.stringify(["layer"]) } });
    render(<Widget />);
    const button = screen.getByRole("button", { name: "Layer" });
    expect(button).toHaveAttribute("aria-pressed", "true");
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

describe("Widget hiddenButtonIdsJson / disabledButtonIdsJson", () => {
  beforeEach(() => {
    mockedUseWidgetContext.mockReset();
  });

  it("does not render a button listed in hiddenButtonIdsJson", () => {
    setContext({ values: { hiddenButtonIdsJson: JSON.stringify(["layer"]) } });
    render(<Widget />);
    expect(screen.getByRole("button", { name: "Run" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Layer" })).not.toBeInTheDocument();
  });

  it("force-disables a button listed in disabledButtonIdsJson without disabling the others", () => {
    setContext({ values: { disabledButtonIdsJson: JSON.stringify(["run"]) } });
    render(<Widget />);
    expect(screen.getByRole("button", { name: "Run" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Layer" })).not.toBeDisabled();
  });

  it("preserves a hidden switch's active state so it's restored once un-hidden", () => {
    const emitEvent = setContext({
      values: {
        activeButtonIdsJson: JSON.stringify(["layer"]),
        hiddenButtonIdsJson: JSON.stringify(["layer"]),
      },
    });
    const { rerender } = render(<Widget />);
    expect(screen.queryByRole("button", { name: "Layer" })).not.toBeInTheDocument();

    setContext({
      values: { activeButtonIdsJson: JSON.stringify(["layer"]), hiddenButtonIdsJson: "[]" },
      emitEvent,
    });
    rerender(<Widget />);
    expect(screen.getByRole("button", { name: "Layer" })).toHaveAttribute("aria-pressed", "true");
  });

  it("renders an empty group instead of an error when every button is hidden", () => {
    setContext({ values: { hiddenButtonIdsJson: JSON.stringify(["run", "layer"]) } });
    render(<Widget />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/No valid buttons are configured\./)).not.toBeInTheDocument();
  });

  it("does not let disabledButtonIdsJson re-enable a button that's individually disabled in buttonsJson", () => {
    setContext({
      values: {
        buttonsJson: JSON.stringify([{ id: "run", label: "Run", disabled: true }]),
        disabledButtonIdsJson: "[]",
      },
    });
    render(<Widget />);
    expect(screen.getByRole("button", { name: "Run" })).toBeDisabled();
  });
});
