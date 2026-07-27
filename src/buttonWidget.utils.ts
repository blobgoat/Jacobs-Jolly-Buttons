import type {
  BackgroundImageFit,
  ButtonMode,
  IconPosition,
  JoinedPosition,
  LayoutMode,
  ResolvedButtonConfig,
  ResolvedGroupConfig,
} from "./buttonWidget.types.js";

// ---------------------------------------------------------------------------
// Numeric clamping ranges (section 9 of the spec)
// ---------------------------------------------------------------------------

export const NUMERIC_RANGES = {
  fontSizePx: { min: 8, max: 48 },
  roundingCoefficient: { min: 0, max: 0.5 },
  paddingX: { min: 0, max: 64 },
  paddingY: { min: 0, max: 32 },
  interactiveMarginX: { min: 0, max: 32 },
  interactiveMarginY: { min: 0, max: 32 },
  shadowCoefficient: { min: 0, max: 4 },
  customGapPx: { min: 0, max: 128 },
  groupPaddingPx: { min: 0, max: 128 },
  buttonHeightPx: { min: 28, max: 96 },
} as const;

export const DEFAULT_BUTTON_CONFIG = {
  mode: "momentary" as ButtonMode,
  defaultActive: false,
  disabled: false,

  iconPosition: "left" as IconPosition,

  backgroundImageFit: "cover" as BackgroundImageFit,

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
};

export const DEFAULT_GROUP_CONFIG: ResolvedGroupConfig = {
  layoutMode: "joined",
  customGapPx: 8,
  groupPaddingPx: 0,
  buttonHeightPx: 40,
  disabled: false,
};

export const DEFAULT_BUTTONS_JSON = JSON.stringify(
  [
    {
      id: "example-button",
      label: "Example Button",
      mode: "momentary",
    },
  ],
  null,
  2,
);

// ---------------------------------------------------------------------------
// Generic parsing helpers
// ---------------------------------------------------------------------------

export function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (value === null || value === undefined) {
    return fallback;
  }
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, numeric));
}

/**
 * Resolves a pixel-dimension configuration value the same way as `clampNumber`, but treats any
 * negative number as an explicit "use the default" sentinel rather than clamping it up to `min`.
 *
 * Workshop parameter fields cannot be cleared back to blank once an author has typed a custom
 * number into them; entering a negative value (e.g. `-1`) is the documented way to undo a
 * customized pixel value and fall back to the default. This applies only to pixel-dimension
 * fields (button height, gaps, padding, margins, font size) — not to unitless coefficients or
 * priorities, which use negative numbers for other meaningful purposes.
 */
export function resolvePxValue(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  if (value === null || value === undefined) {
    return fallback;
  }
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  if (numeric < 0) {
    return fallback;
  }
  return Math.min(max, Math.max(min, numeric));
}

export function parseEnumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export function parseStringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function parseOptionalStringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function parseBooleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

// ---------------------------------------------------------------------------
// Button JSON parsing / validation (section 7)
// ---------------------------------------------------------------------------

export interface ParsedButtonsResult {
  buttons: ResolvedButtonConfig[];
  /** Non-null when buttonsJson could not be parsed into a JSON array at all. */
  parseError: string | null;
  /**
   * A human-readable description of every entry in `buttonsJson` that was skipped (a missing
   * required field, a duplicate id, or a non-object entry), naming the exact field involved and
   * what it's for. Empty when every entry parsed successfully.
   */
  issues: string[];
  /**
   * True when `buttonsJson` did not parse as strict JSON on the first attempt, but did parse
   * successfully after automatically adding quotation marks around unquoted object keys and/or
   * string values (see `autoQuoteJsonIdentifiers`).
   */
  autoQuoted: boolean;
}

export const INVALID_JSON_MESSAGE = "The button configuration is not valid JSON.";
export const NO_VALID_BUTTONS_MESSAGE = "No valid buttons are configured.";

