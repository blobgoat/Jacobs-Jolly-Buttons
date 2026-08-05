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
 * Lays out a row (or, in `"column"` orientation, a vertical stack) of `PalantirButton`s
 * according to the configured layout mode. `orientation` rotates which axis is the "main" one
 * (width for `"row"`, height for `"column"`), and `buttonHeightPx` behaves like a direct rotation
 * of its `"row"` meaning onto that axis in both cases:
 *
 * - **`buttonHeightPx === null`** ("auto-fill" — see `resolveButtonHeightPx`): every wrapper is
 *   `flex: 1 1 0`, so buttons equally share whatever space the (always-bounded) container has —
 *   growing to fill it if there's room to spare, shrinking together if there isn't enough. In
 *   `"row"` orientation this divides width (unchanged from before orientation existed); in
 *   `"column"` orientation it divides height instead, and each button stretches to its wrapper's
 *   full size (`buttonHeightPx === null` also makes `PalantirButton` itself render at `"100%"` —
 *   see there) so the buttons visibly grow to *fill* the available height, not just leave empty
 *   gaps around fixed-size buttons.
 * - **`buttonHeightPx` is a fixed number**: every wrapper is `flex: 0 0 auto` instead — content-
 *   sized to exactly that button's configured height, not sharing space equally and not growing
 *   to fill leftover room. In `"row"` orientation this is the button's cross-axis size (its width
 *   still always equal-shares, unaffected). In `"column"` orientation this is now the *main* axis
 *   size, so with few/short buttons the container simply has empty room left over below them
 *   (buttons are top-anchored, not centered or stretched); with more buttons than fit, the
 *   container's `min-height` is left at its default (`auto`, not the `0px` override used
 *   everywhere else — see `containerStyle.minHeight`), which makes it refuse to shrink below its
 *   own content's natural size instead of squeezing every button to fit. That lets the stack
 *   genuinely **extend past a short widget tile**; Widget.tsx's outer container switches to
 *   `overflowY: "auto"` in `"column"` orientation so the overflow is reachable by scrolling
 *   instead of being silently clipped.
 *
 * `layoutMode`'s three values (`joined`/`custom-gap`/`space-between`) apply along whichever axis
 * `orientation` is set to — CSS `gap` already follows `flexDirection` automatically, and the
 * per-button joined-seam corner rounding / interactive-margin zeroing is computed by
 * `computeJoinedCornerRadii` / `computeEffectiveInteractiveMargins` (see `PalantirButton`), which
 * both also take `orientation` and swap which corners/margins apply accordingly.
 *
 * Each button's wrapper also carries `buttonVerticalPaddingPx` as top/bottom padding only — pure
 * external layout space that sits outside the visible button, distinct from a button's internal
 * `paddingY` and from its transparent `interactiveMarginY` hit area. This applies identically in
 * both orientations.
 *
 * `alignItems` governs the *cross* axis: in `"row"` orientation this is `buttonHeightPx === null
 * ? "stretch" : "center"` (unchanged from before orientation existed). In `"column"` orientation
 * the cross axis is width, which always stretches to fill — there's no per-button width control
 * (no "buttonWidthPx"), so `alignItems` is always `"stretch"` there regardless of `buttonHeightPx`.
 *
 * This component intentionally does not call `useWidgetContext()` or `emitEvent` directly; it
 * only forwards internal button events to its `onButtonEvent` prop, which `Widget.tsx` uses to
 * translate them into Foundry events.
 *
 * `selectionMode` (see that type) doesn't affect this component's own layout at all — it's passed
 * straight through to every `PalantirButton`, which uses it to decide whether a click deactivating
 * the group's sole active switch should be blocked. Which button(s) end up `active` for a given
 * `selectionMode` is entirely Widget.tsx's responsibility (see `computeNextActiveButtonIds`); this
 * component just renders whatever `activeButtonIds` it's given.
 */
