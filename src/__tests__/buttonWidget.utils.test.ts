import { describe, expect, it } from "vitest";
import {
  activeButtonIdsToArray,
  applyButtonSchemes,
  applyButtonVisibilityAndDisabled,
  areButtonIdSetsEqual,
  autoQuoteJsonIdentifiers,
  computeInitialActiveButtonIds,
  computeJoinedCornerRadii,
  computeEffectiveInteractiveMargins,
  DEFAULT_BUTTON_CONFIG,
  DEFAULT_GROUP_CONFIG,
  INVALID_JSON_MESSAGE,
  NUMERIC_RANGES,
  parseButtonsJson,
  parseGroupConfig,
  resolveButtonHeightPx,
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
        // roundingCoefficient is intentionally NOT set here — it's no longer a per-button field
        // (see the assertion below); it's always the group's single universal value regardless of
        // buttonsJson.
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
    // roundingCoefficient always resolves to the group's default here (there's no group config
    // in play in this direct parseButtonsJson call, so it's DEFAULT_GROUP_CONFIG's own default).
    expect(button.roundingCoefficient).toBe(DEFAULT_GROUP_CONFIG.roundingCoefficient);
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

  it("defaults colorScheme, fontSizeScheme, and shadowScheme to 'none' when unset (keeps the button's own inline fields)", () => {
    const json = JSON.stringify([{ id: "scheme-default", label: "Scheme Default" }]);
    const result = parseButtonsJson(json);
    expect(result.buttons[0].colorScheme).toBe("none");
    expect(result.buttons[0].fontSizeScheme).toBe("none");
    expect(result.buttons[0].shadowScheme).toBe("none");
  });

  it("parses explicit scheme fields opting into a named scheme, independently of each other", () => {
    const json = JSON.stringify([
      {
        id: "mixed-scheme",
        label: "Mixed",
        colorScheme: "secondary",
        fontSizeScheme: "primary",
        shadowScheme: "secondary",
      },
    ]);
    const result = parseButtonsJson(json);
    expect(result.buttons[0].colorScheme).toBe("secondary");
    expect(result.buttons[0].fontSizeScheme).toBe("primary");
    expect(result.buttons[0].shadowScheme).toBe("secondary");
  });

  it("falls back to 'none' for an invalid scheme value on any of the three scheme fields", () => {
    const json = JSON.stringify([
      {
        id: "bad-scheme",
        label: "Bad Scheme",
        colorScheme: "quaternary",
        fontSizeScheme: "not-real",
        shadowScheme: "invalid",
      },
    ]);
    const result = parseButtonsJson(json);
    expect(result.buttons[0].colorScheme).toBe("none");
    expect(result.buttons[0].fontSizeScheme).toBe("none");
    expect(result.buttons[0].shadowScheme).toBe("none");
  });

  it("ignores any roundingCoefficient/roundingScheme fields in buttonsJson (rounding is not per-button)", () => {
    const json = JSON.stringify([
      { id: "rounding-ignored", label: "Rounding Ignored", roundingCoefficient: 0.45, roundingScheme: "primary" },
    ]);
    const result = parseButtonsJson(json);
    const button = result.buttons[0] as ResolvedButtonConfig & Record<string, unknown>;
    expect(button.roundingCoefficient).toBe(DEFAULT_GROUP_CONFIG.roundingCoefficient);
    expect(button.roundingScheme).toBeUndefined();
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

describe("areButtonIdSetsEqual", () => {
  it("returns true for two sets with identical content but different instances", () => {
    expect(areButtonIdSetsEqual(new Set(["a", "b"]), new Set(["b", "a"]))).toBe(true);
  });

  it("returns true when both sets are empty", () => {
    expect(areButtonIdSetsEqual(new Set(), new Set())).toBe(true);
  });

  it("returns false when sizes differ", () => {
    expect(areButtonIdSetsEqual(new Set(["a"]), new Set(["a", "b"]))).toBe(false);
  });

  it("returns false when sizes match but contents differ", () => {
    expect(areButtonIdSetsEqual(new Set(["a", "b"]), new Set(["a", "c"]))).toBe(false);
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
    colorScheme: "none",
    fontSizeScheme: "none",
    shadowScheme: "none",
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

  it("defaults buttonHeightPx to null (auto-fill) when never configured", () => {
    const config = parseGroupConfig({});
    expect(config.buttonHeightPx).toBeNull();
    expect(config.buttonHeightPx).toBe(DEFAULT_GROUP_CONFIG.buttonHeightPx);
  });

  it("clamps a large buttonHeightPx to the raised 240px ceiling instead of the old 96px one", () => {
    expect(parseGroupConfig({ buttonHeightPx: 9999 }).buttonHeightPx).toBe(240);
    expect(parseGroupConfig({ buttonHeightPx: 150 }).buttonHeightPx).toBe(150);
  });

  it("defaults buttonVerticalPaddingPx to 0 when not configured", () => {
    const config = parseGroupConfig({});
    expect(config.buttonVerticalPaddingPx).toBe(0);
    expect(config.buttonVerticalPaddingPx).toBe(DEFAULT_GROUP_CONFIG.buttonVerticalPaddingPx);
  });

  it("preserves an explicit buttonVerticalPaddingPx of 0 rather than falling back via truthiness", () => {
    const config = parseGroupConfig({ buttonVerticalPaddingPx: 0 });
    expect(config.buttonVerticalPaddingPx).toBe(0);
  });

  it("clamps buttonVerticalPaddingPx to the documented 0-64 range", () => {
    expect(parseGroupConfig({ buttonVerticalPaddingPx: 999 }).buttonVerticalPaddingPx).toBe(64);
    expect(parseGroupConfig({ buttonVerticalPaddingPx: 32 }).buttonVerticalPaddingPx).toBe(32);
  });

  it("treats a negative buttonVerticalPaddingPx as 'use default' like the other *Px group fields", () => {
    expect(parseGroupConfig({ buttonVerticalPaddingPx: -1 }).buttonVerticalPaddingPx).toBe(
      DEFAULT_GROUP_CONFIG.buttonVerticalPaddingPx,
    );
  });

  it("defaults every color scheme's colors and font size when unconfigured", () => {
    const config = parseGroupConfig({});
    expect(config.colorSchemes).toEqual(DEFAULT_GROUP_CONFIG.colorSchemes);
    expect(config.fontSizeSchemes).toEqual(DEFAULT_GROUP_CONFIG.fontSizeSchemes);
  });

  it("resolves each scheme's colors from its own flat parameters, independently of the others", () => {
    const config = parseGroupConfig({
      primaryBackgroundColor: "#111111",
      primaryHoverTextColor: "#222222",
      secondaryPressedBackgroundColor: "#333333",
      tertiaryTextColor: "#444444",
    });
    expect(config.colorSchemes.primary.backgroundColor).toBe("#111111");
    expect(config.colorSchemes.primary.hoverTextColor).toBe("#222222");
    // Unconfigured fields on a scheme that had *some* fields set still fall back individually.
    expect(config.colorSchemes.primary.textColor).toBe(DEFAULT_GROUP_CONFIG.colorSchemes.primary.textColor);
    expect(config.colorSchemes.secondary.pressedBackgroundColor).toBe("#333333");
    expect(config.colorSchemes.tertiary.textColor).toBe("#444444");
  });

  it("clamps each scheme's font size to the 8-48 range and defaults to 14 when unconfigured", () => {
    const config = parseGroupConfig({ primaryFontSizePx: 999, secondaryFontSizePx: -1 });
    expect(config.fontSizeSchemes.primary).toBe(48);
    expect(config.fontSizeSchemes.secondary).toBe(DEFAULT_GROUP_CONFIG.fontSizeSchemes.secondary);
    expect(config.fontSizeSchemes.tertiary).toBe(DEFAULT_GROUP_CONFIG.fontSizeSchemes.tertiary);
  });

  it("defaults every scheme's shadow coefficient, and the universal roundingCoefficient, when unconfigured", () => {
    const config = parseGroupConfig({});
    expect(config.roundingCoefficient).toBe(DEFAULT_GROUP_CONFIG.roundingCoefficient);
    expect(config.shadowSchemes).toEqual(DEFAULT_GROUP_CONFIG.shadowSchemes);
  });

  it("resolves the single universal roundingCoefficient from its one flat parameter, clamped to 0-0.5 (negative clamps to 0, not the default)", () => {
    expect(parseGroupConfig({ roundingCoefficient: 0.35 }).roundingCoefficient).toBe(0.35);
    expect(parseGroupConfig({ roundingCoefficient: 10 }).roundingCoefficient).toBe(0.5);
    expect(parseGroupConfig({ roundingCoefficient: -1 }).roundingCoefficient).toBe(0);
  });

  it("resolves each scheme's shadow coefficient from its own flat parameter, clamped to 0-4, negative clamps to 0 (not the default)", () => {
    const config = parseGroupConfig({
      primaryShadowCoefficient: 3,
      secondaryShadowCoefficient: 99,
      tertiaryShadowCoefficient: -1,
    });
    expect(config.shadowSchemes.primary).toBe(3);
    expect(config.shadowSchemes.secondary).toBe(4);
    // shadowCoefficient is a unitless coefficient, not a pixel dimension, so a negative value
    // clamps to the minimum (0) here too, consistent with the per-button field of the same name.
    expect(config.shadowSchemes.tertiary).toBe(0);
  });
});

describe("applyButtonSchemes", () => {
  it("overrides a button's inline colors, font size, and shadow with its chosen schemes", () => {
    const groupConfig = parseGroupConfig({
      primaryBackgroundColor: "#101010",
      primaryTextColor: "#fefefe",
      primaryHoverBackgroundColor: "#202020",
      primaryHoverTextColor: "#efefef",
      primaryPressedBackgroundColor: "#303030",
      primaryPressedTextColor: "#dfdfdf",
      primaryFontSizePx: 22,
      primaryShadowCoefficient: 3,
    });
    const button = makeResolvedButton({
      backgroundColor: "#ffffff",
      textColor: "#000000",
      fontSizePx: 10,
      shadowCoefficient: 0.5,
    });
    const [resolved] = applyButtonSchemes(
      [{ ...button, colorScheme: "primary", fontSizeScheme: "primary", shadowScheme: "primary" }],
      groupConfig,
    );
    expect(resolved.backgroundColor).toBe("#101010");
    expect(resolved.textColor).toBe("#fefefe");
    expect(resolved.hoverBackgroundColor).toBe("#202020");
    expect(resolved.hoverTextColor).toBe("#efefef");
    expect(resolved.pressedBackgroundColor).toBe("#303030");
    expect(resolved.pressedTextColor).toBe("#dfdfdf");
    expect(resolved.fontSizePx).toBe(22);
    expect(resolved.shadowCoefficient).toBe(3);
  });

  it("leaves a button's own inline fields untouched, per axis, when that axis's scheme is 'none'", () => {
    const groupConfig = parseGroupConfig({
      primaryBackgroundColor: "#101010",
      primaryFontSizePx: 22,
      primaryShadowCoefficient: 3,
    });
    const button = makeResolvedButton({
      backgroundColor: "#ffffff",
      fontSizePx: 10,
      shadowCoefficient: 0.5,
      colorScheme: "none",
      fontSizeScheme: "none",
      shadowScheme: "none",
    });
    const [resolved] = applyButtonSchemes([button], groupConfig);
    expect(resolved.backgroundColor).toBe("#ffffff");
    expect(resolved.fontSizePx).toBe(10);
    expect(resolved.shadowCoefficient).toBe(0.5);
  });

  it("resolves all three scheme axes independently -- a button can mix schemes across them", () => {
    const groupConfig = parseGroupConfig({
      secondaryBackgroundColor: "#202020",
      tertiaryFontSizePx: 30,
      secondaryShadowCoefficient: 2,
    });
    const button = makeResolvedButton({
      backgroundColor: "#ffffff",
      fontSizePx: 10,
      shadowCoefficient: 0.5,
      colorScheme: "secondary",
      fontSizeScheme: "tertiary",
      shadowScheme: "secondary",
    });
    const [resolved] = applyButtonSchemes([button], groupConfig);
    expect(resolved.backgroundColor).toBe("#202020");
    expect(resolved.fontSizePx).toBe(30);
    expect(resolved.shadowCoefficient).toBe(2);
  });

  it("always overrides a button's own roundingCoefficient with the group's single universal value, regardless of the other axes' schemes", () => {
    const groupConfig = parseGroupConfig({ roundingCoefficient: 0.45 });
    const buttonWithSchemes = makeResolvedButton({
      roundingCoefficient: 0.1,
      colorScheme: "primary",
      fontSizeScheme: "primary",
      shadowScheme: "primary",
    });
    const buttonWithNoSchemes = makeResolvedButton({ roundingCoefficient: 0.1 });
    const [resolvedWithSchemes] = applyButtonSchemes([buttonWithSchemes], groupConfig);
    const [resolvedWithNoSchemes] = applyButtonSchemes([buttonWithNoSchemes], groupConfig);
    expect(resolvedWithSchemes.roundingCoefficient).toBe(0.45);
    expect(resolvedWithNoSchemes.roundingCoefficient).toBe(0.45);
  });

  it("resolves each button in the array independently", () => {
    const groupConfig = parseGroupConfig({
      primaryBackgroundColor: "#111111",
      secondaryBackgroundColor: "#222222",
    });
    const buttons = [
      makeResolvedButton({ id: "a", colorScheme: "primary" }),
      makeResolvedButton({ id: "b", colorScheme: "secondary" }),
      makeResolvedButton({ id: "c", backgroundColor: "#custom", colorScheme: "none" }),
    ];
    const resolved = applyButtonSchemes(buttons, groupConfig);
    expect(resolved.find((b) => b.id === "a")?.backgroundColor).toBe("#111111");
    expect(resolved.find((b) => b.id === "b")?.backgroundColor).toBe("#222222");
    expect(resolved.find((b) => b.id === "c")?.backgroundColor).toBe("#custom");
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

describe("resolveButtonHeightPx", () => {
  it("returns null (auto-fill) when never configured", () => {
    expect(resolveButtonHeightPx(undefined)).toBeNull();
    expect(resolveButtonHeightPx(null)).toBeNull();
  });

  it("returns null (auto-fill) for a negative value", () => {
    expect(resolveButtonHeightPx(-1)).toBeNull();
    expect(resolveButtonHeightPx(-9999)).toBeNull();
  });

  it("returns null (auto-fill) for NaN / non-numeric values", () => {
    expect(resolveButtonHeightPx(NaN)).toBeNull();
    expect(resolveButtonHeightPx("not-a-number")).toBeNull();
  });

  it("clamps a non-negative value into the documented 28-240 range", () => {
    expect(resolveButtonHeightPx(1)).toBe(NUMERIC_RANGES.buttonHeightPx.min);
    expect(resolveButtonHeightPx(9999)).toBe(NUMERIC_RANGES.buttonHeightPx.max);
    expect(resolveButtonHeightPx(48)).toBe(48);
  });

  it("keeps the documented range at 28-240", () => {
    expect(NUMERIC_RANGES.buttonHeightPx).toEqual({ min: 28, max: 240 });
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