/**
 * Human-readable descriptions of each required per-button field. Used to compose specific,
 * actionable validation messages ("missing X — X is the thing that does Y") instead of a
 * generic "invalid configuration" message.
 */
export const REQUIRED_BUTTON_FIELD_DESCRIPTIONS = {
  id: 'a unique identifier for this button, used to reference it in "lastButtonId" and "activeButtonIdsJson"',
  label: "the text displayed on the button",
} as const satisfies Record<"id" | "label", string>;

export function resolveButtonConfig(
  id: string,
  label: string,
  raw: Record<string, unknown>,
): ResolvedButtonConfig {
  return {
    id,
    label,
    mode: parseEnumValue(raw.mode, ["momentary", "switch"] as const, DEFAULT_BUTTON_CONFIG.mode),
    defaultActive: parseBooleanValue(raw.defaultActive, DEFAULT_BUTTON_CONFIG.defaultActive),
    disabled: parseBooleanValue(raw.disabled, DEFAULT_BUTTON_CONFIG.disabled),

    iconSrc: parseOptionalStringValue(raw.iconSrc),
    iconAlt: parseOptionalStringValue(raw.iconAlt),
    iconPosition: parseEnumValue(
      raw.iconPosition,
      ["left", "right"] as const,
      DEFAULT_BUTTON_CONFIG.iconPosition,
    ),

    backgroundImageSrc: parseOptionalStringValue(raw.backgroundImageSrc),
    backgroundImageFit: parseEnumValue(
      raw.backgroundImageFit,
      ["cover", "contain", "fill"] as const,
      DEFAULT_BUTTON_CONFIG.backgroundImageFit,
    ),

    // fontSizePx is a pixel dimension: a negative value resets it to the default (section on
    // negative-px-as-"undefined" below `resolvePxValue`).
    fontSizePx: resolvePxValue(
      raw.fontSizePx,
      NUMERIC_RANGES.fontSizePx.min,
      NUMERIC_RANGES.fontSizePx.max,
      DEFAULT_BUTTON_CONFIG.fontSizePx,
    ),
    roundingCoefficient: clampNumber(
      raw.roundingCoefficient,
      NUMERIC_RANGES.roundingCoefficient.min,
      NUMERIC_RANGES.roundingCoefficient.max,
      DEFAULT_BUTTON_CONFIG.roundingCoefficient,
    ),

    // paddingX/paddingY/interactiveMarginX/interactiveMarginY are pixel dimensions: a negative
    // value resets each field to its default rather than clamping up to its minimum.
    paddingX: resolvePxValue(
      raw.paddingX,
      NUMERIC_RANGES.paddingX.min,
      NUMERIC_RANGES.paddingX.max,
      DEFAULT_BUTTON_CONFIG.paddingX,
    ),
    paddingY: resolvePxValue(
      raw.paddingY,
      NUMERIC_RANGES.paddingY.min,
      NUMERIC_RANGES.paddingY.max,
      DEFAULT_BUTTON_CONFIG.paddingY,
    ),

    interactiveMarginX: resolvePxValue(
      raw.interactiveMarginX,
      NUMERIC_RANGES.interactiveMarginX.min,
      NUMERIC_RANGES.interactiveMarginX.max,
      DEFAULT_BUTTON_CONFIG.interactiveMarginX,
    ),
    interactiveMarginY: resolvePxValue(
      raw.interactiveMarginY,
      NUMERIC_RANGES.interactiveMarginY.min,
      NUMERIC_RANGES.interactiveMarginY.max,
      DEFAULT_BUTTON_CONFIG.interactiveMarginY,
    ),

    backgroundColor: parseStringValue(raw.backgroundColor, DEFAULT_BUTTON_CONFIG.backgroundColor),
    textColor: parseStringValue(raw.textColor, DEFAULT_BUTTON_CONFIG.textColor),

    hoverBackgroundColor: parseStringValue(
      raw.hoverBackgroundColor,
      DEFAULT_BUTTON_CONFIG.hoverBackgroundColor,
    ),
    hoverTextColor: parseStringValue(raw.hoverTextColor, DEFAULT_BUTTON_CONFIG.hoverTextColor),

    pressedBackgroundColor: parseStringValue(
      raw.pressedBackgroundColor,
      DEFAULT_BUTTON_CONFIG.pressedBackgroundColor,
    ),
    pressedTextColor: parseStringValue(
      raw.pressedTextColor,
      DEFAULT_BUTTON_CONFIG.pressedTextColor,
    ),

    activeBackgroundColor: parseStringValue(
      raw.activeBackgroundColor,
      DEFAULT_BUTTON_CONFIG.activeBackgroundColor,
    ),
    activeTextColor: parseStringValue(raw.activeTextColor, DEFAULT_BUTTON_CONFIG.activeTextColor),

    disabledBackgroundColor: parseStringValue(
      raw.disabledBackgroundColor,
      DEFAULT_BUTTON_CONFIG.disabledBackgroundColor,
    ),
    disabledTextColor: parseStringValue(
      raw.disabledTextColor,
      DEFAULT_BUTTON_CONFIG.disabledTextColor,
    ),

    shadowCoefficient: clampNumber(
      raw.shadowCoefficient,
      NUMERIC_RANGES.shadowCoefficient.min,
      NUMERIC_RANGES.shadowCoefficient.max,
      DEFAULT_BUTTON_CONFIG.shadowCoefficient,
    ),
  };
}

