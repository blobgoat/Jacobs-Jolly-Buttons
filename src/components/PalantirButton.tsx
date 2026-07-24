import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PalantirButtonProps } from "../buttonWidget.types.js";
import {
  computeBorderRadiusPx,
  computeEffectiveInteractiveMargins,
  computeJoinedCornerRadii,
  computeShadows,
} from "../buttonWidget.utils.js";
import { ButtonTooltip } from "./ButtonTooltip.js";

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
  collapsed,
  groupDisabled,
  buttonHeightPx,
  tooltipDelayMs,
  joinedPosition,
  onEvent,
  onIconLoadStateChange,
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

  const handleIconLoad = useCallback(() => {
    onIconLoadStateChange(config.id, true);
  }, [onIconLoadStateChange, config.id]);

  const handleIconError = useCallback(() => {
    onIconLoadStateChange(config.id, false);
    console.warn(`[PalantirButton] Icon failed to load for button "${config.id}".`);
  }, [onIconLoadStateChange, config.id]);

  const pressedVisual = !isDisabled && ((isPointerDown && isHovered) || isKeyboardPressed);

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
    : pressedVisual
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
      onLoad={handleIconLoad}
      onError={handleIconError}
      style={{
        width: iconSizePx,
        height: iconSizePx,
        objectFit: "contain",
        pointerEvents: "none",
        flexShrink: 0,
        display: "block",
      }}
    />
  ) : null;

  let contentChildren: React.ReactNode;
  if (collapsed) {
    contentChildren = iconNode;
  } else if (config.iconPosition === "right") {
    contentChildren = (
      <>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{config.label}</span>
        {iconNode}
      </>
    );
  } else {
    contentChildren = (
      <>
        {iconNode}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{config.label}</span>
      </>
    );
  }

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
  };

  const visualSurfaceStyle: React.CSSProperties = {
    position: "relative",
    boxSizing: "border-box",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: buttonHeightPx,
    width: collapsed ? buttonHeightPx : undefined,
    padding: collapsed ? 0 : `${config.paddingY}px ${config.paddingX}px`,
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
    transform: pressedVisual ? `translateY(${shadows.translateYPx}px)` : "translateY(0px)",
    whiteSpace: "nowrap",
  };

  const contentStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: collapsed ? 0 : 8,
    width: "100%",
    height: "100%",
    overflow: "hidden",
  };

  const buttonElement = (
    <button
      type="button"
      disabled={isDisabled}
      aria-pressed={config.mode === "switch" ? effectiveActive : undefined}
      aria-label={collapsed ? config.label : undefined}
      data-button-id={config.id}
      data-collapsed={collapsed ? "true" : "false"}
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

  return (
    <ButtonTooltip label={config.label} delayMs={tooltipDelayMs} enabled={collapsed}>
      {buttonElement}
    </ButtonTooltip>
  );
};
