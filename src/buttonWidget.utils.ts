import type {
  ButtonMode,
  ColorSchemeColors,
  ColorSchemeName,
  ColorSchemeTier,
  JoinedPosition,
  LayoutMode,
  Orientation,
  ResolvedButtonConfig,
  ResolvedGroupConfig,
  SelectionMode,
} from "./buttonWidget.types.js";

/** The three named color/font-size scheme tiers a button can opt into, in display order. */
export const COLOR_SCHEME_NAMES = ["primary", "secondary", "tertiary"] as const satisfies readonly ColorSchemeName[];

/** `COLOR_SCHEME_NAMES` plus "none" (opt out to the button's own inline fields). */
export const COLOR_SCHEME_TIERS = [...COLOR_SCHEME_NAMES, "none"] as const satisfies readonly ColorSchemeTier[];

/** The two directions a button group can stack in — see `Orientation`. */
export const ORIENTATIONS = ["row", "column"] as const satisfies readonly Orientation[];

/** The three ways a group's switch buttons' active state can relate to each other — see `SelectionMode`. */
export const SELECTION_MODES = [
  "independent",
  "single",
  "single-required",
] as const satisfies readonly SelectionMode[];

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
  // Raised from the original 28-96 range: 96 was clamping fixed button heights too
  // aggressively for larger tile-style buttons. A configured value above this ceiling still
  // clamps down to 240, but the real, dynamic constraint is the widget's own available height
  // (see the row's `flex: 1 1 auto` + `min-height: 0` in PalantirButtonGroup) — a button (and
  // its hover-grow) is never allowed to render larger than what actually fits, regardless of
  // this static ceiling.
  buttonHeightPx: { min: 28, max: 240 },
  buttonVerticalPaddingPx: { min: 0, max: 64 },
} as const;

/**
 * Representative button height (px) used only to size the hover-grow/press-down animation
 * buffer and the joined-corner radius when `buttonHeightPx` is `null` (auto-fill mode). In that
 * mode the button's real rendered height isn't known synchronously (it's resolved by the browser
 * from available space), so these two cosmetic calculations fall back to this constant rather
 * than measuring the DOM.
 */
export const AUTO_HEIGHT_ANIMATION_BASIS_PX = 40;

/**
 * How long (ms) a switch button's locally-known click outcome (`pendingActive` in
 * `PalantirButton`) must see the host-echoed `active` prop agree with it, continuously, before
 * handing control back to that prop. Guards against out-of-order or bursty parameter deliveries
 * around a click (host lag, or other parameters updating at the same time) transiently agreeing
 * with the optimistic value for one render and then reverting — see the comment on the
 * `pendingActive` settle effect in `PalantirButton.tsx`. Comfortably longer than the 120ms
 * press/color transition so a burst of deliveries has room to fully settle before this fires.
 */
export const PENDING_ACTIVE_SETTLE_MS = 300;

/**
 * Opacity applied to a disabled button's visual surface. Disabled buttons don't have their own
 * color fields (there's no `disabledBackgroundColor`/`disabledTextColor` anymore, per-button or
 * per-scheme) — a disabled button always renders its normal default/unpressed background and
 * text colors, just faded via this opacity, which reads as "disabled" regardless of what those
 * colors actually are and needs no per-scheme configuration of its own.
 */
export const DISABLED_OPACITY = 0.5;

/**
 * Fixed horizontal gap (px) between buttons in `"space-between"` layout mode. Unlike
 * `"custom-gap"` mode, this isn't configurable via a Workshop parameter — `customGapPx` has no
 * effect here — it's always this constant. See `PalantirButtonGroup`'s `containerStyle.gap`.
 */
export const SPACE_BETWEEN_GAP_PX = 24;