/**
 * Best-effort repair for near-JSON text where object keys and/or string values are missing the
 * quotation marks strict JSON requires — the most common mistake when someone hand-types
 * configuration, e.g. `{id: run, label: Run Analysis}` instead of
 * `{"id": "run", "label": "Run Analysis"}`.
 *
 * Scans the text once, left to right, tracking whether each position is inside an object or
 * array and whether an object key or a value is expected next:
 *   - Anything already inside a quoted string is copied through untouched (a single-quoted
 *     string is re-quoted as double-quoted, since JSON only allows double quotes).
 *   - A bareword found in key position (immediately followed by `:`) is quoted as-is — object
 *     keys are always a single token.
 *   - A bareword found in value position is quoted together with any further whitespace-
 *     separated words up to the next structural character (`,`, `}`, `]`, `:`, or a quote), so
 *     multi-word unquoted values like `Run Analysis` become one string instead of two stray
 *     tokens — unless that first word is `true`, `false`, or `null`, which stay unquoted to
 *     keep their boolean/null meaning.
 *   - Numbers, punctuation, and whitespace are left exactly as-is.
 *
 * This is only ever invoked as a fallback after a strict `JSON.parse` has already failed, so it
 * can never silently change text that was already valid JSON.
 */
export function autoQuoteJsonIdentifiers(input: string): string {
  const KEYWORD_LITERALS = new Set(["true", "false", "null"]);
  const isIdentifierStart = (ch: string) => /[A-Za-z_$]/.test(ch);
  const isIdentifierPart = (ch: string) => /[A-Za-z0-9_$-]/.test(ch);

  let result = "";
  let i = 0;
  const n = input.length;

  // Tracks whether each currently-open container is an object or an array, so a bareword can be
  // classified as a "key" (only meaningful directly inside an object) or a "value".
  const containerStack: Array<"object" | "array"> = [];
  let expecting: "key" | "value" = "value";
  const currentContainer = () => containerStack[containerStack.length - 1];

  while (i < n) {
    const ch = input[i];

    if (ch === '"' || ch === "'") {
      // Copy an existing quoted string through untouched (respecting escapes), normalizing a
      // single-quoted string to double-quoted since JSON only allows double quotes.
      const quote = ch;
      let j = i + 1;
      let body = "";
      while (j < n && input[j] !== quote) {
        if (input[j] === "\\" && j + 1 < n) {
          body += input[j] + input[j + 1];
          j += 2;
        } else {
          body += input[j];
          j += 1;
        }
      }
      result += quote === '"' ? `"${body}"` : `"${body.replace(/"/g, '\\"')}"`;
      i = j + 1; // skip past the closing quote (if any — an unterminated string is left as-is
      // for JSON.parse to report)
      continue;
    }

    if (ch === "{") {
      result += ch;
      containerStack.push("object");
      expecting = "key";
      i += 1;
      continue;
    }
    if (ch === "[") {
      result += ch;
      containerStack.push("array");
      expecting = "value";
      i += 1;
      continue;
    }
    if (ch === "}" || ch === "]") {
      result += ch;
      containerStack.pop();
      i += 1;
      continue;
    }
    if (ch === ":") {
      result += ch;
      expecting = "value";
      i += 1;
      continue;
    }
    if (ch === ",") {
      result += ch;
      expecting = currentContainer() === "object" ? "key" : "value";
      i += 1;
      continue;
    }
    if (/\s/.test(ch)) {
      result += ch;
      i += 1;
      continue;
    }

    if (!isIdentifierStart(ch)) {
      // Numbers and any other punctuation JSON.parse itself will judge.
      result += ch;
      i += 1;
      continue;
    }

    if (expecting === "key") {
      let j = i + 1;
      while (j < n && isIdentifierPart(input[j])) {
        j += 1;
      }
      result += `"${input.slice(i, j)}"`;
      i = j;
      continue;
    }

    // Value position: consume the first bareword token...
    let j = i + 1;
    while (j < n && isIdentifierPart(input[j])) {
      j += 1;
    }
    const firstWord = input.slice(i, j);

    if (KEYWORD_LITERALS.has(firstWord)) {
      result += firstWord;
      i = j;
      continue;
    }

    // ...then keep extending through further whitespace-separated words until the next
    // structural character, so a multi-word unquoted value becomes a single quoted string.
    let end = j;
    let valueEnd = j;
    while (end < n) {
      const c = input[end];
      if (c === "," || c === "}" || c === "]" || c === ":" || c === '"' || c === "'") {
        break;
      }
      if (/\s/.test(c)) {
        end += 1;
        continue;
      }
      end += 1;
      valueEnd = end;
    }
    result += `"${input.slice(i, valueEnd)}"`;
    i = valueEnd;
  }

  return result;
}

