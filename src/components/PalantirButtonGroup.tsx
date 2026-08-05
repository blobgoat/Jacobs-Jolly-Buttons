import React, { useMemo } from "react";
import type { PalantirButtonGroupProps } from "../buttonWidget.types.js";
import {
  AUTO_HEIGHT_ANIMATION_BASIS_PX,
  computeAnimationBufferPx,
  computeJoinedPosition,
  SPACE_BETWEEN_GAP_PX,
} from "../buttonWidget.utils.js";
import { PalantirButton } from "./PalantirButton.js";

/**
 * Lays out a row of `PalantirButton`s according to the configured layout mode. Every visible
 * button is wrapped in an equal-width flex column (`flex: 1 1 0`) so the row of buttons always
 * collectively fills the available group width — there is no natural-width sizing left in any
 * layout mode, and no horizontal scrolling; a group narrower than its buttons' combined natural
 * width simply shrinks each button's column (down to `min-width: 0`) instead of overflowing.
 *
 * Each button's wrapper also carries `buttonVerticalPaddingPx` as top/bottom padding only — pure
 * external layout space that sits outside the visible button (whose own height stays exactly
 * `buttonHeightPx`), distinct from a button's internal `paddingY` and from its transparent
 * `interactiveMarginY` hit area.
 *
 * The row itself always carries `flex: 1 1 auto` + `min-height: 0` (as a flex item of
 * `Widget.tsx`'s outer container), rather than sizing purely to its own content. This is what
 * gives the row a real, bounded height tied to the widget's *actual* available space instead of
 * an unrelated, content-only size: without it, a tall configuration (a large `buttonHeightPx`,
 * or a large `buttonVerticalPaddingPx`) could produce a row taller than the widget itself, which
 * the outer container would then center and clip evenly top/bottom — cutting into the row's own
 * reserved hover-grow buffer and making the hover animation appear to spill outside the widget.
 * With the row correctly bounded, `overflow: hidden` below only ever clips when content
 * genuinely can't fit in the space actually available, never as an accident of unrelated sizing.
 *
 * When `buttonHeightPx` is `null` ("auto-fill" mode — see `resolveButtonHeightPx`), the row's
 * `alignItems` switches from `"center"` to `"stretch"` so each wrapper — and, in turn, each
 * button — fills the row's full (now-bounded) height instead of sizing to an explicit px value.
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
  buttonVerticalPaddingPx,
  disabled,
  activeButtonIds,
  onButtonEvent,
}) => {
  // Reserve extra space around the row (beyond the author's configured groupPaddingPx) so the
  // hover-grow and press-down transforms on individual buttons always render fully inside this
  // container, never get clipped, and never contribute stray scrollable overflow of their own.
  // In auto-fill mode (buttonHeightPx === null) the real rendered height isn't known
  // synchronously, so this falls back to a representative constant — see
  // AUTO_HEIGHT_ANIMATION_BASIS_PX. It's a conservative estimate only for the *horizontal*
  // buffer in that mode; vertical hover-grow headroom in auto mode is instead reserved precisely,
  // via `calc()`, directly on the button's own visual surface (see PalantirButton).
  const animationBufferPx = useMemo(
    () => computeAnimationBufferPx(buttonHeightPx ?? AUTO_HEIGHT_ANIMATION_BASIS_PX),
    [buttonHeightPx],
  );

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "nowrap",
    alignItems: buttonHeightPx === null ? "stretch" : "center",
    boxSizing: "border-box",
    // Establishes a real, bounded height for the row (see the class-level doc comment above) —
    // it grows to fill whatever vertical space Widget.tsx's outer container actually has, capped
    // by that same space (a flex item can never grow past its container's available room), and
    // `min-height: 0` lets it shrink below its own content's natural size instead of forcing an
    // overflow, which is what makes the cap actually effective.
    flex: "1 1 auto",
    minHeight: "0px",
    padding: groupPaddingPx + animationBufferPx,
    // "joined" uses zero gap between the equal-width columns (its buttons stay visually
    // connected). "custom-gap" reserves the author's configured customGapPx. "space-between"
    // always uses a fixed SPACE_BETWEEN_GAP_PX gap — not configurable via customGapPx, which has
    // no effect in this mode. Expressed as an explicit px string (rather than a bare number) so a
    // zero gap is unambiguous.
    gap: `${
      layoutMode === "custom-gap"
        ? Math.max(0, customGapPx)
        : layoutMode === "space-between"
          ? SPACE_BETWEEN_GAP_PX
          : 0
    }px`,
    // The row itself always fills (and never exceeds) the available group width; individual
    // columns below divide that width evenly, so there is no leftover space for justifyContent
    // to distribute.
    width: "100%",
    maxWidth: "100%",
    minWidth: "0px",
    // Every button now lives in an equal-width column that shrinks with the row (min-width: 0)
    // rather than overflowing it, so the group never needs to scroll. "hidden" on both axes also
    // avoids the forced overflow-x/overflow-y pairing that used to let a button's press/hover
    // *transform* (which counts toward scrollable overflow even though it never affects layout)
    // spuriously reveal a scrollbar that ate into the row's width and shifted every other button;
    // the animationBufferPx above ensures nothing actually needs to be clipped.
    overflowX: "hidden",
    overflowY: "hidden",
  };

  // Pure external layout space around each button: top/bottom only, no left/right, and it does
  // not touch the button's own internal padding (paddingX/paddingY) or interactive hit area
  // (interactiveMarginX/Y). Zero horizontal padding here also means it can never introduce a gap
  // between joined buttons, which must stay visually connected.
  const wrapperStyle: React.CSSProperties = {
    flex: "1 1 0",
    minWidth: "0px",
    minHeight: "0px",
    boxSizing: "border-box",
    paddingTop: buttonVerticalPaddingPx,
    paddingBottom: buttonVerticalPaddingPx,
    paddingLeft: 0,
    paddingRight: 0,
  };

  return (
    <div style={containerStyle} data-testid="palantir-button-group">
      {buttons.map((button, index) => {
        const joinedPosition = computeJoinedPosition(index, buttons.length, layoutMode);
        return (
          <div
            key={button.id}
            className="button-layout-wrapper"
            style={wrapperStyle}
            data-testid="button-layout-wrapper"
          >
            <PalantirButton
              config={button}
              active={activeButtonIds.has(button.id)}
              groupDisabled={disabled}
              buttonHeightPx={buttonHeightPx}
              joinedPosition={joinedPosition}
              onEvent={onButtonEvent}
            />
          </div>
        );
      })}
    </div>
  );
};
