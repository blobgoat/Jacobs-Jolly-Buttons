import { describe, expect, it } from "vitest";
import {
  activeButtonIdsToArray,
  applyButtonVisibilityAndDisabled,
  autoQuoteJsonIdentifiers,
  computeInitialActiveButtonIds,
  computeJoinedCornerRadii,
  computeEffectiveInteractiveMargins,
  DEFAULT_BUTTON_CONFIG,
  DEFAULT_GROUP_CONFIG,
  INVALID_JSON_MESSAGE,
  parseButtonsJson,
  parseGroupConfig,
  resolvePxValue,
  toButtonIdSet,
} from "../buttonWidget.utils.js";
import type { ResolvedButtonConfig } from "../buttonWidget.types.js";

describe("parseButtonsJson", () => {
  it("renders all configured buttons for valid JSON", () => {
    const json = JSON.stringify([
      { id: "a", label: "A" },
      { id: "b", label: "B", mode: "switch" },
    ]);
    const result = parseButtonsJson(json);
    expect(result.parseError).toBeNull();
    expect(result.buttons).toHaveLength(2);
    expect(result.buttons.map((b) => b.id)).toEqual(["a", "b"]);
    expect(result.buttons[1].mode).toBe("switch");
  });

  it("returns a parse error for invalid JSON, with the underlying syntax detail appended", () => {
    const result = parseButtonsJson("{ not valid json");
    // The base message is a stable prefix; the exact JS engine's SyntaxError text after it can
    // vary, so only assert the dynamic detail is present, not an exact match.
    expect(result.parseError).toContain(INVALID_JSON_MESSAGE);
    expect(result.parseError?.length).toBeGreaterThan(INVALID_JSON_MESSAGE.length);
    expect(result.buttons).toHaveLength(0);
    expect(result.issues).toEqual([]);
  });

  it("returns a parse error naming the actual type received when the JSON is not an array", () => {
    const result = parseButtonsJson(JSON.stringify({ id: "a", label: "A" }));
    expect(result.parseError).toContain(INVALID_JSON_MESSAGE);
    expect(result.parseError).toContain("received object");
    expect(result.buttons).toHaveLength(0);
  });

  it("skips invalid entries, reporting the exact missing field and what it's for", () => {
    const json = JSON.stringify([
      { id: "valid", label: "Valid" },
      { label: "No id" },
      { id: "no-label" },
      "not-an-object",
      42,
      null,
    ]);
    const result = parseButtonsJson(json);
    expect(result.buttons).toHaveLength(1);
    expect(result.buttons[0].id).toBe("valid");

    // One issue per skipped entry (5 of the 6 entries are invalid).
    expect(result.issues).toHaveLength(5);
    // Missing "id": names the field and describes what it's for.
    expect(result.issues.some((issue) => issue.includes("Entry 1") && issue.includes('"id"') && issue.includes("unique identifier"))).toBe(true);
    // Missing "label": names the field, the offending button's id, and describes what it's for.
    expect(result.issues.some((issue) => issue.includes('"no-label"') && issue.includes('"label"') && issue.includes("text displayed on the button"))).toBe(true);
    // Non-object entries.
    expect(result.issues.some((issue) => issue.includes("Entry 3"))).toBe(true);
    expect(result.issues.some((issue) => issue.includes("Entry 4"))).toBe(true);
    expect(result.issues.some((issue) => issue.includes("Entry 5"))).toBe(true);
  });

  it("reports a duplicate-id issue naming the id, and keeps only the first valid entry", () => {
    const json = JSON.stringify([
      { id: "dup", label: "First" },
      { id: "dup", label: "Second" },
    ]);
    const result = parseButtonsJson(json);
    expect(result.buttons).toHaveLength(1);
    expect(result.buttons[0].label).toBe("First");
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]).toContain('"dup"');
    expect(result.issues[0]).toContain("duplicates");
    expect(result.issues[0]).toContain("unique");
  });

  it("clamps out-of-range numeric values to their documented ranges", () => {
    const json = JSON.stringify([
      {
        id: "clamped",
        label: "Clamped",
        fontSizePx: 999,
        roundingCoefficient: 10,
        paddingX: -5,
        paddingY: 9999,
        interactiveMarginX: 100,
        interactiveMarginY: -20,
        shadowCoefficient: -1,
      },
    ]);
    const result = parseButtonsJson(json);
    const button = result.buttons[0];
    expect(button.fontSizePx).toBe(48);
    expect(button.roundingCoefficient).toBe(0.5);
    // paddingX/interactiveMarginY are pixel dimensions: a negative input resets them to their
    // default rather than clamping up to the documented minimum (see the negative-px tests
    // below).
    expect(button.paddingX).toBe(DEFAULT_BUTTON_CONFIG.paddingX);
    expect(button.paddingY).toBe(32);
    expect(button.interactiveMarginX).toBe(32);
    expect(button.interactiveMarginY).toBe(DEFAULT_BUTTON_CONFIG.interactiveMarginY);
    // shadowCoefficient is a unitless coefficient, not a pixel dimension, so negative values
    // still clamp to its minimum (0) rather than resetting to the default.
    expect(button.shadowCoefficient).toBe(0);
  });

  it("treats a negative value as 'use default' for pixel-dimension button fields", () => {
    const json = JSON.stringify([
      {
        id: "negative-px",
        label: "Negative Px",
        fontSizePx: -1,
        paddingX: -1,
        paddingY: -1,
        interactiveMarginX: -1,
        interactiveMarginY: -1,
      },
    ]);
    const result = parseButtonsJson(json);
    const button = result.buttons[0];
    expect(button.fontSizePx).toBe(DEFAULT_BUTTON_CONFIG.fontSizePx);
    expect(button.paddingX).toBe(DEFAULT_BUTTON_CONFIG.paddingX);
    expect(button.paddingY).toBe(DEFAULT_BUTTON_CONFIG.paddingY);
    expect(button.interactiveMarginX).toBe(DEFAULT_BUTTON_CONFIG.interactiveMarginX);
    expect(button.interactiveMarginY).toBe(DEFAULT_BUTTON_CONFIG.interactiveMarginY);
  });

  it("uses defaults for NaN / non-numeric values", () => {
    const json = JSON.stringify([
      { id: "nan-test", label: "NaN Test", fontSizePx: "not-a-number", shadowCoefficient: NaN },
    ]);
    const result = parseButtonsJson(json);
    expect(result.buttons[0].fontSizePx).toBe(DEFAULT_BUTTON_CONFIG.fontSizePx);
    expect(result.buttons[0].shadowCoefficient).toBe(DEFAULT_BUTTON_CONFIG.shadowCoefficient);
  });

  it("falls back to defaults for unknown enum values", () => {
    const json = JSON.stringify([
      {
        id: "enum-test",
        label: "Enum Test",
        mode: "not-a-real-mode",
      },
    ]);
    const result = parseButtonsJson(json);
    const button = result.buttons[0];
    expect(button.mode).toBe(DEFAULT_BUTTON_CONFIG.mode);
  });
});