/**
 * Parses and validates `buttonsJson` into an array of resolved button
 * configurations. Invalid entries are skipped rather than throwing; each skip is described in
 * the returned `issues` array with the exact field involved and what it's for, rather than a
 * generic "invalid configuration" message.
 *
 * If `json` does not parse as strict JSON, this automatically retries after quoting any bare
 * object keys/values (see `autoQuoteJsonIdentifiers`) before giving up and reporting a parse
 * error.
 */
export function parseButtonsJson(json: string): ParsedButtonsResult {
  let raw: unknown;
  let autoQuoted = false;
  try {
    raw = JSON.parse(json);
  } catch (originalError) {
    try {
      raw = JSON.parse(autoQuoteJsonIdentifiers(json));
      autoQuoted = true;
      // console.warn(
      //   "[PalantirButtonGroup] buttonsJson had unquoted keys/values; automatically added quotation marks. Update buttonsJson to use proper quoted JSON to avoid relying on this.",
      // );
    } catch {
      const detail = originalError instanceof Error ? originalError.message : String(originalError);
      console.warn(`[PalantirButtonGroup] buttonsJson is not valid JSON: ${detail}`);
      return { buttons: [], parseError: `${INVALID_JSON_MESSAGE} ${detail}`, issues: [], autoQuoted: false };
    }
  }

  if (!Array.isArray(raw)) {
    const actualType = raw === null ? "null" : typeof raw;
    const detail = `Expected a JSON array of button objects (e.g. "[{ \\"id\\": ..., \\"label\\": ... }]"), but received ${actualType}.`;
    console.warn(`[PalantirButtonGroup] ${detail}`);
    return { buttons: [], parseError: `${INVALID_JSON_MESSAGE} ${detail}`, issues: [], autoQuoted: false };
  }

  const seenIds = new Set<string>();
  const buttons: ResolvedButtonConfig[] = [];
  const issues: string[] = [];

  const reportIssue = (message: string) => {
    console.warn(`[PalantirButtonGroup] ${message}`);
    issues.push(message);
  };

  raw.forEach((entry, index) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      reportIssue(
        `Entry ${index} was skipped: expected a button object (e.g. "{ id, label, ... }"), ` +
        `but received ${entry === null ? "null" : Array.isArray(entry) ? "an array" : typeof entry}.`,
      );
      return;
    }

    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    const label = typeof record.label === "string" ? record.label.trim() : "";

    if (!id) {
      reportIssue(
        `Entry ${index} was skipped: missing required field "id" ` +
        `(${REQUIRED_BUTTON_FIELD_DESCRIPTIONS.id}).`,
      );
      return;
    }

    if (!label) {
      reportIssue(
        `Button "${id}" (entry ${index}) was skipped: missing required field "label" ` +
        `(${REQUIRED_BUTTON_FIELD_DESCRIPTIONS.label}).`,
      );
      return;
    }

    if (seenIds.has(id)) {
      reportIssue(
        `Button "${id}" (entry ${index}) was skipped: its "id" duplicates an earlier entry. ` +
        `Every button's "id" must be unique — the first entry using this id was kept.`,
      );
      return;
    }

    seenIds.add(id);
    buttons.push(resolveButtonConfig(id, label, record));
  });

  return { buttons, parseError: null, issues, autoQuoted };
}

