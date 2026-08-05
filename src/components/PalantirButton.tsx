import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PalantirButtonProps } from "../buttonWidget.types.js";
import {
  AUTO_HEIGHT_ANIMATION_BASIS_PX,
  computeBorderRadiusPx,
  computeEffectiveInteractiveMargins,
  computeJoinedCornerRadii,
  computeShadows,
  DISABLED_OPACITY,
  HOVER_SCALE,
  PENDING_ACTIVE_SETTLE_MS,
  ShadowSet,
} from "../buttonWidget.utils.js";

type VisualState = "disabled" | "pressed" | "activeHovered" | "active" | "hovered" | "default";

/**
 * A single native button rendered as two layers: an interactive hit area (the native
 * `<button>`, which owns pointer/keyboard/focus/disabled semantics and the transparent
 * interactive margins) and a visual surface (an inner `<span>` that owns background,
 * radius, shadow, and the pressed translation). Only the visual surface moves when pressed.
 *
 * `buttonHeightPx === null` means "auto-fill" mode: both layers size themselves off the
 * percentage height of their (now dynamically-sized) ancestors instead of an explicit px value —
 * see `PalantirButtonGroup` for how the ancestor chain is made to have a real, bounded height.
 */
export const PalantirButton: React.FC<PalantirButtonProps> = ({
  config,
  active,
  groupDisabled,
  buttonHeightPx,
  joinedPosition,
  onEvent,
}) => {
  const isDisabled: boolean = groupDisabled || config.disabled;
  const propActive: boolean = config.mode === "switch" ? active : false;

  // A switch's `active` prop only updates once this click's "change" event has round-tripped
  // back through the host (Widget.tsx's state, then a re-render with the new `active` value) —
  // that's at least one extra render after pointerup. Without this, isPointerDown already flips
  // to false on pointerup (browsers fire pointerup/mouseup before click), so for one render the
  // button has neither a live press nor the not-yet-arrived active state, and it visibly springs
  // back up before immediately being pushed back down once `active` catches up. `pendingActive`
  // holds the click's known outcome locally so the pressed-down look never has a gap to spring
  // through.
  const [pendingActive, setPendingActive]: [boolean | null, React.Dispatch<React.SetStateAction<boolean | null>>] =
    useState<boolean | null>(null);

  // Releasing `pendingActive` the instant `propActive` first agrees with it is not safe: the host
  // round trip that carries this click's outcome back isn't guaranteed to be the only parameter
  // delivery in flight around a click, and isn't guaranteed to arrive in order relative to others
  // (an unrelated parameter update, or a stale/queued re-delivery of `parameters.values` racing
  // the real echo). If one of those happens to carry `propActive` through the *correct* value only
  // transiently — agreeing with `pendingActive` for exactly one render before a still-in-flight,
  // out-of-order delivery reverts it again — clearing on that first coincidental match hands control
  // back to `propActive` right as it's about to swing the wrong way, which reads as the press/active
  // look (and its color) flickering or reverting right after the click, worse specifically under the
  // conditions that make out-of-order delivery more likely: host lag, or other parameters updating
  // around the same time. Instead, only release local control once `propActive` has agreed with
  // `pendingActive` continuously for a full settle window with no reversal in between — any renewed
  // disagreement during that window cancels the pending release and starts the wait over.
  useEffect(() => {
    if (pendingActive === null || propActive !== pendingActive) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setPendingActive(null);
    }, PENDING_ACTIVE_SETTLE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [propActive, pendingActive]);

  const effectiveActive: boolean = pendingActive !== null ? pendingActive : propActive;

  const [isHovered, setIsHovered]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false);
  const [isPointerDown, setIsPointerDown]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false);
  const [isKeyboardPressed, setIsKeyboardPressed]: [boolean, React.Dispatch<React.SetStateAction<boolean>>] = useState(false);

  //tracks the hover reference, or the object that was last hovered over, ensuring hovering doesnt emit multiple hover events
  const hasEmittedHoverRef: React.MutableRefObject<boolean> = useRef(false);

  // Set to true right before a pointer-driven commit runs (see `handlePointerUp` below), and
  // read/cleared by `handleClick`. The browser still fires a native "click" after pointerup for
  // a real pointer interaction; without this flag that click would run the commit a second time.
  // Left false, `handleClick` treats the click as keyboard-originated (Enter/Space), which has no
  // preceding pointerup on this element.
  const pointerCommittedRef: React.MutableRefObject<boolean> = useRef(false);

  // Mirrors `isPointerDown` (below) but is read/written synchronously, not via React state, so
  // `handlePointerUp` can check "did a down on this button actually precede this up" without any
  // risk of reading a stale, not-yet-committed value of the state version — see the comment on
  // `handlePointerUp` for why that distinction matters.
  const isPointerDownRef: React.MutableRefObject<boolean> = useRef(false);

  useEffect(() => {
    if (isDisabled) {
      setIsHovered(false);
      setIsPointerDown(false);
      isPointerDownRef.current = false;
      setIsKeyboardPressed(false);
      setPendingActive(null);
      hasEmittedHoverRef.current = false;
    }
  }, [isDisabled]);

  /**
   * Fires the press/unpress/change events (and, for a switch, the local `pendingActive`
   * override) for an activation of this button. Called from `handlePointerUp` for pointer/touch
   * interactions and from `handleClick` for keyboard-originated ones (see `pointerCommittedRef`).
   *
   * For a switch, `press` fires only when this activation selects it (newActive === true);
   * `unpress` fires only when it deselects it (newActive === false) — the two are mutually
   * exclusive per activation. `change` still fires every time either way, carrying the resulting
   * `active` value, and remains what hosts should use to track persisted state. A momentary
   * button has no persistent active state, so it always fires `press` and never `unpress`.
   */
  const commitActivation: () => void = useCallback(() => {
    if (isDisabled) {
      return;
    }
    if (config.mode === "switch") {
      const newActive = !active;
      // Set synchronously, in the same handler/render as clearing isPointerDown, so the very same
      // render already reflects the switch's outcome instead of waiting for it to round-trip back
      // through the host as an updated `active` prop — see the comment on `pendingActive`'s
      // declaration.
      setPendingActive(newActive);
      if (newActive) {
        onEvent({ type: "press", id: config.id, active: newActive });
      } else {
        onEvent({ type: "unpress", id: config.id, active: newActive });
      }
      onEvent({ type: "change", id: config.id, active: newActive });
    } else {
      onEvent({ type: "press", id: config.id, active: false });
    }
  }, [isDisabled, config.mode, config.id, active, onEvent]);

  /**
   * Handles the pointer entering the button. Sets the hover state and emits a hover event if it hasn't been emitted yet.
   */
  const handlePointerEnter = useCallback(() => {
    if (isDisabled) {
      return;
    }
    setIsHovered(true);
    if (!hasEmittedHoverRef.current) {
      hasEmittedHoverRef.current = true;
      onEvent({ type: "hover", id: config.id, active: effectiveActive });
    }
  }, [isDisabled, onEvent, config.id, effectiveActive]);
  /**
   * Handles the pointer leaving the button. Resets the hover and pointer down states, marks that
   * a hover event can be emitted again, and — only if a "hover" event was actually emitted for
   * this hover (i.e. the button wasn't disabled the whole time) — emits a matching "hoverEnd"
   * event so hosts can react to hover ending, not just starting.
   */
  const handlePointerLeave: () => void = useCallback(() => {
    setIsHovered(false);
    setIsPointerDown(false);
    isPointerDownRef.current = false;
    if (hasEmittedHoverRef.current) {
      hasEmittedHoverRef.current = false;
      onEvent({ type: "hoverEnd", id: config.id, active: effectiveActive });
    }
  }, [onEvent, config.id, effectiveActive]);
  /**
   * Handles the pointer down event on the button. Sets the pointer down state if the button is not disabled.
   */
  const handlePointerDown: () => void = useCallback(() => {
    if (isDisabled) {
      return;
    }
    isPointerDownRef.current = true;
    setIsPointerDown(true);
  }, [isDisabled]);

  /**
   * Handles the pointer being released over the button — the pointer/touch/mouse equivalent of a
   * "click". Clears the pointer-down state and, if a down on this same button preceded it and it's
   * enabled, commits the activation in the very same handler call (so React batches both state
   * updates into a single render — see `commitActivation` and the `pendingActive` comment for why
   * that matters).
   *
   * The gate is `isPointerDownRef` alone, not `isHovered`. Without explicit pointer capture (which
   * this button doesn't use), the browser only dispatches `pointerup` to this element at all when
   * the release genuinely lands back on it — so `isPointerDownRef` being true here already proves
   * "a down on this button was followed by an up on this button," the same guarantee a native
   * click gives. Requiring `isHovered` too used to make this occasionally miss: `isHovered` is only
   * set by a preceding `pointerenter`, which some browsers skip if the cursor was already resting
   * on the button before it appeared/became enabled (no mouse movement occurred to trigger it) —
   * in that case a perfectly legitimate click would fail this gate, fall through to the `handleClick`
   * fallback path a render later, and reproduce the exact up-flicker this was meant to fix (rarely,
   * hence it previously showed up "less frequently" rather than being fixed outright). Reading a
   * ref instead of the `isPointerDown` state variable further avoids any chance of that check
   * observing a not-yet-committed value.
   */
  const handlePointerUp: () => void = useCallback(() => {
    const shouldCommit = isPointerDownRef.current && !isDisabled;
    isPointerDownRef.current = false;
    setIsPointerDown(false);
    if (shouldCommit) {
      pointerCommittedRef.current = true;
      commitActivation();
    }
  }, [isDisabled, commitActivation]);

  /**
   * Handles a cancelled pointer interaction (e.g. the OS interrupts the gesture). Only resets the
   * pressed state — a cancel is never a commit, unlike `handlePointerUp`.
   */
  const handlePointerCancel: () => void = useCallback(() => {
    isPointerDownRef.current = false;
    setIsPointerDown(false);
  }, []);

  /**
   * This is a listener watching for pointer up and pointer cancel events on the window to reset the pointer down state.
   * This ensures that the button correctly reflects the pointer state even if the pointer is released outside the button.
   */
  useEffect(() => {
    if (!isPointerDown) {
      return;
    }
    const handleWindowPointerUp = () => {
      isPointerDownRef.current = false;
      setIsPointerDown(false);
    };
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);
    return () => {
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
    };
  }, [isPointerDown]);

  /**
   * Handles the blur event on the button, resetting the keyboard pressed state.
   */
  const handleBlur: () => void = useCallback(() => {
    setIsKeyboardPressed(false);
  }, []);
  /**
   * Handles the key down event for the button, mainly for accessibility purposes, so that pressing Enter or Space triggers the button action.
   */
  const handleKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        return;
      }
      if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
        setIsKeyboardPressed(true);
      }
    },
    [isDisabled],
  );

  /**
   * Handles the key up event for the button, mainly for accessibility purposes, so that releasing Enter or Space resets the keyboard pressed state.
   */
  const handleKeyUp: (event: React.KeyboardEvent<HTMLButtonElement>) => void = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
      setIsKeyboardPressed(false);
    }
  }, []);


  /**
   * Handles the button's native "click" event. For a real pointer/touch interaction this fires
   * *after* `handlePointerUp` already committed the activation — `pointerCommittedRef` detects
   * that and skips, so the action doesn't run twice. If the flag isn't set, this click has no
   * preceding pointerup on this element, meaning it was triggered by the keyboard (Enter/Space on
   * a focused button), so it commits directly.
   */
  const handleClick: () => void = useCallback(() => {
    if (pointerCommittedRef.current) {
      pointerCommittedRef.current = false;
      return;
    }
    commitActivation();
  }, [commitActivation]);

  // Not gated on `isHovered` for the same reason `handlePointerUp` no longer is (see its comment):
  // `isPointerDown` alone is already reliable proof of a live press on this button, since it's
  // only ever set from this button's own pointerdown/pointerup/leave handlers.
  const pressedVisual: boolean = !isDisabled && (isPointerDown || isKeyboardPressed);

  // A switch that's active should stay visually "pushed in" (translated down, sunken shadow),
  // not just spring back up to a raised/resting shape with a darker color once the pointer or
  // key is released — that spring-back is correct only for the transient, momentary tactile
  // press. `pressedVisual` alone still covers that momentary case (including the tactile feel of
  // pressing an active switch to toggle it back off); this adds the persistent "stays down"
  // look for a switch that is currently active.
  const isHeldDown: boolean = pressedVisual || (config.mode === "switch" && effectiveActive);

  const visualState: VisualState = isDisabled
    ? "disabled"
    : pressedVisual
      ? "pressed"
      : effectiveActive && isHovered
        ? "activeHovered"
        : effectiveActive
          ? "active"
          : isHovered
            ? "hovered"
            : "default";

  // There's no separate "active" or "disabled" color set anymore (per-button or per-scheme):
  // active reuses the pressed colors (a switch that's on is meant to look "pushed in," the same
  // as a momentary button mid-press — see `isHeldDown` above), and disabled always uses the
  // normal default/unpressed colors, faded via `DISABLED_OPACITY` on the visual surface below,
  // rather than a distinct color pair.
  const { backgroundColor: stateBackgroundColor, textColor: stateTextColor }: { backgroundColor: string; textColor: string } = useMemo(() => {
    if (isDisabled) {
      return { backgroundColor: config.backgroundColor, textColor: config.textColor };
    }
    if (pressedVisual || effectiveActive) {
      return { backgroundColor: config.pressedBackgroundColor, textColor: config.pressedTextColor };
    }
    if (isHovered) {
      return { backgroundColor: config.hoverBackgroundColor, textColor: config.hoverTextColor };
    }
    return { backgroundColor: config.backgroundColor, textColor: config.textColor };
  }, [isDisabled, pressedVisual, effectiveActive, isHovered, config]);

  const shadows: ShadowSet = useMemo<ShadowSet>(() => computeShadows(config.shadowCoefficient), [config.shadowCoefficient]);

  const currentShadow: string = isDisabled
    ? "none"
    : isHeldDown
      ? shadows.pressed
      : isHovered
        ? shadows.hover
        : shadows.resting;

  // When buttonHeightPx is null (auto-fill mode), the real rendered height isn't known
  // synchronously — the browser resolves it from available space, not from a measurement we can
  // read here. Corner rounding falls back to a representative constant in that case; it's a
  // cosmetic approximation only (see AUTO_HEIGHT_ANIMATION_BASIS_PX).
  const radiusPx: number = useMemo(
    () => computeBorderRadiusPx(buttonHeightPx ?? AUTO_HEIGHT_ANIMATION_BASIS_PX, config.roundingCoefficient),
    [buttonHeightPx, config.roundingCoefficient],
  );
  const radii: { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number } = useMemo(
    () => computeJoinedCornerRadii(radiusPx, joinedPosition),
    [radiusPx, joinedPosition],
  );
  const margins: { top: number; right: number; bottom: number; left: number } = useMemo(
    () =>
      computeEffectiveInteractiveMargins(
        config.interactiveMarginX,
        config.interactiveMarginY,
        joinedPosition,
      ),
    [config.interactiveMarginX, config.interactiveMarginY, joinedPosition],
  );

  // Icons and background images aren't supported: the custom-widget iframe can't authenticate
  // image requests against Foundry (no shared session cookies, and no other viable path was
  // found), so any such URL would just fail to load. Use an emoji directly in the button's
  // `label` instead (e.g. `"🌍 Africa"`) — see infoOnEmoji in main.config.ts.
  const contentChildren: React.ReactNode = (
    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{config.label}</span>
  );

  const hitAreaStyle: React.CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    // Fills its layout wrapper's equal-width column exactly — the wrapper (in
    // PalantirButtonGroup) is what actually divides the group's width; this button always
    // occupies 100% of whatever width that wrapper resolves to, and can shrink below its content
    // size (min-width: 0) instead of forcing the column wider.
    width: "100%",
    minWidth: "0px",
    // When buttonHeightPx is auto (null), the hit area fills whatever height the layout wrapper
    // ends up with (which itself is bounded by the widget's real available space — see
    // PalantirButtonGroup). When it's a fixed number, the hit area stays content-sized (wrapping
    // the visual surface's explicit height below), unchanged from before.
    height: buttonHeightPx === null ? "100%" : undefined,
    padding: `${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px`,
    margin: 0,
    border: "none",
    background: "transparent",
    cursor: isDisabled ? "not-allowed" : "pointer",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    font: "inherit",
    // Raised only while hovered, so the button's own visual surface (which grows via a
    // transform below) paints above its neighbors in the row instead of being overlapped by
    // them — this is purely a paint-order change and never affects any element's layout box or
    // its neighbors' positions.
    zIndex: isHovered ? 2 : 0,
  };

  // Hover-grow and press-down are each an ordinary CSS transform, but they used to be combined
  // into a single `transform` value on one element (`translateY(...) scale(...)`). CSS composes
  // multiple functions in one `transform` into a *single* coordinate-space chain, not two
  // independent ones — scaling and translating on the same element interact: growing the button
  // on hover visibly changes how far the press-down translate reads as moving it, and vice versa,
  // so pressing a hovered button (or hovering a pressed one) looked subtly different from doing
  // either alone. Splitting them across two nested layers — an outer "press layer" that only ever
  // translates, and the inner visual surface that only ever scales — makes each transform live on
  // its own element with its own coordinate space, so neither can influence the other's math; the
  // press layer moving the whole (already independently-scaled) surface as a rigid unit.
  const hoverScaleTransform = !isDisabled && isHovered ? `scale(${HOVER_SCALE})` : "scale(1)";
  const pressTranslateTransform = isHeldDown ? `translateY(${shadows.translateYPx}px)` : "translateY(0px)";

  // Outer layer: press/active translate only. Purely a positioning box — no background, radius,
  // shadow, or content styling of its own — sized to exactly the space the visual surface used to
  // occupy directly inside the hit area, so introducing it changes no visible geometry.
  const pressLayerStyle: React.CSSProperties = {
    position: "relative",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minWidth: "0px",
    height: buttonHeightPx === null ? "100%" : buttonHeightPx,
    transform: pressTranslateTransform,
    transition: "transform 120ms ease-out",
  };

  const visualSurfaceStyle: React.CSSProperties = {
    position: "relative",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    // Fills the press layer's full width so the visible background/border-radius/shadow span the
    // entire equal-width column, not just the label's natural width. In fixed mode, height stays
    // exactly `buttonHeightPx` regardless — buttonVerticalPaddingPx (applied one level up, on the
    // layout wrapper) never affects this value. In auto mode (buttonHeightPx === null), the
    // surface intentionally fills slightly *less* than the press layer's full height —
    // `100% / HOVER_SCALE` — reserving exactly the headroom the hover-grow transform needs so
    // growing by HOVER_SCALE on hover brings it back to exactly 100%, never past it, with no
    // fixed px buffer needed (the press layer's own height is already dynamic).
    width: "100%",
    minWidth: "0px",
    height: buttonHeightPx === null ? `calc(100% / ${HOVER_SCALE})` : buttonHeightPx,
    padding: `${config.paddingY}px ${config.paddingX}px`,
    borderTopLeftRadius: radii.topLeft,
    borderTopRightRadius: radii.topRight,
    borderBottomRightRadius: radii.bottomRight,
    borderBottomLeftRadius: radii.bottomLeft,
    overflow: "hidden",
    backgroundColor: stateBackgroundColor,
    color: stateTextColor,
    fontSize: config.fontSizePx,
    fontWeight: 500,
    boxShadow: currentShadow,
    // Scale only — no translate here anymore (see the press layer above).
    transform: hoverScaleTransform,
    transformOrigin: "center center",
    // Disabled has no color pair of its own — it's always the normal default/unpressed
    // background/text (stateBackgroundColor/stateTextColor already resolve to those when
    // isDisabled), faded via opacity instead. This reads as "disabled" regardless of the
    // button's actual colors and needs no separate configuration.
    opacity: isDisabled ? DISABLED_OPACITY : 1,
    // background-color/color are included here (not just transform/box-shadow) so a visual-state
    // change — e.g. pressed -> active, where the two colors can be very different (a light
    // "pressed" tone snapping straight to a near-black "active" tone) — fades instead of
    // instantly snapping, which otherwise reads as a flash/flicker. opacity is included for the
    // same reason when toggling disabled on/off.
    transition: [
      "transform 120ms ease-out",
      "box-shadow 120ms ease-out",
      "background-color 120ms ease-out",
      "color 120ms ease-out",
      "opacity 120ms ease-out",
    ].join(", "),
    whiteSpace: "nowrap",
  };

  const contentStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    height: "100%",
    overflow: "hidden",
  };

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-pressed={config.mode === "switch" ? effectiveActive : undefined}
      data-button-id={config.id}
      data-visual-state={visualState}
      className="palantir-button-hit-area"
      style={hitAreaStyle}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onClick={handleClick}
    >
      <span className="palantir-button-press-layer" style={pressLayerStyle}>
        <span className="palantir-button-visual-surface" style={visualSurfaceStyle}>
          <span style={contentStyle}>{contentChildren}</span>
        </span>
      </span>
    </button>
  );
};
