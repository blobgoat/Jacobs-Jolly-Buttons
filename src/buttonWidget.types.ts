// Shared types for the Palantir button-group widget.
// These are internal React/data types only; they do not replace the
// Workshop-facing parameter declarations in main.config.ts.

export type ButtonMode = "momentary" | "switch";

export type IconPosition = "left" | "right";

export type BackgroundImageFit = "cover" | "contain" | "fill";

export type LayoutMode = "joined" | "space-between" | "custom-gap";

export type ButtonInteraction = "hover" | "hoverEnd" | "press" | "change";

/** Position of a button within a visually joined chain of buttons. */
export type JoinedPosition = "single" | "first" | "middle" | "last";

/** Raw, author-provided button configuration parsed from `buttonsJson`. */
export interface ButtonConfig {
  id: string;
  label: string;

  mode?: ButtonMode;
  defaultActive?: boolean;
  disabled?: boolean;

  iconSrc?: string;
  iconAlt?: string;
  iconPosition?: IconPosition;

  backgroundImageSrc?: string;
  backgroundImageFit?: BackgroundImageFit;

  fontSizePx?: number;
  roundingCoefficient?: number;

  paddingX?: number;
  paddingY?: number;

  interactiveMarginX?: number;
  interactiveMarginY?: number;

  backgroundColor?: string;
  textColor?: string;

  hoverBackgroundColor?: string;
  hoverTextColor?: string;

  pressedBackgroundColor?: string;
  pressedTextColor?: string;

  activeBackgroundColor?: string;
  activeTextColor?: string;

  disabledBackgroundColor?: string;
  disabledTextColor?: string;

  shadowCoefficient?: number;
}

/**
 * A button configuration after validation, defaulting, and clamping.
 * All optional fields from `ButtonConfig` (other than the asset URLs, which
 * are intentionally left optional/undefined when not supplied) are resolved.
 */
export interface ResolvedButtonConfig {
  id: string;
  label: string;

  mode: ButtonMode;
  defaultActive: boolean;
  disabled: boolean;

  iconSrc?: string;
  iconAlt?: string;
  iconPosition: IconPosition;

  backgroundImageSrc?: string;
  backgroundImageFit: BackgroundImageFit;

  fontSizePx: number;
  roundingCoefficient: number;

  paddingX: number;
  paddingY: number;

  interactiveMarginX: number;
  interactiveMarginY: number;

  backgroundColor: string;
  textColor: string;

  hoverBackgroundColor: string;
  hoverTextColor: string;

  pressedBackgroundColor: string;
  pressedTextColor: string;

  activeBackgroundColor: string;
  activeTextColor: string;

  disabledBackgroundColor: string;
  disabledTextColor: string;

  shadowCoefficient: number;
}

/** Resolved, widget-level (group) configuration. */
export interface ResolvedGroupConfig {
  layoutMode: LayoutMode;
  customGapPx: number;
  groupPaddingPx: number;
  buttonHeightPx: number;
  disabled: boolean;
}

/** Internal event emitted by a button up to the group, and by the group up to Widget.tsx. */
export type InternalButtonEvent =
  | { type: "hover"; id: string; active: boolean }
  | { type: "hoverEnd"; id: string; active: boolean }
  | { type: "press"; id: string; active: boolean }
  | { type: "change"; id: string; active: boolean };

export interface PalantirButtonGroupProps {
  buttons: ResolvedButtonConfig[];

  layoutMode: LayoutMode;
  customGapPx: number;
  groupPaddingPx: number;

  buttonHeightPx: number;

  disabled: boolean;
  activeButtonIds: Set<string>;

  onButtonEvent: (event: InternalButtonEvent) => void;
}

export interface PalantirButtonProps {
  config: ResolvedButtonConfig;

  active: boolean;
  groupDisabled: boolean;

  buttonHeightPx: number;

  joinedPosition: JoinedPosition;

  onEvent: (event: InternalButtonEvent) => void;
}
