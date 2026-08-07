// Shared types for the Palantir button-group widget.
// These are internal React/data types only; they do not replace the
// Workshop-facing parameter declarations in main.config.ts.

export type ButtonMode = "momentary" | "switch";

export type LayoutMode = "joined" | "space-between" | "custom-gap";

/**
 * Which direction the button group stacks in. `"row"` (the default) lays buttons out
 * horizontally, side by side, exactly as before this was configurable. `"column"` stacks them
 * vertically instead — see `PalantirButtonGroup`'s `containerStyle` for how layout sizing
 * differs between the two (row stays bounded to the widget's available height and shares that
 * height/width evenly; column is content-sized and grows/"extends" with however many buttons
 * there are, scrolling if it doesn't fit — see Widget.tsx's outer container). `layoutMode`'s
 * three values (`joined`/`custom-gap`/`space-between`) apply along whichever axis this is set
 * to — e.g. `joined` seam corners round top/bottom in column mode instead of left/right.
 */
export type Orientation = "row" | "column";

/**
 * How the group's switch buttons' active state relates to each other. Only affects switch-mode
 * buttons — momentary buttons have no persistent active state and are unaffected either way.
 *
 * - `"independent"` (the default): every switch tracks its own active state independently,
 *   exactly as before this was configurable — any number of switches (including all of them, or
 *   none) can be active at once.
 * - `"single"`: a classic radio-button group. Activating a switch deactivates every other active
 *   switch in the group, so at most one is ever active at a time. Deactivating the currently
 *   active switch (clicking it again) is still allowed and brings the group back to zero active,
 *   the same as `"independent"`.
 * - `"single-required"`: the same radio behavior as `"single"`, except the group is never allowed
 *   to drop from one active switch back down to zero — once any switch is active (whether from a
 *   click or from a button's own `defaultActive`), clicking it again to deactivate it is refused;
 *   the only way to change the selection is to activate a *different* switch instead. The group
 *   can still start out with zero active switches (when nothing configures `defaultActive` and
 *   the host hasn't supplied `activeButtonIdsJson`) — that's the one state this doesn't guard,
 *   since nothing has ever been activated yet. See `computeNextActiveButtonIds` (where a
 *   deactivation is refused) and `PalantirButton.commitActivation` (which blocks the click itself
 *   from ever firing that deactivation, so the button never gets stuck showing the wrong state).
 */
export type SelectionMode = "independent" | "single" | "single-required";

export type ButtonInteraction = "hover" | "hoverEnd" | "press" | "unpress" | "change";

/** One of the group's three named schemes (color, font size, or shadow), or "none" to opt out. */
export type ColorSchemeName = "primary" | "secondary" | "tertiary";

/**
 * Which scheme a button uses for one particular axis (color, font size, or shadow — each picked
 * independently, see `ButtonConfig.colorScheme`/`fontSizeScheme`/`shadowScheme`). "none" opts the
 * button out for that axis, falling back to its own inline field in `buttonsJson`
 * (`backgroundColor`, `fontSizePx`, `shadowCoefficient`, etc.) instead of one of the group's three
 * named schemes. See `ResolvedGroupConfig`'s `colorSchemes`/`fontSizeSchemes`/`shadowSchemes` and
 * `applyButtonSchemes`. (Corner rounding is not part of this scheme system — it's a single
 * universal group-level setting; see `ResolvedGroupConfig.roundingCoefficient`.)
 */
export type ColorSchemeTier = ColorSchemeName | "none";

/**
 * The six colors that make up one named color scheme: a default (unpressed/resting) look, a
 * hover look, and a pressed look, each as a background/text pair. There is no separate "active"
 * entry — a switch that's active reuses the pressed colors (it's meant to look "pushed in," the
 * same as a momentary button mid-press) — and no separate "disabled" entry — a disabled button
 * always uses the default look at reduced opacity instead of a distinct color. See
 * `PalantirButton.tsx`'s color `useMemo` and `DISABLED_OPACITY`.
 */
export interface ColorSchemeColors {
  backgroundColor: string;
  textColor: string;
  hoverBackgroundColor: string;
  hoverTextColor: string;
  pressedBackgroundColor: string;
  pressedTextColor: string;
}

/** Position of a button within a visually joined chain of buttons. */
export type JoinedPosition = "single" | "first" | "middle" | "last";

/** Raw, author-provided button configuration parsed from `buttonsJson`. */
export interface ButtonConfig {
  id: string;
  label: string;

  mode?: ButtonMode;
  defaultActive?: boolean;
  disabled?: boolean;

