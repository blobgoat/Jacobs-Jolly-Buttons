import { defineConfig } from "@osdk/widget.client";

// Updates to the widget configuration in this file require reapplying dev mode
// to preview the changes. When developing locally, open the setup URL printed
// in your terminal again. When developing in Code Workspaces, refresh the
// preview panel.

export default defineConfig({
  id: "widgetId",
  name: "Custom Button Group",
  description: "A configurable, responsive group of buttons for Workshop.",
  type: "workshop",
  parameters: {
    // --- Input parameters ---------------------------------------------------
    buttonsJson: {
      displayName: "Buttons (JSON)",
      type: "string",
    },
    layoutMode: {
      displayName: "Layout mode (joined | space-between | custom-gap)",
      type: "string",
    },
    customGapPx: {
      displayName: "Custom gap (px)",
      type: "number",
    },
    groupPaddingPx: {
      displayName: "Group padding (px)",
      type: "number",
    },
    collapseMode: {
      displayName: "Collapse mode (auto | always | never)",
      type: "string",
    },
    collapseStrategy: {
      displayName: "Collapse strategy (priority | all-at-once)",
      type: "string",
    },
    buttonHeightPx: {
      displayName: "Button height (px)",
      type: "number",
    },
    tooltipDelayMs: {
      displayName: "Tooltip delay (ms)",
      type: "number",
    },
    disabled: {
      displayName: "Disabled",
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