/**
 * Parses any of the button-id-array parameters (`activeButtonIdsJson`, `disabledButtonIdsJson`,
 * `hiddenButtonIdsJson`) into a set of string IDs. Invalid input yields an empty set. Also
 * tolerates unquoted ids (e.g. `[run, layer]` instead of `["run", "layer"]`) via the same
 * best-effort repair used for `buttonsJson`.
 */
export function parseButtonIdSetJson(json: string | undefined): Set<string> {
  if (!json) {
    return new Set();
  }
  const toIdSet = (parsed: unknown): Set<string> | null =>
    Array.isArray(parsed)
      ? new Set(parsed.filter((value): value is string => typeof value === "string"))
      : null;
  try {
    return toIdSet(JSON.parse(json)) ?? new Set();
  } catch {
    try {
      return toIdSet(JSON.parse(autoQuoteJsonIdentifiers(json))) ?? new Set();
    } catch {
      return new Set();
    }
  }
}

export function serializeActiveButtonIds(ids: Set<string> | string[]): string {
  return JSON.stringify(Array.from(ids));
}

/**
 * Filters out hidden buttons and merges the force-disabled overlay onto the remainder, without
 * mutating the input array or any button config object. Applies `hiddenButtonIdsJson` /
 * `disabledButtonIdsJson` (parsed via `parseButtonIdSetJson`) on top of the buttons already
 * resolved from `buttonsJson`: a hidden id is dropped entirely (as if removed from
 * `buttonsJson`), a disabled id is force-disabled in addition to whatever its own `disabled`
 * field already said.
 */
export function applyButtonVisibilityAndDisabled(
  buttons: ResolvedButtonConfig[],
  hiddenIds: ReadonlySet<string>,
  disabledIds: ReadonlySet<string>,
): ResolvedButtonConfig[] {
  return buttons
    .filter((button) => !hiddenIds.has(button.id))
    .map((button) => (disabledIds.has(button.id) ? { ...button, disabled: true } : button));
}

/**
 * Computes the initial active-button-id set from `activeButtonIdsJson` (if present and valid)
 * or from each switch button's `defaultActive` flag otherwise, restricted to known switch buttons.
 */
