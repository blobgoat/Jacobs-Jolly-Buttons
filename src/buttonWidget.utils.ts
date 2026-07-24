import type {
  BackgroundImageFit,
  ButtonCollapseMode,
  ButtonMode,
  CollapseStrategy,
  GroupCollapseMode,
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
  collapsePriority: { min: -1000, max: 1000 },
  shadowCoefficient: { min: 0, max: 4 },
  customGapPx: { min: 0, max: 128 },
  groupPaddingPx: { min: 0, max: 128 },
  buttonHeightPx: { min: 28, max: 96 },
  tooltipDelayMs: { min: 0, max: 2000 },
} as const;

export const DEFAULT_BUTTON_CONFIG = {
  mode: "momentary" as ButtonMode,
  defaultActive: false,
  disabled: false,

  iconPosition: "left" as IconPosition,

  backgroundImageFit: "cover" as BackgroundImageFit,

  collapseMode: "auto" as ButtonCollapseMode,
  collapsePriority: 0,

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
  collapseMode: "auto",
  collapseStrategy: "priority",
  buttonHeightPx: 40,
  tooltipDelayMs: 300,
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
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
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
}

export const INVALID_JSON_MESSAGE = "The button configuration is not valid JSON.";
export const NO_VALID_BUTTONS_MESSAGE = "No valid buttons are configured.";

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

    collapseMode: parseEnumValue(
      raw.collapseMode,
      ["auto", "always", "never"] as const,
      DEFAULT_BUTTON_CONFIG.collapseMode,
    ),
    collapsePriority: clampNumber(
      raw.collapsePriority,
      NUMERIC_RANGES.collapsePriority.min,
      NUMERIC_RANGES.collapsePriority.max,
      DEFAULT_BUTTON_CONFIG.collapsePriority,
    ),

    fontSizePx: clampNumber(
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

    paddingX: clampNumber(
      raw.paddingX,
      NUMERIC_RANGES.paddingX.min,
      NUMERIC_RANGES.paddingX.max,
      DEFAULT_BUTTON_CONFIG.paddingX,
    ),
    paddingY: clampNumber(
      raw.paddingY,
      NUMERIC_RANGES.paddingY.min,
      NUMERIC_RANGES.paddingY.max,
      DEFAULT_BUTTON_CONFIG.paddingY,
    ),

    interactiveMarginX: clampNumber(
      raw.interactiveMarginX,
      NUMERIC_RANGES.interactiveMarginX.min,
      NUMERIC_RANGES.interactiveMarginX.max,
      DEFAULT_BUTTON_CONFIG.interactiveMarginX,
    ),
    interactiveMarginY: clampNumber(
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
 * Parses and validates `buttonsJson` into an array of resolved button
 * configurations. Invalid entries are skipped rather than throwing.
 */
export function parseButtonsJson(json: string): ParsedButtonsResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    console.warn("[PalantirButtonGroup] buttonsJson is not valid JSON.");
    return { buttons: [], parseError: INVALID_JSON_MESSAGE };
  }

  if (!Array.isArray(raw)) {
    console.warn("[PalantirButtonGroup] buttonsJson must be a JSON array.");
    return { buttons: [], parseError: INVALID_JSON_MESSAGE };
  }

  const seenIds = new Set<string>();
  const buttons: ResolvedButtonConfig[] = [];

  raw.forEach((entry, index) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      console.warn(
        `[PalantirButtonGroup] Skipping button entry at index ${index}: expected an object.`,
      );
      return;
    }

    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    const label = typeof record.label === "string" ? record.label.trim() : "";

    if (!id) {
      console.warn(
        `[PalantirButtonGroup] Skipping button entry at index ${index}: missing a non-empty "id".`,
      );
      return;
    }

    if (!label) {
      console.warn(
        `[PalantirButtonGroup] Skipping button "${id}": missing a non-empty "label".`,
      );
      return;
    }

    if (seenIds.has(id)) {
      console.warn(`[PalantirButtonGroup] Skipping duplicate button id "${id}".`);
      return;
    }

    seenIds.add(id);
    buttons.push(resolveButtonConfig(id, label, record));
  });

  return { buttons, parseError: null };
}

/** Parses `activeButtonIdsJson` into a set of string IDs. Invalid input yields an empty set. */
export function parseActiveButtonIdsJson(json: string | undefined): Set<string> {
  if (!json) {
    return new Set();
  }
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set();
  }
}