describe("autoQuoteJsonIdentifiers", () => {
  it("quotes unquoted object keys and single-word values", () => {
    const fixed = autoQuoteJsonIdentifiers("[{id: run, label: Run, mode: momentary}]");
    expect(fixed).toBe('[{"id": "run", "label": "Run", "mode": "momentary"}]');
    expect(JSON.parse(fixed)).toEqual([{ id: "run", label: "Run", mode: "momentary" }]);
  });

  it("quotes multi-word unquoted values as a single string", () => {
    const fixed = autoQuoteJsonIdentifiers("[{id: run-analysis, label: Run Analysis}]");
    expect(JSON.parse(fixed)).toEqual([{ id: "run-analysis", label: "Run Analysis" }]);
  });

  it("normalizes single-quoted strings to double-quoted", () => {
    const fixed = autoQuoteJsonIdentifiers(`[{id: 'run', label: "Run"}]`);
    expect(JSON.parse(fixed)).toEqual([{ id: "run", label: "Run" }]);
  });

  it("leaves numbers, booleans, and null unquoted", () => {
    const fixed = autoQuoteJsonIdentifiers(
      "[{id: a, fontSizePx: -5, shadowCoefficient: 0.5, disabled: true, note: null}]",
    );
    expect(JSON.parse(fixed)).toEqual([
      { id: "a", fontSizePx: -5, shadowCoefficient: 0.5, disabled: true, note: null },
    ]);
  });

  it("quotes bare words in a flat array (a hand-typed id-list style)", () => {
    const fixed = autoQuoteJsonIdentifiers("[run, layer]");
    expect(JSON.parse(fixed)).toEqual(["run", "layer"]);
  });

  it("does not alter text already inside quotes", () => {
    const alreadyValid = JSON.stringify([{ id: "already-valid", label: "Already Valid" }]);
    expect(autoQuoteJsonIdentifiers(alreadyValid)).toBe(alreadyValid);
  });
});