  // Only takes effect when fontSizeScheme below is "none" — otherwise the group-level scheme's
  // font size overrides it. See `fontSizeScheme`.
  fontSizePx?: number;

  paddingX?: number;
  paddingY?: number;

  interactiveMarginX?: number;
  interactiveMarginY?: number;

  // Only take effect when the corresponding scheme field below is "none" — otherwise the
  // group-level scheme's colors/font size override these. See `colorScheme` / `fontSizeScheme`.
  backgroundColor?: string;
  textColor?: string;

  hoverBackgroundColor?: string;
  hoverTextColor?: string;

  pressedBackgroundColor?: string;
  pressedTextColor?: string;

  /**
   * Which of the group's three named color schemes this button uses for its background/text
   * colors (default/hover/pressed, and — reusing the pressed colors — active). Defaults to
   * "none" when unset, which keeps this button's own inline color fields above. Set to
   * "primary"/"secondary"/"tertiary" to opt in — a scheme other than "none" always overrides
   * those inline fields, even if they're also set.
   */
  colorScheme?: ColorSchemeTier;

  /**
   * Which of the group's three named font sizes this button uses. Defaults to "none" when
   * unset, which keeps this button's own `fontSizePx`. Set to "primary"/"secondary"/"tertiary" to
   * opt in — a scheme other than "none" always overrides `fontSizePx`, even if it's also set.
   * Independent of `colorScheme` — a button can mix, e.g., secondary colors with the tertiary
   * font size.
   */
  fontSizeScheme?: ColorSchemeTier;

  // Only takes effect when shadowScheme below is "none" — otherwise the group-level scheme's
  // shadow coefficient overrides it. See `shadowScheme`.
  shadowCoefficient?: number;

  /**
   * Which of the group's three named shadow coefficients this button uses. Defaults to "none"
   * when unset, which keeps this button's own `shadowCoefficient`. Set to
   * "primary"/"secondary"/"tertiary" to opt in — a scheme other than "none" always overrides
   * `shadowCoefficient`, even if it's also set. Independent of the other three scheme fields.
   */
  shadowScheme?: ColorSchemeTier;
}

/**
 * A button configuration after validation, defaulting, and clamping.
 * All optional fields from `ButtonConfig` are resolved.
 */
export interface ResolvedButtonConfig {
  id: string;
  label: string;

  mode: ButtonMode;
  defaultActive: boolean;
  disabled: boolean;

  // Only actually rendered when fontSizeScheme resolves to "none" (the default) — otherwise the
  // group's chosen scheme overrides it. See `applyButtonSchemes`.
  fontSizePx: number;
  // Always the group's single universal rounding coefficient — not part of the scheme system and
  // not configurable per button. See `ResolvedGroupConfig.roundingCoefficient`.
  roundingCoefficient: number;

  paddingX: number;
  paddingY: number;

  interactiveMarginX: number;
  interactiveMarginY: number;

  // These four hold this button's OWN inline colors — only actually used for rendering when
  // colorScheme is "none" (the default). When colorScheme resolves to a named scheme instead,
  // `applyButtonSchemes` overwrites these with that scheme's colors before this config reaches
  // PalantirButton, and PalantirButton itself always just renders whatever ends up here.
  backgroundColor: string;
  textColor: string;

  hoverBackgroundColor: string;
  hoverTextColor: string;

  pressedBackgroundColor: string;
  pressedTextColor: string;

  colorScheme: ColorSchemeTier;
  fontSizeScheme: ColorSchemeTier;
  shadowScheme: ColorSchemeTier;

  // Only actually rendered when shadowScheme resolves to "none" (the default) — otherwise the
  // group's chosen scheme overrides it. See `applyButtonSchemes`.
  shadowCoefficient: number;
}