export const DEFAULT_BUTTON_CONFIG = {
  mode: "momentary" as ButtonMode,
  defaultActive: false,
  disabled: false,

  fontSizePx: 14,

  paddingX: 14,
  paddingY: 8,

  interactiveMarginX: 0,
  interactiveMarginY: 0,

  // Only actually rendered when colorScheme/fontSizeScheme/shadowScheme resolve to "none" (the
  // default) — otherwise the group's chosen scheme overrides these. See applyButtonSchemes.
  backgroundColor: "#2563eb",
  textColor: "#ffffff",

  hoverBackgroundColor: "#1d4ed8",
  hoverTextColor: "#ffffff",

  pressedBackgroundColor: "#1e40af",
  pressedTextColor: "#ffffff",

  // "none" by default: a button keeps its own inline colors/font size/shadow until it explicitly
  // opts into a group scheme, independently for each of the three. (Rounding has no scheme/opt-in
  // — it's always the group's single universal value; see DEFAULT_GROUP_CONFIG.roundingCoefficient.)
  colorScheme: "none" as ColorSchemeTier,
  fontSizeScheme: "none" as ColorSchemeTier,
  shadowScheme: "none" as ColorSchemeTier,

  shadowCoefficient: 1,
};

/** Default colors for one named color scheme when its Workshop parameters are unconfigured. */
const DEFAULT_PRIMARY_SCHEME_COLORS: ColorSchemeColors = {
  backgroundColor: "#2563eb",
  textColor: "#ffffff",
  hoverBackgroundColor: "#1d4ed8",
  hoverTextColor: "#ffffff",
  pressedBackgroundColor: "#1e40af",
  pressedTextColor: "#ffffff",
};
const DEFAULT_SECONDARY_SCHEME_COLORS: ColorSchemeColors = {
  backgroundColor: "#64748b",
  textColor: "#ffffff",
  hoverBackgroundColor: "#475569",
  hoverTextColor: "#ffffff",
  pressedBackgroundColor: "#334155",
  pressedTextColor: "#ffffff",
};
const DEFAULT_TERTIARY_SCHEME_COLORS: ColorSchemeColors = {
  backgroundColor: "#e2e8f0",
  textColor: "#1e293b",
  hoverBackgroundColor: "#cbd5e1",
  hoverTextColor: "#1e293b",
  pressedBackgroundColor: "#94a3b8",
  pressedTextColor: "#1e293b",
};