export const PalantirButtonGroup: React.FC<PalantirButtonGroupProps> = ({
  buttons,
  layoutMode,
  orientation,
  selectionMode,
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

  const isColumn = orientation === "column";
  const isAutoFill = buttonHeightPx === null;

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: isColumn ? "column" : "row",
    flexWrap: "nowrap",
    // Row: buttonHeightPx === null stretches every button to the bounded row's full height.
    // Column: always stretch — every button always fills the stack's full width, with no
    // per-button width control (there's no "buttonWidthPx").
    alignItems: isColumn ? "stretch" : isAutoFill ? "stretch" : "center",
    boxSizing: "border-box",
    // Always grows to fill whatever space Widget.tsx's outer container actually has, capped by
    // that same space (a flex item can never grow past its container's available room) — this is
    // what lets buttons in "auto-fill" mode (see minHeight below) actually have real, bounded
    // space to equally share/grow into, in both orientations.
    flex: "1 1 auto",
    // `min-height: 0` is what lets this container *shrink* below its own content's natural size
    // instead of forcing an overflow — appropriate whenever buttons are meant to fit exactly
    // within the available space (row orientation always; column orientation when
    // buttonHeightPx === null, since then every button shares that space rather than insisting
    // on its own fixed size). When buttonHeightPx is a fixed number in "column" orientation,
    // this is instead left at the CSS default (`undefined` → `auto`), which makes a flex item
    // refuse to shrink below its content's natural (min-content) size — exactly what lets a tall
    // stack of fixed-height buttons "extend" past the widget's own available height instead of
    // being squeezed to fit; see the class-level doc comment.
    minHeight: !isColumn || isAutoFill ? "0px" : undefined,
    padding: groupPaddingPx + animationBufferPx,
    // "joined" uses zero gap between the equal-share buttons (they stay visually connected).
    // "custom-gap" reserves the author's configured customGapPx. "space-between" always uses a
    // fixed SPACE_BETWEEN_GAP_PX gap — not configurable via customGapPx, which has no effect in
    // this mode. `gap` follows whichever direction `flexDirection` is set to automatically, so
    // this value applies horizontally in "row" orientation and vertically in "column" — no
    // separate handling needed. Expressed as an explicit px string (rather than a bare number) so
    // a zero gap is unambiguous.
    gap: `${
      layoutMode === "custom-gap"
        ? Math.max(0, customGapPx)
        : layoutMode === "space-between"
          ? SPACE_BETWEEN_GAP_PX
          : 0
    }px`,
    // The container itself always fills (and never exceeds) the available group width in both
    // orientations — individual columns/rows below divide up whichever axis is the main one.
    width: "100%",
    maxWidth: "100%",
    minWidth: "0px",
    // Row: every button lives in an equal-width column that shrinks with the row (min-width: 0)
    // rather than overflowing it, so the group never needs to scroll horizontally. "hidden" on
    // both axes also avoids the forced overflow-x/overflow-y pairing that used to let a button's
    // press/hover *transform* (which counts toward scrollable overflow even though it never
    // affects layout) spuriously reveal a scrollbar that ate into the row's width and shifted
    // every other button; the animationBufferPx above ensures nothing actually needs to be
    // clipped. Column: when content genuinely exceeds this container's available height (the
    // fixed-buttonHeightPx "extend" case), the overflow escapes this container's own bounds
    // entirely (see minHeight above) — this "hidden" never has anything to clip in that case;
    // any scrolling needed happens one level up, in Widget.tsx's outer container.
    overflowX: "hidden",
    overflowY: "hidden",
  };

  // Pure external layout space around each button: top/bottom only, no left/right, and it does
  // not touch the button's own internal padding (paddingX/paddingY) or interactive hit area
  // (interactiveMarginX/Y). Zero horizontal padding here also means it can never introduce a gap
  // between joined buttons, which must stay visually connected. Applies identically in both
  // orientations — it's about vertical spacing around each button regardless of stacking
  // direction.
  const wrapperStyle: React.CSSProperties = {
    // Row: always equal-share of the row's width (1 1 0), unaffected by buttonHeightPx — unchanged
    // from before orientation existed (buttonHeightPx only ever governs the *cross* axis there).
    // Column: buttonHeightPx now governs the *main* axis instead, so it determines the wrapper's
    // main-axis sizing directly — null (auto-fill) means equal-share (1 1 0), growing to fill
    // leftover space or shrinking together if there isn't enough, exactly mirroring how "row"
    // orientation has always divided width. A fixed value means content-sized (0 0 auto) instead —
    // each wrapper is exactly as big as its button (plus this padding), not sharing space equally;
    // this is what allows the stack's total height to exceed the container (see
    // containerStyle.minHeight).
    flex: isColumn ? (isAutoFill ? "1 1 0" : "0 0 auto") : "1 1 0",
    width: isColumn ? "100%" : undefined,
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
              orientation={orientation}
              selectionMode={selectionMode}
              joinedPosition={joinedPosition}
              onEvent={onButtonEvent}
            />
          </div>
        );
      })}
    </div>
  );
};
