import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PalantirButtonProps } from "../buttonWidget.types.js";
import {
  computeBorderRadiusPx,
  computeEffectiveInteractiveMargins,
  computeJoinedCornerRadii,
  computeShadows,
  HOVER_SCALE,
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
  const isDisabled = groupDisabled || config.disabled;
  const effectiveActive = config.mode === "switch" ? active : false;

  const [isHovered, setIsHovered] = useState(false);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [isKeyboardPressed, setIsKeyboardPressed] = useState(false);

  const hasEmittedHoverRef = useRef(false);

  useEffect(() => {
    if (isDisabled) {
      setIsHovered(false);
      setIsPointerDown(false);
      setIsKeyboardPressed(false);
      hasEmittedHoverRef.current = false;
    }
  }, [isDisabled]);

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

  const handlePointerLeave = useCallback(() => {
    setIsHovered(false);
    setIsPointerDown(false);
    hasEmittedHoverRef.current = false;
  }, []);

  const handlePointerDown = useCallback(() => {
    if (isDisabled) {
      return;
    }
    setIsPointerDown(true);
  }, [isDisabled]);

  const endPointerPress = useCallback(() => {
    setIsPointerDown(false);
  }, []);

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

  const handleBlur = useCallback(() => {
    setIsKeyboardPressed(false);
  }, []);

  const handleKeyDown = useCallback(
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

  const handleKeyUp = useCallback((event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
      setIsKeyboardPressed(false);
    }
  }, []);

  // Activation relies on the native `click` event, which the browser (and
  // @testing-library/user-event) only fires when a pointer press begins and ends inside the
  // same interactive element, or when Enter/Space is used on a focused button.
  const handleClick = useCallback(() => {
    if (isDisabled) {
      return;
    }
    if (config.mode === "switch") {
      const newActive = !active;
      onEvent({ type: "press", id: config.id, active: newActive });
      onEvent({ type: "change", id: config.id, active: newActive });
    } else {
      onEvent({ type: "press", id: config.id, active: false });
    }
  }, [isDisabled, config.mode, config.id, active, onEvent]);

  const handleIconError = useCallback(() => {
    console.warn(`[PalantirButton] Icon failed to load for button "${config.id}".`);
  }, [config.id]);

  const pressedVisual = !isDisabled && ((isPointerDown && isHovered) || isKeyboardPressed);

  // A switch that's active should stay visually "pushed in" (translated down, sunken shadow),
  // not just spring back up to a raised/resting shape with a darker color once the pointer or
  // key is released — that spring-back is correct only for the transient, momentary tactile
  // press. `pressedVisual` alone still covers that momentary case (including the tactile feel of
  // pressing an active switch to toggle it back off); this adds the persistent "stays down"
  // look for a switch that is currently active.
  const isHeldDown = pressedVisual || (config.mode === "switch" && effectiveActive);

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

  const { backgroundColor: stateBackgroundColor, textColor: stateTextColor } = useMemo(() => {
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

  const shadows = useMemo(() => computeShadows(config.shadowCoefficient), [config.shadowCoefficient]);

  const currentShadow = isDisabled
    ? "none"
    : isHeldDown
      ? shadows.pressed
      : isHovered
        ? shadows.hover
        : shadows.resting;

  const radiusPx = useMemo(
    () => computeBorderRadiusPx(buttonHeightPx, config.roundingCoefficient),
    [buttonHeightPx, config.roundingCoefficient],
  );
  const radii = useMemo(
    () => computeJoinedCornerRadii(radiusPx, joinedPosition),
    [radiusPx, joinedPosition],
  );
  const margins = useMemo(
    () =>
      computeEffectiveInteractiveMargins(
        config.interactiveMarginX,
        config.interactiveMarginY,
        joinedPosition,
      ),
    [config.interactiveMarginX, config.interactiveMarginY, joinedPosition],
  );

  const hasBackgroundImage = !!config.backgroundImageSrc;

  const overlayColor = useMemo(() => {
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
  const hasIcon = !!config.iconSrc;

  const iconNode = hasIcon ? (
    <img
      src={config.iconSrc}
      alt={config.iconAlt ?? ""}
      onError={handleIconError}
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
    backgroundImage: hasBackgroundImage
      ? overlayColor
        ? `linear-gradient(${overlayColor}, ${overlayColor}), url(${config.backgroundImageSrc})`
        : `url(${config.backgroundImageSrc})`
      : undefined,
    backgroundSize: hasBackgroundImage
      ? overlayColor
        ? `100% 100%, ${backgroundSizeForFit}`
        : backgroundSizeForFit
      : undefined,
    backgroundPosition: hasBackgroundImage ? (overlayColor ? "center, center" : "center") : undefined,
    backgroundRepeat: hasBackgroundImage ? "no-repeat" : undefined,
    color: stateTextColor,
    fontSize: config.fontSizePx,
    fontWeight: 500,
    boxShadow: currentShadow,
    transform: `${pressTranslateTransform} ${hoverScaleTransform}`,
    transformOrigin: "center center",
    transition: "transform 120ms ease-out, box-shadow 120ms ease-out",
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
      onPointerUp={endPointerPress}
      onPointerCancel={endPointerPress}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onClick={handleClick}
    >
      <span className="palantir-button-visual-surface" style={visualSurfaceStyle}>
        <span style={contentStyle}>{contentChildren}</span>
      </span>
    </button>
  );
};
