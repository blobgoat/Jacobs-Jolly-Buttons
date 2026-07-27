import { MediaSets } from "@osdk/foundry.mediasets";
//npm i -S @osdk/foundry.mediasets' to add it
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { client } from "../client.js";
import type { PalantirButtonProps } from "../buttonWidget.types.js";
import {
  computeBorderRadiusPx,
  computeEffectiveInteractiveMargins,
  computeJoinedCornerRadii,
  computeShadows,
  HOVER_SCALE,
  parseMediaSetItemUrl,
  ShadowSet,
} from "../buttonWidget.utils.js";

type VisualState = "disabled" | "pressed" | "activeHovered" | "active" | "hovered" | "default";

/**
 * A single native button rendered as two layers: an interactive hit area (the native
 * `<button>`, which owns pointer/keyboard/focus/disabled semantics and the transparent
 * interactive margins) and a visual surface (an inner `<span>` that owns background,
 * radius, shadow, and the pressed translation). Only the visual surface moves when pressed.
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
  // through; it's cleared once the prop confirms the same value.
  const [pendingActive, setPendingActive]: [boolean | null, React.Dispatch<React.SetStateAction<boolean | null>>] =
    useState<boolean | null>(null);

  useEffect(() => {
    if (pendingActive !== null && propActive === pendingActive) {
      setPendingActive(null);
    }
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

  useEffect(() => {
    if (isDisabled) {
      setIsHovered(false);
      setIsPointerDown(false);
      setIsKeyboardPressed(false);
      setPendingActive(null);
      hasEmittedHoverRef.current = false;
    }
  }, [isDisabled]);

  /**
   * Fires the press/change events (and, for a switch, the local `pendingActive` override) for an
   * activation of this button. Called from `handlePointerUp` for pointer/touch interactions and
   * from `handleClick` for keyboard-originated ones (see `pointerCommittedRef`).
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
      onEvent({ type: "press", id: config.id, active: newActive });
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
    setIsPointerDown(true);
  }, [isDisabled]);

  /**
   * Handles the pointer being released over the button — the pointer/touch/mouse equivalent of a
   * "click". Clears the pointer-down state and, if the release genuinely lands on this button
   * while it's pressed and enabled, commits the activation in the very same handler call (so
   * React batches both state updates into a single render — see `commitActivation` and the
   * `pendingActive` comment for why that matters).
   */
  const handlePointerUp: () => void = useCallback(() => {
    const shouldCommit = isPointerDown && isHovered && !isDisabled;
    setIsPointerDown(false);
    if (shouldCommit) {
      pointerCommittedRef.current = true;
      commitActivation();
    }
  }, [isPointerDown, isHovered, isDisabled, commitActivation]);

  /**
   * Handles a cancelled pointer interaction (e.g. the OS interrupts the gesture). Only resets the
   * pressed state — a cancel is never a commit, unlike `handlePointerUp`.
   */
  const handlePointerCancel: () => void = useCallback(() => {
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
    const handleWindowPointerUp = () => setIsPointerDown(false);
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

  // The icon is fetched (rather than set directly as an <img src>) and turned into a local
  // blob: URL for the <img>, rather than pointing the <img> straight at iconSrc, because the
  // custom-widget iframe doesn't share the parent Foundry stack's session cookies — a plain
  // `<img src="...">` (or an uncredentialed fetch) against a Foundry-hosted image silently fails
  // to authenticate. When iconSrc is a Foundry media-set item URL (…/media-set/{rid}/items/{rid}),
  // the RIDs are parsed out and handed to the OSDK `read()` platform function, which authenticates
  // through the widget's own client (see client.ts) instead of the browser's cookie jar. Any URL
  // that doesn't match that shape (e.g. a plain public image URL) falls back to a normal
  // credentialed fetch.
  const [iconObjectUrl, setIconObjectUrl]: [string | null, React.Dispatch<React.SetStateAction<string | null>>] =
    useState<string | null>(null);

  useEffect(() => {
    if (!config.iconSrc) {
      setIconObjectUrl(null);
      return;
    }

    let objectUrl: string | null = null;
    let cancelled = false;

    const mediaItem = parseMediaSetItemUrl(config.iconSrc);
    const responsePromise: Promise<Response> = mediaItem
      ? MediaSets.read(client, mediaItem.mediaSetRid, mediaItem.mediaItemRid)
      : fetch(config.iconSrc, { credentials: "include" });

    responsePromise
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load icon (status ${res.status})`);
        }
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setIconObjectUrl(objectUrl);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setIconObjectUrl(null);
        console.warn(`[PalantirButton] Icon failed to load for button "${config.id}".`, error);
      });

    // Revoke the specific blob: URL created by *this* effect run (not whatever is in state),
    // so switching iconSrc rapidly can't revoke a URL a later run is still using.
    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [config.iconSrc, config.id]);

  const pressedVisual: boolean = !isDisabled && ((isPointerDown && isHovered) || isKeyboardPressed);

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

  const { backgroundColor: stateBackgroundColor, textColor: stateTextColor }: { backgroundColor: string; textColor: string } = useMemo(() => {
    if (isDisabled) {
      return {
        backgroundColor: config.disabledBackgroundColor,
        textColor: config.disabledTextColor,
      };
    }
    if (pressedVisual) {
      return { backgroundColor: config.pressedBackgroundColor, textColor: config.pressedTextColor };
    }
    if (effectiveActive) {
      return { backgroundColor: config.activeBackgroundColor, textColor: config.activeTextColor };
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

  const radiusPx: number = useMemo(
    () => computeBorderRadiusPx(buttonHeightPx, config.roundingCoefficient),
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

  const hasBackgroundImage: boolean = !!config.backgroundImageSrc;

  const overlayColor: string | null = useMemo(() => {
    if (!hasBackgroundImage) {
      return null;
    }
    switch (visualState) {
      case "disabled":
        return "rgba(255, 255, 255, 0.55)";
      case "pressed":
        return "rgba(0, 0, 0, 0.35)";
      case "activeHovered":
      case "active":
        return "rgba(0, 0, 0, 0.25)";
      case "hovered":
        return "rgba(255, 255, 255, 0.12)";
      default:
        return null;
    }
  }, [hasBackgroundImage, visualState]);

  const backgroundSizeForFit =
    config.backgroundImageFit === "fill" ? "100% 100%" : config.backgroundImageFit;

  const iconSizePx = Math.round(buttonHeightPx * 0.6);
  const hasIcon = !!iconObjectUrl;

  const iconNode = hasIcon ? (
    <img
      src={iconObjectUrl}
      alt={config.iconAlt ?? ""}
      draggable={false}
      style={{
        width: iconSizePx,
        height: iconSizePx,
        objectFit: "contain",
        flexShrink: 0,
        display: "block",
      }}
    />
  ) : null;

  const contentChildren: React.ReactNode =
    config.iconPosition === "right" ? (
      <>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{config.label}</span>
        {iconNode}
      </>
    ) : (
      <>
        {iconNode}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{config.label}</span>
      </>
    );

  const hitAreaStyle: React.CSSProperties = {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    padding: `${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px`,
    margin: 0,
    border: "none",
    background: "transparent",
    cursor: isDisabled ? "not-allowed" : "pointer",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    font: "inherit",
    flexShrink: 0,
    // Raised only while hovered, so the button's own visual surface (which grows via a
    // transform below) paints above its neighbors in the row instead of being overlapped by
    // them — this is purely a paint-order change and never affects any element's layout box or
    // its neighbors' positions.
    zIndex: isHovered ? 2 : 0,
  };

  // Hover grows the button in place (never affects layout — see zIndex/hitAreaStyle above and
  // the group container's reserved animation buffer); an active/pressed switch or a momentary
  // press stays pushed down. Both are ordinary CSS transforms, so they compose independently and
  // never reflow sibling buttons.
  const hoverScaleTransform = !isDisabled && isHovered ? `scale(${HOVER_SCALE})` : "scale(1)";
  const pressTranslateTransform = isHeldDown ? `translateY(${shadows.translateYPx}px)` : "translateY(0px)";

  const visualSurfaceStyle: React.CSSProperties = {
    position: "relative",
    boxSizing: "border-box",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: buttonHeightPx,
    padding: `${config.paddingY}px ${config.paddingX}px`,
    borderTopLeftRadius: radii.topLeft,
    borderTopRightRadius: radii.topRight,
    borderBottomRightRadius: radii.bottomRight,
    borderBottomLeftRadius: radii.bottomLeft,
    overflow: "hidden",
    backgroundColor: hasBackgroundImage ? undefined : stateBackgroundColor,
    // Kept stable across visual states — the overlay that used to be baked in here as a second
    // linear-gradient layer (recomputing this string on every hover/press) is now its own
    // absolutely positioned <span> below. That keeps this exact background-image string identical
    // between renders, so the browser never treats it as a new image: an animated image (GIF/APNG)
    // keeps playing instead of restarting, and there's no flash while the gradient layer swaps in
    // and out.
    backgroundImage: hasBackgroundImage ? `url(${config.backgroundImageSrc})` : undefined,
    backgroundSize: hasBackgroundImage ? backgroundSizeForFit : undefined,
    backgroundPosition: hasBackgroundImage ? "center" : undefined,
    backgroundRepeat: hasBackgroundImage ? "no-repeat" : undefined,
    color: stateTextColor,
    fontSize: config.fontSizePx,
    fontWeight: 500,
    boxShadow: currentShadow,
    transform: `${pressTranslateTransform} ${hoverScaleTransform}`,
    transformOrigin: "center center",
    transition: [
      "transform 120ms ease-out",
      "box-shadow 120ms ease-out",
      "background-color 120ms ease-out",
      "color 120ms ease-out",
    ].join(", "),
    whiteSpace: "nowrap",
  };

  // The state overlay for a background-image button now lives in its own layer instead of being
  // baked into visualSurfaceStyle's backgroundImage (see the comment there) — this div just
  // fades its own background-color, which is cheap and never disturbs the image underneath.
  const overlayStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundColor: overlayColor ?? "transparent",
    transition: "background-color 120ms ease-out",
    pointerEvents: "none",
  };

  const contentStyle: React.CSSProperties = {
    position: "relative",
    zIndex: 1,
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
      <span className="palantir-button-visual-surface" style={visualSurfaceStyle}>
        {hasBackgroundImage && <span aria-hidden="true" style={overlayStyle} />}
        <span style={contentStyle}>{contentChildren}</span>
      </span>
    </button>
  );
};