export function computeInitialActiveButtonIds(
  buttons: ResolvedButtonConfig[],
  activeButtonIdsJson: string | undefined,
): Set<string> {
  const switchIds = new Set(buttons.filter((b) => b.mode === "switch").map((b) => b.id));
  const parsed = parseButtonIdSetJson(activeButtonIdsJson);

  if (activeButtonIdsJson !== undefined && activeButtonIdsJson.trim().length > 0) {
    // Only keep IDs that refer to known switch buttons; ignore unknown IDs.
    const reconciled = new Set<string>();
    parsed.forEach((id) => {
      if (switchIds.has(id)) {
        reconciled.add(id);
      }
    });
    return reconciled;
  }

  const defaults = new Set<string>();
  buttons.forEach((b) => {
    if (b.mode === "switch" && b.defaultActive) {
      defaults.add(b.id);
    }
  });
  return defaults;
}

// ---------------------------------------------------------------------------
// Group-level parameter parsing
// ---------------------------------------------------------------------------

export function parseGroupConfig(values: {
  layoutMode?: string;
  customGapPx?: number;
  groupPaddingPx?: number;
  buttonHeightPx?: number;
  disabled?: boolean;
}): ResolvedGroupConfig {
  return {
    layoutMode: parseEnumValue(
      values.layoutMode,
      ["joined", "space-between", "custom-gap"] as const satisfies readonly LayoutMode[],
      DEFAULT_GROUP_CONFIG.layoutMode,
    ),
    // customGapPx/groupPaddingPx are pixel dimensions: a negative value resets each field to its
    // default rather than clamping up to its minimum.
    customGapPx: resolvePxValue(
      values.customGapPx,
      NUMERIC_RANGES.customGapPx.min,
      NUMERIC_RANGES.customGapPx.max,
      DEFAULT_GROUP_CONFIG.customGapPx,
    ),
    groupPaddingPx: resolvePxValue(
      values.groupPaddingPx,
      NUMERIC_RANGES.groupPaddingPx.min,
      NUMERIC_RANGES.groupPaddingPx.max,
      DEFAULT_GROUP_CONFIG.groupPaddingPx,
    ),
    // buttonHeightPx is a pixel dimension: a negative value resets it to the default.
    buttonHeightPx: resolvePxValue(
      values.buttonHeightPx,
      NUMERIC_RANGES.buttonHeightPx.min,
      NUMERIC_RANGES.buttonHeightPx.max,
      DEFAULT_GROUP_CONFIG.buttonHeightPx,
    ),
    disabled: parseBooleanValue(values.disabled, DEFAULT_GROUP_CONFIG.disabled),
  };
}

// ---------------------------------------------------------------------------
// Corner rounding (section 16)
// ---------------------------------------------------------------------------

export function computeBorderRadiusPx(buttonHeightPx: number, roundingCoefficient: number): number {
  const clampedCoefficient = clampNumber(
    roundingCoefficient,
    NUMERIC_RANGES.roundingCoefficient.min,
    NUMERIC_RANGES.roundingCoefficient.max,
    DEFAULT_BUTTON_CONFIG.roundingCoefficient,
  );
  return buttonHeightPx * clampedCoefficient;
}

/** Returns the per-corner border radius (in px) for a button given its position in a joined chain. */
export function computeJoinedCornerRadii(
  radiusPx: number,
  joinedPosition: JoinedPosition,
): { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number } {
  switch (joinedPosition) {
    case "first":
      return { topLeft: radiusPx, bottomLeft: radiusPx, topRight: 0, bottomRight: 0 };
    case "last":
      return { topRight: radiusPx, bottomRight: radiusPx, topLeft: 0, bottomLeft: 0 };
    case "middle":
      return { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 };
    case "single":
    default:
      return { topLeft: radiusPx, topRight: radiusPx, bottomRight: radiusPx, bottomLeft: radiusPx };
  }
}

/**
 * Returns the effective left/right/top/bottom interactive margins (px) for a button, accounting
 * for joined-mode margin zeroing on the interior seams between adjacent buttons.
 */