describe("parseButtonsJson (unquoted-JSON fallback)", () => {
  it("recovers from unquoted keys/values and reports autoQuoted", () => {
    const result = parseButtonsJson("[{id: run, label: Run Analysis, mode: momentary}]");
    expect(result.parseError).toBeNull();
    expect(result.autoQuoted).toBe(true);
    expect(result.buttons).toHaveLength(1);
    expect(result.buttons[0]).toMatchObject({ id: "run", label: "Run Analysis", mode: "momentary" });
  });

  it("does not set autoQuoted for already-strict JSON", () => {
    const result = parseButtonsJson(JSON.stringify([{ id: "a", label: "A" }]));
    expect(result.autoQuoted).toBe(false);
  });

  it("still reports a parse error (with autoQuoted false) when the repair attempt also fails", () => {
    const result = parseButtonsJson("{ this is just : : broken");
    expect(result.parseError).toContain(INVALID_JSON_MESSAGE);
    expect(result.autoQuoted).toBe(false);
    expect(result.buttons).toHaveLength(0);
  });
});

describe("toButtonIdSet", () => {
  it("converts a plain string array into a set", () => {
    expect(toButtonIdSet(["a", "b"])).toEqual(new Set(["a", "b"]));
  });

  it("drops non-string entries defensively", () => {
    expect(toButtonIdSet(["a", 1, null, "b", undefined] as unknown[])).toEqual(new Set(["a", "b"]));
  });

  it("returns an empty set for undefined or a non-array value", () => {
    expect(toButtonIdSet(undefined)).toEqual(new Set());
    expect(toButtonIdSet("not-an-array" as unknown as unknown[])).toEqual(new Set());
  });

  it("returns an empty set for an empty array", () => {
    expect(toButtonIdSet([])).toEqual(new Set());
  });
});

describe("activeButtonIdsToArray", () => {
  it("converts a Set into a plain array", () => {
    expect(activeButtonIdsToArray(new Set(["a", "b"]))).toEqual(["a", "b"]);
  });

  it("passes an array through unchanged (as a new array)", () => {
    expect(activeButtonIdsToArray(["a", "b"])).toEqual(["a", "b"]);
  });
});

describe("computeInitialActiveButtonIds", () => {
  const buttons = [
    makeResolvedButton({ id: "run", mode: "momentary" }),
    makeResolvedButton({ id: "layer", mode: "switch", defaultActive: true }),
    makeResolvedButton({ id: "grid", mode: "switch", defaultActive: false }),
  ];

  it("falls back to each switch's defaultActive when the parameter is undefined (never configured)", () => {
    expect(computeInitialActiveButtonIds(buttons, undefined)).toEqual(new Set(["layer"]));
  });

  it("uses the explicitly provided array instead of defaultActive, even when empty", () => {
    expect(computeInitialActiveButtonIds(buttons, [])).toEqual(new Set());
    expect(computeInitialActiveButtonIds(buttons, ["grid"])).toEqual(new Set(["grid"]));
  });

  it("ignores ids that don't refer to a known switch button", () => {
    expect(computeInitialActiveButtonIds(buttons, ["run", "unknown-id", "layer"])).toEqual(
      new Set(["layer"]),
    );
  });
});

function makeResolvedButton(overrides: Partial<ResolvedButtonConfig>): ResolvedButtonConfig {
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
    activeBackgroundColor: "#1e40af",
    activeTextColor: "#ffffff",
    disabledBackgroundColor: "#d1d5db",
    disabledTextColor: "#4b5563",
    shadowCoefficient: 1,
    ...overrides,
  };
}

describe("applyButtonVisibilityAndDisabled", () => {
  it("drops hidden buttons entirely", () => {
    const buttons = [
      makeResolvedButton({ id: "a" }),
      makeResolvedButton({ id: "b" }),
      makeResolvedButton({ id: "c" }),
    ];
    const result = applyButtonVisibilityAndDisabled(buttons, new Set(["b"]), new Set());
    expect(result.map((b) => b.id)).toEqual(["a", "c"]);
  });

  it("force-disables listed ids without mutating the original config objects", () => {
    const original = makeResolvedButton({ id: "a", disabled: false });
    const result = applyButtonVisibilityAndDisabled([original], new Set(), new Set(["a"]));
    expect(result[0].disabled).toBe(true);
    expect(original.disabled).toBe(false);
  });

  it("keeps an already-disabled button disabled even if not force-disabled", () => {
    const buttons = [makeResolvedButton({ id: "a", disabled: true })];
    const result = applyButtonVisibilityAndDisabled(buttons, new Set(), new Set());
    expect(result[0].disabled).toBe(true);
  });

  it("leaves untouched buttons as the same object reference (no unnecessary copies)", () => {
    const original = makeResolvedButton({ id: "a" });
    const result = applyButtonVisibilityAndDisabled([original], new Set(), new Set());
    expect(result[0]).toBe(original);
  });
});

