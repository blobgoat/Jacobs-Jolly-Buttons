import { defineConfig } from "@osdk/widget.client";

// Updates to the widget configuration in this file require reapplying dev mode
// to preview the changes. When developing locally, open the setup URL printed
// in your terminal again. When developing in Code Workspaces, refresh the
// preview panel.

export default defineConfig({
  id: "widgetId",
  name: "Jacob's Jolly Buttons",
  description: "A configurable, responsive button group for Workshop. Supports momentary and switch buttons with per-button color/shape styling. Reports hover, press, and change events, with active-toggle state, back via output parameters.",
  type: "workshop",
  parameters: {
    // --- Input parameters ---------------------------------------------------

    // `buttonsJson` covers only the required fields. Every optional per-button field is
    // documented on its own boolean "Info on..." parameter below (Workshop caps displayName at
    // 100 characters, too short for a combined description) — their boolean value is never
    // read, they exist purely to hold documentation text.
    buttonsJson: {
      displayName:
        "Buttons: JSON array of objects. Required: id, label. See Info toggles below for " +
        "other fields.",
      type: "string",
    },

    infoOnModeState: {
      displayName:
        'Info: mode, defaultActive, disabled (bool). No icons — use an emoji in label, e.g. ' +
        '"🌍 Africa".',
      type: "boolean",
    },
    infoOnFontRounding: {
      displayName: "Info: fontSizePx (px, default 14) — used only when fontSizeScheme is none.",
      type: "boolean",
    },
    infoOnPadding: {
      displayName:
        "Info: paddingX/Y (14/8 default) label spacing; interactiveMarginX/Y (0/0) extra " +
        "hit-area — both px.",
      type: "boolean",
    },
    infoOnPxReset: {
      displayName: "Info: for any *Px field above, a negative number resets it to its default value.",
      type: "boolean",
    },
    infoOnColorScheme: {
      displayName: "Info: colorScheme (primary|secondary|tertiary|none, default none) picks a color scheme.",
      type: "boolean",
    },
    infoOnFontSizeScheme: {
      displayName: "Info: fontSizeScheme (primary|secondary|tertiary|none, default none) picks a font size.",
      type: "boolean",
    },
    infoOnShadowScheme: {
      displayName: "Info: shadowScheme (primary|secondary|tertiary|none, default none) picks a shadow depth.",
      type: "boolean",
    },
    infoOnColorsBase: {
      displayName:
        "Info: background/textColor (default look), hover*Color (hover look) — used when " +
        "colorScheme is none.",
      type: "boolean",
    },
    infoOnColorsPressed: {
      displayName:
        "Info: pressed*Color = pressed/active look, used when colorScheme is none. " +
        "Disabled buttons fade.",
      type: "boolean",
    },
    infoOnShadow: {
      displayName:
        "Info: shadowCoefficient (0-4, default 1) — shadow/press depth, used only when " +
        "shadowScheme is none.",
      type: "boolean",
    },

    layoutMode: {
      displayName: "Layout mode (joined | space-between | custom-gap)",
      type: "string",
    },
    customGapPx: {
      displayName: "Custom gap (px) — negative resets to default (8)",
      type: "number",
    },
    groupPaddingPx: {
      displayName: "Group padding (px) — negative resets to default (0)",
      type: "number",
    },
    buttonHeightPx: {
      displayName:
        "Button height (px, clamped 240) — blank or negative to fill " +
        "available height",
      type: "number",
    },
    buttonVerticalPaddingPx: {
      displayName:
        "Button vertical padding — only vertical layout space placed " +
        "above and below each button.",
      type: "number",
    },

    // --- Color, font-size & shadow schemes, plus universal rounding ------------
    // 3 named schemes (color, font size, shadow), each button opts into one independently per
    // axis via its own colorScheme/fontSizeScheme/shadowScheme field (see the matching infoOn...
    // toggles above) — each defaults to "none" (keeps that button's own inline field). A scheme
    // other than "none" always overrides that button's own inline field in buttonsJson; there's
    // no separate "active" color (it reuses pressed) or "disabled" color (always the default
    // look, faded) entry. Corner rounding is NOT part of this scheme system — see
    // roundingCoefficient below, a single value that always applies to every button.
    primaryBackgroundColor: {
      displayName: 'Primary scheme: background color (string, e.g. "#2563eb")',
      type: "string",
    },
    primaryTextColor: {
      displayName: "Primary scheme: text color",
      type: "string",
    },
    primaryHoverBackgroundColor: {
      displayName: "Primary scheme: hover background color",
      type: "string",
    },
    primaryHoverTextColor: {
      displayName: "Primary scheme: hover text color",
      type: "string",
    },
    primaryPressedBackgroundColor: {
      displayName: "Primary scheme: pressed/active background color",
      type: "string",
    },
    primaryPressedTextColor: {
      displayName: "Primary scheme: pressed/active text color",
      type: "string",
    },
    primaryFontSizePx: {
      displayName: "Primary scheme: font size (px, 8-48, negative resets to default 14)",
      type: "number",
    },

    secondaryBackgroundColor: {
      displayName: "Secondary scheme: background color",
      type: "string",
    },
    secondaryTextColor: {
      displayName: "Secondary scheme: text color",
      type: "string",
    },
    secondaryHoverBackgroundColor: {
      displayName: "Secondary scheme: hover background color",
      type: "string",
    },
    secondaryHoverTextColor: {
      displayName: "Secondary scheme: hover text color",
      type: "string",
    },
    secondaryPressedBackgroundColor: {
      displayName: "Secondary scheme: pressed/active background color",
      type: "string",
    },
    secondaryPressedTextColor: {
      displayName: "Secondary scheme: pressed/active text color",
      type: "string",
    },
    secondaryFontSizePx: {
      displayName: "Secondary scheme: font size (px, 8-48, negative resets to default 14)",
      type: "number",
    },

    tertiaryBackgroundColor: {
      displayName: "Tertiary scheme: background color",
      type: "string",
    },
    tertiaryTextColor: {
      displayName: "Tertiary scheme: text color",
      type: "string",
    },
    tertiaryHoverBackgroundColor: {
      displayName: "Tertiary scheme: hover background color",
      type: "string",
    },
    tertiaryHoverTextColor: {
      displayName: "Tertiary scheme: hover text color",
      type: "string",
    },
    tertiaryPressedBackgroundColor: {
      displayName: "Tertiary scheme: pressed/active background color",
      type: "string",
    },
    tertiaryPressedTextColor: {
      displayName: "Tertiary scheme: pressed/active text color",
      type: "string",
    },
    tertiaryFontSizePx: {
      displayName: "Tertiary scheme: font size (px, 8-48, negative resets to default 14)",
      type: "number",
    },

    // roundingCoefficient/shadowCoefficient are unitless coefficients (not px), so — unlike the
    // *Px fields above — a negative value here clamps up to the minimum rather than resetting to
    // the default; see infoOnPxReset (which applies only to *Px fields) vs. these.
    //
    // Corner rounding is universal, not tiered like color/font size/shadow: this single
    // roundingCoefficient always applies to every button in the group.
    roundingCoefficient: {
      displayName: "Corner rounding coefficient for every button (0-0.5, default 0.2)",
      type: "number",
    },
    primaryShadowCoefficient: {
      displayName: "Primary scheme: shadow/press depth coefficient (0-4, default 1)",
      type: "number",
    },
    secondaryShadowCoefficient: {
      displayName: "Secondary scheme: shadow/press depth coefficient (0-4, default 1)",
      type: "number",
    },
    tertiaryShadowCoefficient: {
      displayName: "Tertiary scheme: shadow/press depth coefficient (0-4, default 1)",
      type: "number",
    },

    disabled: {
      displayName: "Disabled",
      type: "boolean",
    },
    disabledButtonIdsArray: {
      displayName: 'Force-disabled button IDs',
      type: "array",
      subType: "string",
    },
    infoOnDisabledButtonIds: {
      displayName:
        "Info: disabledButtonIdsArray combines with each button's own \"disabled\" field; " +
        "never re-enables.",
      type: "boolean",
    },
    hiddenButtonIdsArray: {
      displayName:
        'Hidden button IDs. Not rendered but states are saved though.',
      type: "array",
      subType: "string",
    },
    infoOnHiddenButtonIds: {
      displayName:
        "Info: a hidden switch's active state is preserved and restored once it's un-hidden.",
      type: "boolean",
    },

    // --- Bridge / output parameters ------------------------------------------
    lastButtonId: {
      displayName: "Last button ID",
      type: "string",
    },
    lastButtonInteraction: {
      displayName: "Last button interaction (hover | hoverEnd | press | unpress | change)",
      type: "string",
    },
    lastButtonActive: {
      displayName: "Last button active",
      type: "boolean",
    },
    activeButtonIdsJson: {
      displayName: "Active button IDs",
      type: "array",
      subType: "string",  // can be "string", "number", "boolean", "date", or "timestamp"
    },
  },
  events: {
    buttonHovered: {
      displayName: "Button hovered",
      parameterUpdateIds: ["lastButtonId", "lastButtonInteraction", "lastButtonActive"],
    },
    buttonHoverEnded: {
      displayName: "Button hover ended",
      parameterUpdateIds: ["lastButtonId", "lastButtonInteraction", "lastButtonActive"],
    },
    buttonPressed: {
      displayName: "Button pressed (momentary activation, or a switch becoming selected)",
      parameterUpdateIds: ["lastButtonId", "lastButtonInteraction", "lastButtonActive"],
    },
    buttonUnpressed: {
      displayName: "Button unpressed (a switch becoming unselected)",
      parameterUpdateIds: ["lastButtonId", "lastButtonInteraction", "lastButtonActive"],
    },
    buttonChanged: {
      displayName: "Button changed",
      parameterUpdateIds: [
        "lastButtonId",
        "lastButtonInteraction",
        "lastButtonActive",
        "activeButtonIdsJson",
      ],
    },
  },
});
