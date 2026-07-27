import { defineConfig } from "@osdk/widget.client";

// Updates to the widget configuration in this file require reapplying dev mode
// to preview the changes. When developing locally, open the setup URL printed
// in your terminal again. When developing in Code Workspaces, refresh the
// preview panel.

export default defineConfig({
  id: "widgetId",
  name: "Jacob's Jolly Buttons",
  description: "A configurable, responsive button group for Workshop. Supports momentary and switch buttons, icons/background images, and per-button color/shape styling. Reports hover, press, and change events, with active-toggle state, back via output parameters.",
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
        'Info: mode ("momentary"|"switch"), defaultActive (bool, switch only), disabled (bool).',
      type: "boolean",
    },
    infoOnIcon: {
      displayName:
        'Info: iconSrc (URL), iconAlt (alt text), iconPosition ("left"|"right", default "left").',
      type: "boolean",
    },
    infoOnBgImage: {
      displayName:
        'Info: backgroundImageSrc (URL), backgroundImageFit ("cover"|"contain"|"fill", ' +
        'default "cover").',
      type: "boolean",
    },
    infoOnFontRounding: {
      displayName:
        "Info: fontSizePx (px, default 14), roundingCoefficient (0-0.5, default 0.2, corner " +
        "radius).",
      type: "boolean",
    },
    infoOnPadding: {
      displayName:
        "Info: paddingX (px, default 14), paddingY (px, default 8) — inner spacing around " +
        "label/icon.",
      type: "boolean",
    },
    infoOnMargin: {
      displayName:
        "Info: interactiveMarginX/Y (px, default 0/0) — transparent extra hit-area outside " +
        "the button.",
      type: "boolean",
    },
    infoOnPxReset: {
      displayName: "Info: for any *Px field above, a negative number resets it to its default value.",
      type: "boolean",
    },
    infoOnColorsBase: {
      displayName:
        'Info: backgroundColor, textColor (strings, e.g. "#2563eb") — the button\'s default look.',
      type: "boolean",
    },
    infoOnColorsHover: {
      displayName:
        "Info: hoverBackgroundColor, hoverTextColor (strings) — look while the pointer hovers.",
      type: "boolean",
    },
    infoOnColorsPressed: {
      displayName:
        "Info: pressedBackgroundColor, pressedTextColor (strings) — look during a tactile press.",
      type: "boolean",
    },
    infoOnColorsActive: {
      displayName:
        "Info: activeBackgroundColor, activeTextColor (strings) — look while a switch is on.",
      type: "boolean",
    },
    infoOnColorsDisabled: {
      displayName:
        "Info: disabledBackgroundColor, disabledTextColor (strings) — look while disabled.",
      type: "boolean",
    },
    infoOnShadow: {
      displayName:
        "Info: shadowCoefficient (0-4, default 1) — scales shadow depth and press-down distance.",
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
      displayName: "Button height (px, clamped 28–96) — negative resets to default (40)",
      type: "number",
    },
    disabled: {
      displayName: "Disabled",
      type: "boolean",
    },
    disabledButtonIdsJson: {
      displayName: 'Force-disabled button IDs (JSON array of id strings, e.g. ["save"]).',
      type: "string",
    },
    infoOnDisabledButtonIds: {
      displayName:
        "Info: disabledButtonIdsJson combines with each button's own \"disabled\" field; " +
        "never re-enables.",
      type: "boolean",
    },
    hiddenButtonIdsJson: {
      displayName:
        'Hidden button IDs (JSON array of id strings, e.g. ["archive"]). Not rendered at all.',
      type: "string",
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
      displayName: "Last button interaction (hover | press | change)",
      type: "string",
    },
    lastButtonActive: {
      displayName: "Last button active",
      type: "boolean",
    },
    activeButtonIdsJson: {
      displayName: "Active button IDs (JSON)",
      type: "string",
    },
  },
  events: {
    buttonHovered: {
      displayName: "Button hovered",
      parameterUpdateIds: ["lastButtonId", "lastButtonInteraction", "lastButtonActive"],
    },
    buttonPressed: {
      displayName: "Button pressed",
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
