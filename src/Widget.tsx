import { Box, Callout, Flex, Skeleton, Theme } from "@radix-ui/themes";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PalantirButtonGroup } from "./components/PalantirButtonGroup.js";
import { useWidgetContext } from "./context.js";
import type { InternalButtonEvent } from "./buttonWidget.types.js";
import {
  activeButtonIdsToArray,
  applyButtonVisibilityAndDisabled,
  computeInitialActiveButtonIds,
  DEFAULT_BUTTONS_JSON,
  NO_VALID_BUTTONS_MESSAGE,
  parseButtonsJson,
  parseGroupConfig,
  toButtonIdSet,
} from "./buttonWidget.utils.js";
import { useDarkTheme } from "./useDarkTheme.js";

export const Widget: React.FC = () => {
  const { parameters, emitEvent } = useWidgetContext();
  const isDarkTheme = useDarkTheme();

  const isLoading = parameters.state === "not-started" || parameters.state === "loading";

  const buttonsJsonValue = parameters.values.buttonsJson;
  // Workshop delivers an unset string parameter as "" (there is no manifest-level default in
  // this SDK), not `undefined` — so `?? DEFAULT_BUTTONS_JSON` alone never catches it and
  // `JSON.parse("")` throws, surfacing as "The button configuration is not valid JSON." for any
  // widget instance that has never had buttonsJson explicitly configured. Treat any blank /
  // whitespace-only value the same as a missing one.
  const effectiveButtonsJson =
    typeof buttonsJsonValue === "string" && buttonsJsonValue.trim().length > 0
      ? buttonsJsonValue
      : DEFAULT_BUTTONS_JSON;
  const buttonsResult = useMemo(
    () => parseButtonsJson(effectiveButtonsJson),
    [effectiveButtonsJson],
  );
  const buttons = buttonsResult.buttons;

  const disabledButtonIds = useMemo(
    () => toButtonIdSet(parameters.values.disabledButtonIdsArray),
    [parameters.values.disabledButtonIdsArray],
  );
  const hiddenButtonIds = useMemo(
    () => toButtonIdSet(parameters.values.hiddenButtonIdsArray),
    [parameters.values.hiddenButtonIdsArray],
  );
  // Hidden buttons are dropped entirely for rendering; force-disabled ids are merged onto the
  // remainder. Active-state tracking below stays keyed off the full, unfiltered `buttons` list so
  // a switch's state is preserved (and restored) even while it's hidden or force-disabled.
  const displayButtons = useMemo(
    () => applyButtonVisibilityAndDisabled(buttons, hiddenButtonIds, disabledButtonIds),
    [buttons, hiddenButtonIds, disabledButtonIds],
  );

  const groupConfig = useMemo(
    () =>
      parseGroupConfig({
        layoutMode: parameters.values.layoutMode,
        customGapPx: parameters.values.customGapPx,
        groupPaddingPx: parameters.values.groupPaddingPx,
        buttonHeightPx: parameters.values.buttonHeightPx,
        disabled: parameters.values.disabled,
      }),
    [
      parameters.values.layoutMode,
      parameters.values.customGapPx,
      parameters.values.groupPaddingPx,
      parameters.values.buttonHeightPx,
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

      if (event.type === "hoverEnd") {
        emitEvent("buttonHoverEnded", {
          parameterUpdates: {
            lastButtonId: event.id,
            lastButtonInteraction: "hoverEnd",
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
          activeButtonIdsJson: activeButtonIdsToArray(nextActiveButtonIds),
        },
      });
    },
    [emitEvent, activeButtonIds],
  );

  return (
    <Theme appearance={isDarkTheme ? "dark" : "light"} hasBackground={false}>
      <Flex
        direction="column"
        align="center"
        justify="center"
        p="2"
        style={{
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          overflowY: "hidden",
        }}
      >
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
            <Callout.Text style={{ whiteSpace: "pre-line" }}>
              {buttonsResult.parseError}
            </Callout.Text>
          </Callout.Root>
        ) : buttons.length === 0 ? (
          <Callout.Root color="gray" role="alert">
            <Callout.Text style={{ whiteSpace: "pre-line" }}>
              {buttonsResult.issues.length > 0
                ? [NO_VALID_BUTTONS_MESSAGE, ...buttonsResult.issues].join("\n")
                : NO_VALID_BUTTONS_MESSAGE}
            </Callout.Text>
          </Callout.Root>
        ) : (
          <>
            {buttonsResult.issues.length > 0 && (
              <Callout.Root color="amber" role="status" mb="2">
                <Callout.Text style={{ whiteSpace: "pre-line" }}>
                  {[
                    `${buttonsResult.issues.length} button ${
                      buttonsResult.issues.length === 1 ? "entry was" : "entries were"
                    } skipped:`,
                    ...buttonsResult.issues,
                  ].join("\n")}
                </Callout.Text>
              </Callout.Root>
            )}
            <PalantirButtonGroup
              buttons={displayButtons}
              layoutMode={groupConfig.layoutMode}
              customGapPx={groupConfig.customGapPx}
              groupPaddingPx={groupConfig.groupPaddingPx}
              buttonHeightPx={groupConfig.buttonHeightPx}
              disabled={groupConfig.disabled}
              activeButtonIds={activeButtonIds}
              onButtonEvent={handleButtonEvent}
            />
          </>
        )}
      </Flex>
    </Theme>
  );
};