describe("parseGroupConfig", () => {
  it("clamps group-level numeric values and falls back on unknown enums", () => {
    const config = parseGroupConfig({
      layoutMode: "not-real",
      customGapPx: 99999,
      groupPaddingPx: -50,
      buttonHeightPx: 1,
      disabled: undefined,
    });
    expect(config.layoutMode).toBe("joined");
    expect(config.customGapPx).toBe(128);
    // groupPaddingPx is a pixel dimension: -50 resets it to its default (which happens to also
    // be 0, so this assertion is unchanged from clamping behavior).
    expect(config.groupPaddingPx).toBe(DEFAULT_GROUP_CONFIG.groupPaddingPx);
    // buttonHeightPx: 1 is non-negative, so it still clamps up to the documented minimum (28)
    // rather than being treated as "use default".
    expect(config.buttonHeightPx).toBe(28);
    expect(config.disabled).toBe(false);
  });

  it("treats a negative buttonHeightPx/customGapPx as 'use default' instead of clamping to the minimum", () => {
    const config = parseGroupConfig({
      buttonHeightPx: -1,
      customGapPx: -1,
    });
    expect(config.buttonHeightPx).toBe(DEFAULT_GROUP_CONFIG.buttonHeightPx);
    expect(config.customGapPx).toBe(DEFAULT_GROUP_CONFIG.customGapPx);
  });
});

describe("resolvePxValue", () => {
  it("clamps non-negative values into range like clampNumber", () => {
    expect(resolvePxValue(200, 0, 100, 50)).toBe(100);
    expect(resolvePxValue(5, 10, 100, 50)).toBe(10);
    expect(resolvePxValue(40, 10, 100, 50)).toBe(40);
  });

  it("falls back to the default for missing or non-numeric values", () => {
    expect(resolvePxValue(undefined, 0, 100, 42)).toBe(42);
    expect(resolvePxValue(null, 0, 100, 42)).toBe(42);
    expect(resolvePxValue("not-a-number", 0, 100, 42)).toBe(42);
    expect(resolvePxValue(NaN, 0, 100, 42)).toBe(42);
    expect(resolvePxValue(Infinity, 0, 100, 42)).toBe(42);
  });

  it("treats any negative value as an explicit 'use default' sentinel, not a clamp-to-minimum", () => {
    expect(resolvePxValue(-1, 0, 100, 42)).toBe(42);
    expect(resolvePxValue(-9999, 0, 100, 42)).toBe(42);
  });
});

describe("computeJoinedCornerRadii", () => {
  it("gives a single button all four corners", () => {
    expect(computeJoinedCornerRadii(10, "single")).toEqual({
      topLeft: 10,
      topRight: 10,
      bottomRight: 10,
      bottomLeft: 10,
    });
  });

  it("gives the first button only its left corners", () => {
    expect(computeJoinedCornerRadii(10, "first")).toEqual({
      topLeft: 10,
      bottomLeft: 10,
      topRight: 0,
      bottomRight: 0,
    });
  });

  it("gives the last button only its right corners", () => {
    expect(computeJoinedCornerRadii(10, "last")).toEqual({
      topRight: 10,
      bottomRight: 10,
      topLeft: 0,
      bottomLeft: 0,
    });
  });

  it("gives middle buttons no rounded corners", () => {
    expect(computeJoinedCornerRadii(10, "middle")).toEqual({
      topLeft: 0,
      topRight: 0,
      bottomRight: 0,
      bottomLeft: 0,
    });
  });
});

describe("computeEffectiveInteractiveMargins", () => {
  it("zeroes the interior seam for joined middle buttons", () => {
    expect(computeEffectiveInteractiveMargins(10, 4, "middle")).toEqual({
      left: 0,
      right: 0,
      top: 4,
      bottom: 4,
    });
  });

  it("keeps the outer margin only for first/last joined buttons", () => {
    expect(computeEffectiveInteractiveMargins(10, 4, "first")).toEqual({
      left: 10,
      right: 0,
      top: 4,
      bottom: 4,
    });
    expect(computeEffectiveInteractiveMargins(10, 4, "last")).toEqual({
      left: 0,
      right: 10,
      top: 4,
      bottom: 4,
    });
  });

  it("keeps both margins for a standalone button", () => {
    expect(computeEffectiveInteractiveMargins(10, 4, "single")).toEqual({
      left: 10,
      right: 10,
      top: 4,
      bottom: 4,
    });
  });
});
