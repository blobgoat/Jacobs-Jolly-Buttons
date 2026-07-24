import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PalantirButtonGroupProps } from "../buttonWidget.types.js";
import {
  type CollapseInputButton,
  computeCollapsePlan,
  computeJoinedPosition,
} from "../buttonWidget.utils.js";
import { PalantirButton } from "./PalantirButton.js";

/**
 * Lays out a row of `PalantirButton`s according to the configured layout mode, and drives the
 * responsive icon-only collapse behavior using a `ResizeObserver` on the group container.
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
  collapseMode,
  collapseStrategy,
  buttonHeightPx,
  tooltipDelayMs,
  disabled,
  activeButtonIds,
  onButtonEvent,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [availableWidthPx, setAvailableWidthPx] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }
      const width = entry.contentRect.width;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
      rafRef.current = requestAnimationFrame(() => {
        setAvailableWidthPx(width);
        rafRef.current = null;
      });
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const [iconLoadedMap, setIconLoadedMap] = useState<Record<string, boolean>>({});

  const handleIconLoadStateChange = useCallback((buttonId: string, loaded: boolean) => {
    setIconLoadedMap((prev) => (prev[buttonId] === loaded ? prev : { ...prev, [buttonId]: loaded }));
  }, []);

  const forcedCollapsedIds = useMemo(() => {
    const set = new Set<string>();
    buttons.forEach((button) => {
      const iconLoaded = !!button.iconSrc && iconLoadedMap[button.id] === true;
      if (!iconLoaded || button.collapseMode === "never") {
        return;
      }
      if (button.collapseMode === "always" || collapseMode === "always") {
        set.add(button.id);
      }
    });
    return set;
  }, [buttons, collapseMode, iconLoadedMap]);

  const autoEligibleIds = useMemo(() => {
    const set = new Set<string>();
    if (collapseMode !== "auto") {
      return set;
    }
    buttons.forEach((button) => {
      const iconLoaded = !!button.iconSrc && iconLoadedMap[button.id] === true;
      if (!iconLoaded) {
        return;
      }
      if (button.collapseMode === "never" || button.collapseMode === "always") {
        return;
      }
      set.add(button.id);
    });
    return set;
  }, [buttons, collapseMode, iconLoadedMap]);

  const [autoCollapsedIds, setAutoCollapsedIds] = useState<Set<string>>(new Set());
  const [overflow, setOverflow] = useState(false);
  const autoCollapsedIdsRef = useRef<Set<string>>(autoCollapsedIds);

  useEffect(() => {
    autoCollapsedIdsRef.current = autoCollapsedIds;
  }, [autoCollapsedIds]);

  useEffect(() => {
    if (collapseMode !== "auto") {
      setAutoCollapsedIds(new Set());
      setOverflow(false);
      return;
    }
    if (availableWidthPx === null) {
      return;
    }

    const collapseInputButtons: CollapseInputButton[] = buttons.map((button) => ({
      config: button,
      hasIcon: !!button.iconSrc && iconLoadedMap[button.id] === true,
    }));

    const plan = computeCollapsePlan({
      buttons: collapseInputButtons,
      autoEligibleIds,
      forcedCollapsedIds,
      currentCollapsedAutoIds: autoCollapsedIdsRef.current,
      availableWidthPx,
      layoutMode,
      customGapPx,
      buttonHeightPx,
      collapseStrategy,
    });

    setAutoCollapsedIds(plan.collapsedIds);
    setOverflow(plan.overflow);
  }, [
    collapseMode,
    availableWidthPx,
    autoEligibleIds,
    forcedCollapsedIds,
    buttons,
    iconLoadedMap,
    layoutMode,
    customGapPx,
    buttonHeightPx,
    collapseStrategy,
  ]);

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "nowrap",
    alignItems: "center",
    boxSizing: "border-box",
    padding: groupPaddingPx,
    gap: layoutMode === "custom-gap" ? Math.max(0, customGapPx) : 0,
    justifyContent: layoutMode === "space-between" ? "space-between" : "flex-start",
    width: layoutMode === "space-between" ? "100%" : undefined,
    overflowX: "auto",
    overflowY: "hidden",
  };

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      data-testid="palantir-button-group"
      data-overflow={overflow ? "true" : "false"}
    >
      {buttons.map((button, index) => {
        const joinedPosition = computeJoinedPosition(index, buttons.length, layoutMode);
        const collapsed = forcedCollapsedIds.has(button.id) || autoCollapsedIds.has(button.id);
        return (
          <PalantirButton
            key={button.id}
            config={button}
            active={activeButtonIds.has(button.id)}
            collapsed={collapsed}
            groupDisabled={disabled}
            buttonHeightPx={buttonHeightPx}
            tooltipDelayMs={tooltipDelayMs}
            joinedPosition={joinedPosition}
            onEvent={onButtonEvent}
            onIconLoadStateChange={handleIconLoadStateChange}
          />
        );
      })}
    </div>
  );
};