export const DEFAULT_GROUP_CONFIG: ResolvedGroupConfig = {
  layoutMode: "joined",
  // "row" preserves the only behavior this widget had before orientation was configurable.
  orientation: "row",
  // "independent" preserves the only behavior this widget had before selectionMode was
  // configurable — every switch tracks its own active state with no relation to any other.
  selectionMode: "independent",
  customGapPx: 8,
  groupPaddingPx: 0,
  // `null` = auto-fill the widget's available height. This is the default: an author who never
  // touches buttonHeightPx (or who sets it negative, matching the *Px "reset" convention used
  // elsewhere) gets a button that fills the widget rather than a fixed 40px height.
  buttonHeightPx: null,
  buttonVerticalPaddingPx: 0,
  disabled: false,
  // Explicit paint, not just "unset" — see ResolvedGroupConfig.groupBackgroundColor.
  groupBackgroundColor: "transparent",
  colorSchemes: {
    primary: DEFAULT_PRIMARY_SCHEME_COLORS,
    secondary: DEFAULT_SECONDARY_SCHEME_COLORS,
    tertiary: DEFAULT_TERTIARY_SCHEME_COLORS,
  },
  fontSizeSchemes: {
    primary: 14,
    secondary: 14,
    tertiary: 14,
  },
  // A single universal value applied to every button, unlike the three-tier color/font/shadow
  // schemes above — see ResolvedGroupConfig.roundingCoefficient.
  roundingCoefficient: 0.2,
  // Matches DEFAULT_BUTTON_CONFIG.shadowCoefficient — a scheme's own coefficient is only actually
  // different once its Workshop parameters are configured.
  shadowSchemes: {
    primary: 1,
    secondary: 1,
    tertiary: 1,
  },
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

    // fontSizePx is a pixel dimension: a negative value resets it to the default (section on
    // negative-px-as-"undefined" below `resolvePxValue`).
    fontSizePx: resolvePxValue(
      raw.fontSizePx,
      NUMERIC_RANGES.fontSizePx.min,
      NUMERIC_RANGES.fontSizePx.max,
      DEFAULT_BUTTON_CONFIG.fontSizePx,
    ),
    // roundingCoefficient is intentionally NOT parsed from `raw` here — it's not a per-button
    // field anymore. It's always overwritten with the group's single universal value in
    // `applyButtonSchemes`; this placeholder is only what a button would render with if that step
    // were ever skipped.
    roundingCoefficient: DEFAULT_GROUP_CONFIG.roundingCoefficient,

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

    colorScheme: parseEnumValue(raw.colorScheme, COLOR_SCHEME_TIERS, DEFAULT_BUTTON_CONFIG.colorScheme),
    fontSizeScheme: parseEnumValue(
      raw.fontSizeScheme,
      COLOR_SCHEME_TIERS,
      DEFAULT_BUTTON_CONFIG.fontSizeScheme,
    ),
    shadowScheme: parseEnumValue(
      raw.shadowScheme,
      COLOR_SCHEME_TIERS,
      DEFAULT_BUTTON_CONFIG.shadowScheme,
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
 * Converts any of the button-id-array parameters (`activeButtonIdsJson`,
 * `disabledButtonIdsArray`, `hiddenButtonIdsArray` — all Workshop `array`/`subType: "string"`
 * parameters, not JSON strings) into a `Set<string>`. Missing/non-array input yields an empty
 * set; non-string entries are dropped defensively.
 */
export function toButtonIdSet(ids: readonly unknown[] | undefined): Set<string> {
  if (!Array.isArray(ids)) {
    return new Set();
  }
  return new Set(ids.filter((value): value is string => typeof value === "string"));
}

/** Converts a set of button IDs back into the plain string array Workshop's array parameters expect. */
export function activeButtonIdsToArray(ids: Set<string> | string[]): string[] {
  return Array.from(ids);
}

/**
 * Content equality for two button-id sets (order-independent), used to decide whether a
 * reconciliation against the host-provided `activeButtonIdsJson` actually changes anything — see
 * the comment on Widget.tsx's reconciliation `useEffect` for why this matters.
 */
export function areButtonIdSetsEqual(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const id of a) {
    if (!b.has(id)) {
      return false;
    }
  }
  return true;
}

/**
 * Filters out hidden buttons and merges the force-disabled overlay onto the remainder, without
 * mutating the input array or any button config object. Applies `hiddenButtonIdsArray` /
 * `disabledButtonIdsArray` (converted via `toButtonIdSet`) on top of the buttons already
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
 * Computes the initial active-button-id set from `activeButtonIdsJson` (the array parameter; if
 * present, even an empty array) or from each switch button's `defaultActive` flag otherwise
 * (when the parameter is `undefined`, i.e. never configured), restricted to known switch buttons.
 *
 * When `selectionMode` isn't `"independent"`, a group can only ever have at most one active
 * button — but the two sources above don't inherently guarantee that (buttonsJson could set
 * `defaultActive: true` on several buttons, e.g. left over from before selectionMode was turned
 * on; a host could likewise supply a stale multi-entry `activeButtonIdsJson`). In that case only
 * the *first* id — in whichever order the source above produced them (host-array order for
 * `activeButtonIdsJson`, `buttons` array order for `defaultActive`) — is kept; the rest are
 * dropped rather than rendering multiple simultaneously "selected" buttons.
 */
export function computeInitialActiveButtonIds(
  buttons: ResolvedButtonConfig[],
  activeButtonIds: readonly string[] | undefined,
  selectionMode: SelectionMode,
): Set<string> {
  const switchIds = new Set(buttons.filter((b) => b.mode === "switch").map((b) => b.id));

  let resolved: Set<string>;
  if (activeButtonIds !== undefined) {
    // Only keep IDs that refer to known switch buttons; ignore unknown IDs.
    resolved = new Set<string>();
    activeButtonIds.forEach((id) => {
      if (switchIds.has(id)) {
        resolved.add(id);
      }
    });
  } else {
    resolved = new Set<string>();
    buttons.forEach((b) => {
      if (b.mode === "switch" && b.defaultActive) {
        resolved.add(b.id);
      }
    });
  }

  if (selectionMode !== "independent" && resolved.size > 1) {
    const [first] = resolved;
    resolved = new Set(first !== undefined ? [first] : []);
  }
  return resolved;
}

/**
 * Computes the next active-button-id set after a switch button's "change" event, honoring the
 * group's `selectionMode` (see that type's doc comment for the full behavior spec):
 *
 * - `"independent"`: this button's id alone is added or removed from `current`; every other
 *   button's state is left untouched, exactly as before `selectionMode` existed.
 * - `"single"`: activating a button (`event.active === true`) replaces the *entire* set with just
 *   that button's id, deactivating every other button that was active — a classic radio-button
 *   group. Deactivating the currently active button is allowed and clears the set to empty.
 * - `"single-required"`: same radio behavior as `"single"` for activation. A deactivation
 *   (`event.active === false`) is refused — `current` is returned unchanged (as a new `Set`
 *   instance with the same content, so callers comparing by content via `areButtonIdSetsEqual`
 *   can detect the no-op) — so the group can never drop from one active button back to zero.
 *   `PalantirButton.commitActivation` already blocks the click itself from ever producing this
 *   event in the first place for a single-required group's sole active button; this function
 *   enforces the same rule defensively regardless of caller.
 */
export function computeNextActiveButtonIds(
  current: ReadonlySet<string>,
  event: { id: string; active: boolean },
  selectionMode: SelectionMode,
): Set<string> {
  if (selectionMode === "independent") {
    const next = new Set(current);
    if (event.active) {
      next.add(event.id);
    } else {
      next.delete(event.id);
    }
    return next;
  }
  if (!event.active) {
    return selectionMode === "single-required" ? new Set(current) : new Set();
  }
  return new Set([event.id]);
}

// ---------------------------------------------------------------------------
// Group-level parameter parsing
// ---------------------------------------------------------------------------

/**
 * Resolves `buttonHeightPx` to either a clamped fixed height, or `null` meaning "automatically
 * fill the available height." Unlike the other `*Px` group fields, its "reset" default isn't
 * another number — leaving it unconfigured (`undefined`) or setting it negative both mean
 * "auto-fill," matching the *Px convention that a negative value undoes a customized number, and
 * additionally treating "never configured" the same way (rather than falling back to some fixed
 * default height).
 */
export function resolveButtonHeightPx(value: unknown): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }
  return Math.min(
    NUMERIC_RANGES.buttonHeightPx.max,
    Math.max(NUMERIC_RANGES.buttonHeightPx.min, numeric),
  );
}