/** Resolved, widget-level (group) configuration. */
export interface ResolvedGroupConfig {
  layoutMode: LayoutMode;
  /** See `Orientation`. Defaults to `"row"`. */
  orientation: Orientation;
  /** See `SelectionMode`. Defaults to `"independent"`. */
  selectionMode: SelectionMode;
  customGapPx: number;
  groupPaddingPx: number;
  /**
   * Fixed visible-button height in px, or `null` to automatically fill whatever vertical space
   * is actually available (buttons equally sharing, and growing to fill, the bounded group) —
   * `null` results from the parameter being left unconfigured or set to a negative number, see
   * `resolveButtonHeightPx`. Applies along whichever axis `orientation` makes the "main" one: the
   * row's width in `"row"` orientation (unchanged from before orientation existed), or the
   * stack's height in `"column"` orientation. A fixed number in `"column"` orientation is also
   * what lets the stack "extend" past the widget's own available height instead of being
   * squeezed to fit — see `PalantirButtonGroup`'s class-level doc comment.
   */
  buttonHeightPx: number | null;
  /**
   * Vertical layout space (px) placed above and below every button, outside the visible button's
   * exact height. Does not add horizontal space and does not change any button's internal
   * padding — see `paddingX`/`paddingY` for that.
   */
  buttonVerticalPaddingPx: number;
  disabled: boolean;
  /**
   * Explicit CSS background paint for the group's own container — the box behind/around the
   * buttons, inside the group's padding — resolved from the `groupBackgroundColor` Workshop
   * parameter. Defaults to `"transparent"` when unconfigured. This is deliberately an explicit
   * painted value applied inline on the container (see Widget.tsx), not just "leave it unset" —
   * an unset background can still end up painted by something further up the ancestor chain (or,
   * per Foundry/Workshop's own embedding, some rendering quirk outside this widget's control);
   * an explicit `"transparent"` here always wins regardless of what the real cause of that is.
   */
  groupBackgroundColor: string;
  /**
   * The group's three named color schemes ("primary", "secondary", "tertiary"), each resolved
   * from 6 flat Workshop parameters (e.g. `primaryBackgroundColor`, `primaryHoverTextColor`, ...).
   * A button picks one via its own `colorScheme` field (`ButtonConfig.colorScheme`) — see
   * `applyButtonSchemes`, which is what actually applies a button's chosen scheme onto its
   * rendered colors.
   */
  colorSchemes: Record<ColorSchemeName, ColorSchemeColors>;
  /**
   * The group's three named font sizes (px), one per scheme name, resolved from
   * `primaryFontSizePx` / `secondaryFontSizePx` / `tertiaryFontSizePx`. A button picks one via its
   * own `fontSizeScheme` field, independent of the other three scheme fields — see
   * `applyButtonSchemes`.
   */
  fontSizeSchemes: Record<ColorSchemeName, number>;
  /**
   * A single universal corner-rounding coefficient (0-0.5, default 0.2) applied to every button
   * in the group, resolved from the one `roundingCoefficient` Workshop parameter. Unlike
   * color/font size/shadow, rounding is not part of the three-tier scheme system — there's only
   * one group-wide value, and it always applies to every button (no per-button opt-out). See
   * `applyButtonSchemes`.
   */
  roundingCoefficient: number;
  /**
   * The group's three named shadow coefficients, one per scheme name, resolved from
   * `primaryShadowCoefficient` / `secondaryShadowCoefficient` / `tertiaryShadowCoefficient`. A
   * button picks one via its own `shadowScheme` field, independent of the other three scheme
   * fields — see `applyButtonSchemes`.
   */
  shadowSchemes: Record<ColorSchemeName, number>;
}

/**
 * Internal event emitted by a button up to the group, and by the group up to Widget.tsx.
 *
 * For a switch button, `press` fires only when the toggle results in the button becoming
 * active ("selected"); `unpress` fires only when it results in the button becoming inactive
 * ("deselected"). `change` still fires on every toggle either way (carrying the resulting
 * `active` value) and remains the source of truth for persisted active state. A momentary
 * button has no persistent active state, so it always fires `press` on activation and never
 * fires `unpress`.
 */
export type InternalButtonEvent =
  | { type: "hover"; id: string; active: boolean }
  | { type: "hoverEnd"; id: string; active: boolean }
  | { type: "press"; id: string; active: boolean }
  | { type: "unpress"; id: string; active: boolean }
  | { type: "change"; id: string; active: boolean };

export interface PalantirButtonGroupProps {
  buttons: ResolvedButtonConfig[];

  layoutMode: LayoutMode;
  orientation: Orientation;
  selectionMode: SelectionMode;
  customGapPx: number;
  groupPaddingPx: number;

  buttonHeightPx: number | null;
  buttonVerticalPaddingPx: number;

  disabled: boolean;
  activeButtonIds: Set<string>;

  onButtonEvent: (event: InternalButtonEvent) => void;
}

export interface PalantirButtonProps {
  config: ResolvedButtonConfig;

  active: boolean;
  groupDisabled: boolean;

  buttonHeightPx: number | null;
  orientation: Orientation;
  selectionMode: SelectionMode;

  joinedPosition: JoinedPosition;

  onEvent: (event: InternalButtonEvent) => void;
}
