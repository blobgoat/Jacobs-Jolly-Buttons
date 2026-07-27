import React, { useMemo } from "react";
import type { PalantirButtonGroupProps } from "../buttonWidget.types.js";
import { computeAnimationBufferPx, computeJoinedPosition } from "../buttonWidget.utils.js";
import { PalantirButton } from "./PalantirButton.js";

/**
 * Lays out a row of `PalantirButton`s according to the configured layout mode. When the row is
 * wider than its container, the container simply scrolls horizontally — there is no icon-only
 * collapse behavior; every button always renders at full size with its label visible.
 *
 * This component intentionally does not call `useWidgetContext()` or `emitEvent` directly; it
 * only forwards internal button events to its `onButtonEvent` prop, which `Widget.tsx` uses to
 * translate them into Foundry events.
 */
export const PalantirButtonGroup: React.FC<PalantirButtonGroupProps> = ({
  buttons,
  layoutMode,
  customGapPx,
  groupPaddingPx,
  buttonHeightPx,
  disabled,
  activeButtonIds,
  onButtonEvent,
}) => {
  // Reserve extra space around the row (beyond the author's configured groupPaddingPx) so the
  // hover-grow and press-down transforms on individual buttons always render fully inside this
  // container, never get clipped, and never contribute stray scrollable overflow of their own.
  const animationBufferPx = useMemo(() => computeAnimationBufferPx(buttonHeightPx), [buttonHeightPx]);

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "nowrap",
    alignItems: "center",
    boxSizing: "border-box",
    padding: groupPaddingPx + animationBufferPx,
    gap: layoutMode === "custom-gap" ? Math.max(0, customGapPx) : 0,
    justifyContent: layoutMode === "space-between" ? "space-between" : "flex-start",
    width: layoutMode === "space-between" ? "100%" : undefined,
    // The row scrolls horizontally on its own (via the browser's native scrollbar) whenever it
    // doesn't fit — "auto" only shows a scrollbar when content actually overflows. Vertical
    // overflow is "hidden" rather than "visible": per the CSS overflow spec, pairing "auto" on
    // one axis with "visible" on the other forces the "visible" axis to compute as "auto" too,
    // so a button's press/hover *transform* (which counts toward scrollable overflow even though
    // it never affects layout) was spuriously revealing a vertical scrollbar — which then ate
    // into the row's width and visibly shifted every other button. "hidden" avoids that forced
    // pairing; the animationBufferPx above ensures nothing actually needs to be clipped.
    overflowX: "auto",
    overflowY: "hidden",
  };

  return (
    <div style={containerStyle} data-testid="palantir-button-group">
      {buttons.map((button, index) => {
        const joinedPosition = computeJoinedPosition(index, buttons.length, layoutMode);
        return (
          <PalantirButton
            key={button.id}
            config={button}
            active={activeButtonIds.has(button.id)}
            groupDisabled={disabled}
            buttonHeightPx={buttonHeightPx}
            joinedPosition={joinedPosition}
            onEvent={onButtonEvent}
          />
        );
      })}
    </div>
  );
};