/** One named scheme's 6 flat color parameter values, as delivered by Workshop (e.g. `primaryBackgroundColor`). */
interface RawSchemeColorValues {
  backgroundColor?: string;
  textColor?: string;
  hoverBackgroundColor?: string;
  hoverTextColor?: string;
  pressedBackgroundColor?: string;
  pressedTextColor?: string;
}

function resolveSchemeColors(values: RawSchemeColorValues, fallback: ColorSchemeColors): ColorSchemeColors {
  return {
    backgroundColor: parseStringValue(values.backgroundColor, fallback.backgroundColor),
    textColor: parseStringValue(values.textColor, fallback.textColor),
    hoverBackgroundColor: parseStringValue(values.hoverBackgroundColor, fallback.hoverBackgroundColor),
    hoverTextColor: parseStringValue(values.hoverTextColor, fallback.hoverTextColor),
    pressedBackgroundColor: parseStringValue(values.pressedBackgroundColor, fallback.pressedBackgroundColor),
    pressedTextColor: parseStringValue(values.pressedTextColor, fallback.pressedTextColor),
  };
}

export function parseGroupConfig(values: {
  layoutMode?: string;
  orientation?: string;
  selectionMode?: string;
  customGapPx?: number;
  groupPaddingPx?: number;
  buttonHeightPx?: number;
  buttonVerticalPaddingPx?: number;
  disabled?: boolean;
  groupBackgroundColor?: string;

  primaryBackgroundColor?: string;
  primaryTextColor?: string;
  primaryHoverBackgroundColor?: string;
  primaryHoverTextColor?: string;
  primaryPressedBackgroundColor?: string;
  primaryPressedTextColor?: string;
  primaryFontSizePx?: number;

  secondaryBackgroundColor?: string;
  secondaryTextColor?: string;
  secondaryHoverBackgroundColor?: string;
  secondaryHoverTextColor?: string;
  secondaryPressedBackgroundColor?: string;
  secondaryPressedTextColor?: string;
  secondaryFontSizePx?: number;

  tertiaryBackgroundColor?: string;
  tertiaryTextColor?: string;
  tertiaryHoverBackgroundColor?: string;
  tertiaryHoverTextColor?: string;
  tertiaryPressedBackgroundColor?: string;
  tertiaryPressedTextColor?: string;
  tertiaryFontSizePx?: number;

  roundingCoefficient?: number;

  primaryShadowCoefficient?: number;
  secondaryShadowCoefficient?: number;
  tertiaryShadowCoefficient?: number;
}): ResolvedGroupConfig {
  return {
    layoutMode: parseEnumValue(
      values.layoutMode,
      ["joined", "space-between", "custom-gap"] as const satisfies readonly LayoutMode[],
      DEFAULT_GROUP_CONFIG.layoutMode,
    ),
    orientation: parseEnumValue(values.orientation, ORIENTATIONS, DEFAULT_GROUP_CONFIG.orientation),
    selectionMode: parseEnumValue(
      values.selectionMode,
      SELECTION_MODES,
      DEFAULT_GROUP_CONFIG.selectionMode,
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
    // buttonHeightPx: unconfigured or negative means "auto-fill the available height" (null);
    // otherwise clamped to the documented range. See resolveButtonHeightPx.
    buttonHeightPx: resolveButtonHeightPx(values.buttonHeightPx),
    // buttonVerticalPaddingPx is a pixel dimension, consistent with the other *Px group fields: a
    // negative value resets it to the default (0), and — critically — an explicit 0 is preserved
    // rather than falling back to the default via truthiness (0 is not null/undefined, so it
    // takes the `value` branch below, not the `fallback` one).
    buttonVerticalPaddingPx: resolvePxValue(
      values.buttonVerticalPaddingPx,
      NUMERIC_RANGES.buttonVerticalPaddingPx.min,
      NUMERIC_RANGES.buttonVerticalPaddingPx.max,
      DEFAULT_GROUP_CONFIG.buttonVerticalPaddingPx,
    ),
    disabled: parseBooleanValue(values.disabled, DEFAULT_GROUP_CONFIG.disabled),
    // Blank/unconfigured (Workshop delivers an unset string param as "") falls back to
    // "transparent" via parseStringValue, same as every other string field here.
    groupBackgroundColor: parseStringValue(
      values.groupBackgroundColor,
      DEFAULT_GROUP_CONFIG.groupBackgroundColor,
    ),
    colorSchemes: {
      primary: resolveSchemeColors(
        {
          backgroundColor: values.primaryBackgroundColor,
          textColor: values.primaryTextColor,
          hoverBackgroundColor: values.primaryHoverBackgroundColor,
          hoverTextColor: values.primaryHoverTextColor,
          pressedBackgroundColor: values.primaryPressedBackgroundColor,
          pressedTextColor: values.primaryPressedTextColor,
        },
        DEFAULT_GROUP_CONFIG.colorSchemes.primary,
      ),
      secondary: resolveSchemeColors(
        {
          backgroundColor: values.secondaryBackgroundColor,
          textColor: values.secondaryTextColor,
          hoverBackgroundColor: values.secondaryHoverBackgroundColor,
          hoverTextColor: values.secondaryHoverTextColor,
          pressedBackgroundColor: values.secondaryPressedBackgroundColor,
          pressedTextColor: values.secondaryPressedTextColor,
        },
        DEFAULT_GROUP_CONFIG.colorSchemes.secondary,
      ),
      tertiary: resolveSchemeColors(
        {
          backgroundColor: values.tertiaryBackgroundColor,
          textColor: values.tertiaryTextColor,
          hoverBackgroundColor: values.tertiaryHoverBackgroundColor,
          hoverTextColor: values.tertiaryHoverTextColor,
          pressedBackgroundColor: values.tertiaryPressedBackgroundColor,
          pressedTextColor: values.tertiaryPressedTextColor,
        },
        DEFAULT_GROUP_CONFIG.colorSchemes.tertiary,
      ),
    },
    fontSizeSchemes: {
      primary: resolvePxValue(
        values.primaryFontSizePx,
        NUMERIC_RANGES.fontSizePx.min,
        NUMERIC_RANGES.fontSizePx.max,
        DEFAULT_GROUP_CONFIG.fontSizeSchemes.primary,
      ),
      secondary: resolvePxValue(
        values.secondaryFontSizePx,
        NUMERIC_RANGES.fontSizePx.min,
        NUMERIC_RANGES.fontSizePx.max,
        DEFAULT_GROUP_CONFIG.fontSizeSchemes.secondary,
      ),
      tertiary: resolvePxValue(
        values.tertiaryFontSizePx,
        NUMERIC_RANGES.fontSizePx.min,
        NUMERIC_RANGES.fontSizePx.max,
        DEFAULT_GROUP_CONFIG.fontSizeSchemes.tertiary,
      ),
    },
    // roundingCoefficient is a unitless coefficient, not a pixel dimension, so it clamps negative
    // values up to its minimum via clampNumber rather than resetting to the default via
    // resolvePxValue — consistent with shadowCoefficient below. Unlike color/font/shadow, it's a
    // single universal value, not one per named scheme.
    roundingCoefficient: clampNumber(
      values.roundingCoefficient,
      NUMERIC_RANGES.roundingCoefficient.min,
      NUMERIC_RANGES.roundingCoefficient.max,
      DEFAULT_GROUP_CONFIG.roundingCoefficient,
    ),
    shadowSchemes: {
      primary: clampNumber(
        values.primaryShadowCoefficient,
        NUMERIC_RANGES.shadowCoefficient.min,
        NUMERIC_RANGES.shadowCoefficient.max,
        DEFAULT_GROUP_CONFIG.shadowSchemes.primary,
      ),
      secondary: clampNumber(
        values.secondaryShadowCoefficient,
        NUMERIC_RANGES.shadowCoefficient.min,
        NUMERIC_RANGES.shadowCoefficient.max,
        DEFAULT_GROUP_CONFIG.shadowSchemes.secondary,
      ),
      tertiary: clampNumber(
        values.tertiaryShadowCoefficient,
        NUMERIC_RANGES.shadowCoefficient.min,
        NUMERIC_RANGES.shadowCoefficient.max,
        DEFAULT_GROUP_CONFIG.shadowSchemes.tertiary,
      ),
    },
  };
}

/**
 * Applies each button's chosen `colorScheme` / `fontSizeScheme` / `shadowScheme` (see
 * `ButtonConfig`) onto its rendered colors, font size, and shadow coefficient — three independent
 * axes, each overriding that button's own inline field whenever its chosen scheme isn't "none"
 * (the group-level scheme always wins over a button's inline `buttonsJson` field when both are
 * present). A button with "none" for a given axis is untouched on that axis and keeps rendering
 * its own inline field exactly as before.
 *
 * Corner rounding is handled separately and unconditionally: every button always renders with the
 * group's single universal `roundingCoefficient` — there's no per-button opt-in/opt-out for it.
 *
 * Applied to `buttons` after `applyButtonVisibilityAndDisabled`, right before rendering (see
 * Widget.tsx).
 */
export function applyButtonSchemes(
  buttons: ResolvedButtonConfig[],
  groupConfig: ResolvedGroupConfig,
): ResolvedButtonConfig[] {
  return buttons.map((button) => {
    let resolved = { ...button, roundingCoefficient: groupConfig.roundingCoefficient };
    if (button.colorScheme !== "none") {
      const scheme = groupConfig.colorSchemes[button.colorScheme];
      resolved = {
        ...resolved,
        backgroundColor: scheme.backgroundColor,
        textColor: scheme.textColor,
        hoverBackgroundColor: scheme.hoverBackgroundColor,
        hoverTextColor: scheme.hoverTextColor,
        pressedBackgroundColor: scheme.pressedBackgroundColor,
        pressedTextColor: scheme.pressedTextColor,
      };
    }
    if (button.fontSizeScheme !== "none") {
      resolved = { ...resolved, fontSizePx: groupConfig.fontSizeSchemes[button.fontSizeScheme] };
    }
    if (button.shadowScheme !== "none") {
      resolved = { ...resolved, shadowCoefficient: groupConfig.shadowSchemes[button.shadowScheme] };
    }
    return resolved;
  });
}

// ---------------------------------------------------------------------------
// Corner rounding (section 16)
// ---------------------------------------------------------------------------

export function computeBorderRadiusPx(buttonHeightPx: number, roundingCoefficient: number): number {
  const clampedCoefficient = clampNumber(
    roundingCoefficient,
    NUMERIC_RANGES.roundingCoefficient.min,
    NUMERIC_RANGES.roundingCoefficient.max,
    DEFAULT_GROUP_CONFIG.roundingCoefficient,
  );
  return buttonHeightPx * clampedCoefficient;
}

/**
 * Returns the per-corner border radius (in px) for a button given its position in a joined
 * chain. In `"row"` orientation a chain runs left-to-right, so "first"/"last" round the left/
 * right corners (the classic segmented-control look); in `"column"` orientation the chain runs
 * top-to-bottom instead, so "first"/"last" round the top/bottom corners.
 */
export function computeJoinedCornerRadii(
  radiusPx: number,
  joinedPosition: JoinedPosition,
  orientation: Orientation,
): { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number } {
  if (orientation === "column") {
    switch (joinedPosition) {
      case "first":
        return { topLeft: radiusPx, topRight: radiusPx, bottomLeft: 0, bottomRight: 0 };
      case "last":
        return { bottomLeft: radiusPx, bottomRight: radiusPx, topLeft: 0, topRight: 0 };
      case "middle":
        return { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 };
      case "single":
      default:
        return { topLeft: radiusPx, topRight: radiusPx, bottomRight: radiusPx, bottomLeft: radiusPx };
    }
  }
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
 * for joined-mode margin zeroing on the interior seams between adjacent buttons. In `"row"`
 * orientation, buttons are horizontally adjacent, so the X margin is zeroed on the touching
 * side(s) while the Y margin is always kept in full. In `"column"` orientation it's the reverse:
 * buttons are vertically adjacent, so the Y margin is zeroed on the touching side(s) while the X
 * margin is always kept in full.
 */
export function computeEffectiveInteractiveMargins(
  interactiveMarginX: number,
  interactiveMarginY: number,
  joinedPosition: JoinedPosition,
  orientation: Orientation,
): { left: number; right: number; top: number; bottom: number } {
  if (orientation === "column") {
    const left = interactiveMarginX;
    const right = interactiveMarginX;
    switch (joinedPosition) {
      case "first":
        return { left, right, top: interactiveMarginY, bottom: 0 };
      case "last":
        return { left, right, top: 0, bottom: interactiveMarginY };
      case "middle":
        return { left, right, top: 0, bottom: 0 };
      case "single":
      default:
        return { left, right, top: interactiveMarginY, bottom: interactiveMarginY };
    }
  }

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

