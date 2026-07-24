import { Box, Callout, Flex, Skeleton, Theme } from "@radix-ui/themes";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PalantirButtonGroup } from "./components/PalantirButtonGroup.js";
import { useWidgetContext } from "./context.js";
import type { InternalButtonEvent } from "./buttonWidget.types.js";
import {
  computeInitialActiveButtonIds,
  DEFAULT_BUTTONS_JSON,
  NO_VALID_BUTTONS_MESSAGE,
  parseButtonsJson,
  parseGroupConfig,
  serializeActiveButtonIds,
} from "./buttonWidget.utils.js";
import { useDarkTheme } from "./useDarkTheme.js";

export const Widget: React.FC = () => {
  const { parameters, emitEvent } = useWidgetContext();
  const isDarkTheme = useDarkTheme();

  const isLoading = parameters.state === "not-started" || parameters.state === "loading";

  const buttonsJsonValue = parameters.values.buttonsJson;
  const buttonsResult = useMemo(
    () => parseButtonsJson(buttonsJsonValue ?? DEFAULT_BUTTONS_JSON),
    [buttonsJsonValue],
  );
  const buttons = buttonsResult.buttons;

  const groupConfig = useMemo(
    () =>
      parseGroupConfig({
        layoutMode: parameters.values.layoutMode,
        customGapPx: parameters.values.customGapPx,
        groupPaddingPx: parameters.values.groupPaddingPx,
        collapseMode: parameters.values.collapseMode,
        collapseStrategy: parameters.values.collapseStrategy,
        buttonHeightPx: parameters.values.buttonHeightPx,
        tooltipDelayMs: parameters.values.tooltipDelayMs,
        disabled: parameters.values.disabled,
      }),
    [
      parameters.values.layoutMode,
      parameters.values.customGapPx,
      parameters.values.groupPaddingPx,
      parameters.values.collapseMode,
      parameters.values.collapseStrategy,
      parameters.values.buttonHeightPx,
      parameters.values.tooltipDelayMs,
      parameters.values.disabled,
    ],
  );

  const [activeButtonIds, setActiveButtonIds] = useState<Set<string>>(() => new Set());

  // Initialize from `defaultActive` / reconcile with the host-provided `activeButtonIdsJson`
  // whenever it changes (including after this widget's own optimistic updates round-trip back).
  useEffect(() => {
    if (isLoading) {
      return;
    }
    setActiveButtonIds(computeInitialActiveButtonIds(buttons, parameters.values.activeButtonIdsJson));
  }, [isLoading, buttons, parameters.values.activeButtonIdsJson]);

  const handleButtonEvent = useCallback(
    (event: InternalButtonEvent) => {
      if (event.type === "hover") {
        emitEvent("buttonHovered", {
          parameterUpdates: {
            lastButtonId: event.id,
            lastButtonInteraction: "hover",
            lastButtonActive: event.active,
          },
        });
        return;
      }

      if (event.type === "press") {
        emitEvent("buttonPressed", {
          parameterUpdates: {
            lastButtonId: event.id,
            lastButtonInteraction: "press",
            lastButtonActive: event.active,
          },
        });
        return;
      }

      // "change"
      const nextActiveButtonIds = new Set(activeButtonIds);
      if (event.active) {
        nextActiveButtonIds.add(event.id);
      } else {
        nextActiveButtonIds.delete(event.id);
      }
      setActiveButtonIds(nextActiveButtonIds);

      emitEvent("buttonChanged", {
        parameterUpdates: {
          lastButtonId: event.id,
          lastButtonInteraction: "change",
          lastButtonActive: event.active,
          activeButtonIdsJson: serializeActiveButtonIds(nextActiveButtonIds),
        },
      });
    },
    [emitEvent, activeButtonIds],
  );

  return (
    <Theme appearance={isDarkTheme ? "dark" : "light"}>
      <Box p="2">
        {isLoading ? (
          <Skeleton>
            <Flex gap="2" align="center">
              <Box style={{ width: 120, height: groupConfig.buttonHeightPx, borderRadius: 8 }} />
              <Box style={{ width: 120, height: groupConfig.buttonHeightPx, borderRadius: 8 }} />
              <Box style={{ width: 120, height: groupConfig.buttonHeightPx, borderRadius: 8 }} />
            </Flex>
          </Skeleton>
        ) : buttonsResult.parseError ? (
          <Callout.Root color="red" role="alert">
            <Callout.Text>{buttonsResult.parseError}</Callout.Text>
          </Callout.Root>
        ) : buttons.length === 0 ? (
          <Callout.Root color="gray">
            <Callout.Text>{NO_VALID_BUTTONS_MESSAGE}</Callout.Text>
          </Callout.Root>
        ) : (
          <PalantirButtonGroup
            buttons={buttons}
            layoutMode={groupConfig.layoutMode}
            customGapPx={groupConfig.customGapPx}
            groupPaddingPx={groupConfig.groupPaddingPx}
            collapseMode={groupConfig.collapseMode}
            collapseStrategy={groupConfig.collapseStrategy}
            buttonHeightPx={groupConfig.buttonHeightPx}
            tooltipDelayMs={groupConfig.tooltipDelayMs}
            disabled={groupConfig.disabled}
            activeButtonIds={activeButtonIds}
            onButtonEvent={handleButtonEvent}
          />
        )}
      </Box>
    </Theme>
  );
};