export function serializeActiveButtonIds(ids: Set<string> | string[]): string {
  return JSON.stringify(Array.from(ids));
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
  const parsed = parseActiveButtonIdsJson(activeButtonIdsJson);

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
  collapseMode?: string;
  collapseStrategy?: string;
  buttonHeightPx?: number;
  tooltipDelayMs?: number;
  disabled?: boolean;
}): ResolvedGroupConfig {
  return {
    layoutMode: parseEnumValue(
      values.layoutMode,
      ["joined", "space-between", "custom-gap"] as const satisfies readonly LayoutMode[],
      DEFAULT_GROUP_CONFIG.layoutMode,
    ),
    customGapPx: clampNumber(
      values.customGapPx,
      NUMERIC_RANGES.customGapPx.min,
      NUMERIC_RANGES.customGapPx.max,
      DEFAULT_GROUP_CONFIG.customGapPx,
    ),
    groupPaddingPx: clampNumber(
      values.groupPaddingPx,
      NUMERIC_RANGES.groupPaddingPx.min,
      NUMERIC_RANGES.groupPaddingPx.max,
      DEFAULT_GROUP_CONFIG.groupPaddingPx,
    ),
    collapseMode: parseEnumValue(
      values.collapseMode,
      ["auto", "always", "never"] as const satisfies readonly GroupCollapseMode[],
      DEFAULT_GROUP_CONFIG.collapseMode,
    ),
    collapseStrategy: parseEnumValue(
      values.collapseStrategy,
      ["priority", "all-at-once"] as const satisfies readonly CollapseStrategy[],
      DEFAULT_GROUP_CONFIG.collapseStrategy,
    ),
    buttonHeightPx: clampNumber(
      values.buttonHeightPx,
      NUMERIC_RANGES.buttonHeightPx.min,
      NUMERIC_RANGES.buttonHeightPx.max,
      DEFAULT_GROUP_CONFIG.buttonHeightPx,
    ),
    tooltipDelayMs: clampNumber(
      values.tooltipDelayMs,
      NUMERIC_RANGES.tooltipDelayMs.min,
      NUMERIC_RANGES.tooltipDelayMs.max,
      DEFAULT_GROUP_CONFIG.tooltipDelayMs,
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

// ---------------------------------------------------------------------------
// Responsive collapse measurement (sections 22-25)
// ---------------------------------------------------------------------------

/** Approximate pixel width of a single character at a given font size. */
const CHAR_WIDTH_FACTOR = 0.6;
const ICON_LABEL_GAP_PX = 6;

export function estimateLabelWidthPx(label: string, fontSizePx: number): number {
  return Math.ceil(label.length * fontSizePx * CHAR_WIDTH_FACTOR);
}

/** Estimates the expanded (non-collapsed) visual-surface width of a button, in px. */
export function estimateExpandedVisualWidthPx(
  config: ResolvedButtonConfig,
  hasIcon: boolean,
  buttonHeightPx: number,
): number {
  const iconSize = hasIcon ? Math.round(buttonHeightPx * 0.6) : 0;
  const iconAllowance = hasIcon ? iconSize + ICON_LABEL_GAP_PX : 0;
  const labelWidth = estimateLabelWidthPx(config.label, config.fontSizePx);
  return config.paddingX * 2 + iconAllowance + labelWidth;
}

export interface CollapseInputButton {
  config: ResolvedButtonConfig;
  hasIcon: boolean;
}

/** Computes the total required width (px) of the group given a set of collapsed button IDs. */
export function computeRequiredGroupWidthPx(
  buttons: CollapseInputButton[],
  collapsedIds: ReadonlySet<string>,
  layoutMode: LayoutMode,
  customGapPx: number,
  buttonHeightPx: number,
): number {
  const total = buttons.length;
  if (total === 0) {
    return 0;
  }

  let sum = 0;
  buttons.forEach(({ config, hasIcon }, index) => {
    const visualWidth = collapsedIds.has(config.id)
      ? buttonHeightPx
      : estimateExpandedVisualWidthPx(config, hasIcon, buttonHeightPx);

    const joinedPosition = computeJoinedPosition(index, total, layoutMode);
    const margins = computeEffectiveInteractiveMargins(
      config.interactiveMarginX,
      config.interactiveMarginY,
      joinedPosition,
    );

    sum += visualWidth + margins.left + margins.right;
  });

  const gapCount = Math.max(0, total - 1);
  const gapPx = layoutMode === "custom-gap" ? Math.max(0, customGapPx) : layoutMode === "joined" ? 0 : 0;
  sum += gapCount * gapPx;

  return sum;
}

export const COLLAPSE_BUFFER_PX = 8;
export const EXPAND_BUFFER_PX = 16;

export interface CollapseCandidate {
  id: string;
  collapsePriority: number;
  index: number;
}

/** Deterministic collapse order for the "priority" strategy (section 24). */
export function sortByCollapseOrder(candidates: CollapseCandidate[]): CollapseCandidate[] {
  return [...candidates].sort((a, b) => {
    if (a.collapsePriority !== b.collapsePriority) {
      return a.collapsePriority - b.collapsePriority;
    }
    // Equal priority: the button later in the array collapses first.
    return b.index - a.index;
  });
}

export interface CollapsePlanResult {
  collapsedIds: Set<string>;
  overflow: boolean;
}

/**
 * Computes which auto-eligible buttons should be collapsed, given the current collapsed set,
 * the available width, and the selected collapse strategy. Applies hysteresis buffers to avoid
 * flicker (section 25).
 */
export function computeCollapsePlan(options: {
  buttons: CollapseInputButton[];
  autoEligibleIds: Set<string>;
  forcedCollapsedIds: Set<string>;
  currentCollapsedAutoIds: Set<string>;
  availableWidthPx: number;
  layoutMode: LayoutMode;
  customGapPx: number;
  buttonHeightPx: number;
  collapseStrategy: CollapseStrategy;
}): CollapsePlanResult {
  const {
    buttons,
    autoEligibleIds,
    forcedCollapsedIds,
    currentCollapsedAutoIds,
    availableWidthPx,
    layoutMode,
    customGapPx,
    buttonHeightPx,
    collapseStrategy,
  } = options;

  const widthFor = (autoCollapsed: ReadonlySet<string>): number => {
    const merged = new Set<string>(forcedCollapsedIds);
    autoCollapsed.forEach((id) => merged.add(id));
    return computeRequiredGroupWidthPx(buttons, merged, layoutMode, customGapPx, buttonHeightPx);
  };

  const candidates: CollapseCandidate[] = buttons
    .filter(({ config }) => autoEligibleIds.has(config.id))
    .map(({ config }, index) => ({ id: config.id, collapsePriority: config.collapsePriority, index }));

  if (candidates.length === 0) {
    const width = widthFor(new Set());
    return { collapsedIds: new Set(), overflow: width > availableWidthPx };
  }

  const collapseOrder = sortByCollapseOrder(candidates);

  if (collapseStrategy === "all-at-once") {
    const allCollapsed = new Set(candidates.map((c) => c.id));
    const currentlyAllCollapsed = candidates.every((c) => currentCollapsedAutoIds.has(c.id));

    if (currentlyAllCollapsed) {
      // Consider restoring all at once.
      const expandedWidth = widthFor(new Set());
      if (expandedWidth <= availableWidthPx - EXPAND_BUFFER_PX) {
        return { collapsedIds: new Set(), overflow: false };
      }
      return { collapsedIds: allCollapsed, overflow: widthFor(allCollapsed) > availableWidthPx };
    }

    const expandedWidth = widthFor(new Set());
    if (expandedWidth > availableWidthPx - COLLAPSE_BUFFER_PX) {
      return { collapsedIds: allCollapsed, overflow: widthFor(allCollapsed) > availableWidthPx };
    }
    return { collapsedIds: new Set(), overflow: false };
  }

  // Priority strategy.
  let collapsed = new Set(currentCollapsedAutoIds);

  // Try to restore buttons (in reverse collapse order = last collapsed restored first).
  const expandOrder = [...collapseOrder].reverse();
  for (const candidate of expandOrder) {
    if (!collapsed.has(candidate.id)) {
      continue;
    }
    const trial = new Set(collapsed);
    trial.delete(candidate.id);
    if (widthFor(trial) <= availableWidthPx - EXPAND_BUFFER_PX) {
      collapsed = trial;
    }
  }

  // Collapse further buttons if the group still does not fit.
  for (const candidate of collapseOrder) {
    if (widthFor(collapsed) <= availableWidthPx - COLLAPSE_BUFFER_PX) {
      break;
    }
    collapsed.add(candidate.id);
  }

  const finalWidth = widthFor(collapsed);
  const allCollapsed = candidates.every((c) => collapsed.has(c.id));
  const overflow = allCollapsed && finalWidth > availableWidthPx;

  return { collapsedIds: collapsed, overflow };
}