export function computeEffectiveInteractiveMargins(
  interactiveMarginX: number,
  interactiveMarginY: number,
  joinedPosition: JoinedPosition,
): { left: number; right: number; top: number; bottom: number } {
  const top = interactiveMarginY;
  const bottom = interactiveMarginY;

  switch (joinedPosition) {
    case "first":
      return { left: interactiveMarginX, right: 0, top, bottom };
    case "last":
      return { left: 0, right: interactiveMarginX, top, bottom };
    case "middle":
      return { left: 0, right: 0, top, bottom };
    case "single":
    default:
      return { left: interactiveMarginX, right: interactiveMarginX, top, bottom };
  }
}

/** Computes the joined-chain position of a button at `index` out of `total` buttons. */
export function computeJoinedPosition(
  index: number,
  total: number,
  layoutMode: LayoutMode,
): JoinedPosition {
  if (layoutMode !== "joined") {
    return "single";
  }
  if (total <= 1) {
    return "single";
  }
  if (index === 0) {
    return "first";
  }
  if (index === total - 1) {
    return "last";
  }
  return "middle";
}

// ---------------------------------------------------------------------------
// Hover / press animation confinement
// ---------------------------------------------------------------------------

/** How much a button visually grows on hover, as a CSS `scale()` factor. */
export const HOVER_SCALE = 1.08;

/**
 * Extra padding (px) the group container reserves on every side, on top of the author's
 * configured `groupPaddingPx`, so the hover-grow (`HOVER_SCALE`) and press-down
 * (`ShadowSet.translateYPx`) animations always render fully inside the container's box.
 *
 * Both effects are implemented purely as CSS `transform`s (never as layout-affecting width or
 * padding changes), so they never reflow sibling buttons — but a transformed element still
 * contributes to its ancestor's *scrollable* overflow region. Without this reserved buffer,
 * growing or pushing down a button near the container's edge could clip the animation or,
 * combined with the container's horizontal auto-scroll, spuriously reveal a scrollbar that
 * eats into the row's width and visually shifts every other button.
 */
export function computeAnimationBufferPx(buttonHeightPx: number): number {
  // The hover scale grows a button symmetrically in both directions, so on wide buttons (long
  // labels) the horizontal growth can exceed this height-derived estimate slightly; the safety
  // margin below is intentionally generous to cover typical label lengths.
  const scaleGrowthPerSidePx = Math.ceil((buttonHeightPx * (HOVER_SCALE - 1)) / 2);
  const maxPressDepthPx = Math.ceil(2 * NUMERIC_RANGES.shadowCoefficient.max);
  return scaleGrowthPerSidePx + maxPressDepthPx + 8;
}

// ---------------------------------------------------------------------------
// Shadow system (section 17)
// ---------------------------------------------------------------------------

export interface ShadowSet {
  resting: string;
  hover: string;
  pressed: string;
  translateYPx: number;
}

export function computeShadows(shadowCoefficient: number): ShadowSet {
  const c = clampNumber(
    shadowCoefficient,
    NUMERIC_RANGES.shadowCoefficient.min,
    NUMERIC_RANGES.shadowCoefficient.max,
    DEFAULT_BUTTON_CONFIG.shadowCoefficient,
  );

  const resting = `0 ${4 * c}px ${8 * c}px rgba(0, 0, 0, 0.22), inset 0 ${1 * c}px ${1 * c}px rgba(255, 255, 255, 0.18)`;
  const hover = `0 ${5 * c}px ${10 * c}px rgba(0, 0, 0, 0.24), inset 0 ${1 * c}px ${1 * c}px rgba(255, 255, 255, 0.20)`;
  const pressed = `0 ${1 * c}px ${2 * c}px rgba(0, 0, 0, 0.18), inset 0 ${3 * c}px ${6 * c}px rgba(0, 0, 0, 0.28)`;

  return {
    resting,
    hover,
    pressed,
    translateYPx: 2 * c,
  };
}

