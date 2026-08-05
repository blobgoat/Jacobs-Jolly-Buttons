import { Box, Callout, Flex, Skeleton, Theme } from "@radix-ui/themes";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PalantirButtonGroup } from "./components/PalantirButtonGroup.js";
import { useWidgetContext } from "./context.js";
import type { InternalButtonEvent } from "./buttonWidget.types.js";
import {
  activeButtonIdsToArray,
  applyButtonSchemes,
  applyButtonVisibilityAndDisabled,
  areButtonIdSetsEqual,
  AUTO_HEIGHT_ANIMATION_BASIS_PX,
  computeInitialActiveButtonIds,
  computeNextActiveButtonIds,
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
  const groupConfig = useMemo(
    () =>
      parseGroupConfig({
        layoutMode: parameters.values.layoutMode,
        orientation: parameters.values.orientation,
        selectionMode: parameters.values.selectionMode,
        customGapPx: parameters.values.customGapPx,
        groupPaddingPx: parameters.values.groupPaddingPx,
        buttonHeightPx: parameters.values.buttonHeightPx,
        buttonVerticalPaddingPx: parameters.values.buttonVerticalPaddingPx,
        disabled: parameters.values.disabled,

        primaryBackgroundColor: parameters.values.primaryBackgroundColor,
        primaryTextColor: parameters.values.primaryTextColor,
        primaryHoverBackgroundColor: parameters.values.primaryHoverBackgroundColor,
        primaryHoverTextColor: parameters.values.primaryHoverTextColor,
        primaryPressedBackgroundColor: parameters.values.primaryPressedBackgroundColor,
        primaryPressedTextColor: parameters.values.primaryPressedTextColor,
        primaryFontSizePx: parameters.values.primaryFontSizePx,

        secondaryBackgroundColor: parameters.values.secondaryBackgroundColor,
        secondaryTextColor: parameters.values.secondaryTextColor,
        secondaryHoverBackgroundColor: parameters.values.secondaryHoverBackgroundColor,
        secondaryHoverTextColor: parameters.values.secondaryHoverTextColor,
        secondaryPressedBackgroundColor: parameters.values.secondaryPressedBackgroundColor,
        secondaryPressedTextColor: parameters.values.secondaryPressedTextColor,
        secondaryFontSizePx: parameters.values.secondaryFontSizePx,

        tertiaryBackgroundColor: parameters.values.tertiaryBackgroundColor,
        tertiaryTextColor: parameters.values.tertiaryTextColor,
        tertiaryHoverBackgroundColor: parameters.values.tertiaryHoverBackgroundColor,
        tertiaryHoverTextColor: parameters.values.tertiaryHoverTextColor,
        tertiaryPressedBackgroundColor: parameters.values.tertiaryPressedBackgroundColor,
        tertiaryPressedTextColor: parameters.values.tertiaryPressedTextColor,
        tertiaryFontSizePx: parameters.values.tertiaryFontSizePx,

        roundingCoefficient: parameters.values.roundingCoefficient,

        primaryShadowCoefficient: parameters.values.primaryShadowCoefficient,
        secondaryShadowCoefficient: parameters.values.secondaryShadowCoefficient,
        tertiaryShadowCoefficient: parameters.values.tertiaryShadowCoefficient,
      }),
    [
      parameters.values.layoutMode,
      parameters.values.orientation,
      parameters.values.selectionMode,
      parameters.values.customGapPx,
      parameters.values.groupPaddingPx,
      parameters.values.buttonHeightPx,
      parameters.values.buttonVerticalPaddingPx,
      parameters.values.disabled,
      parameters.values.primaryBackgroundColor,
      parameters.values.primaryTextColor,
      parameters.values.primaryHoverBackgroundColor,
      parameters.values.primaryHoverTextColor,
      parameters.values.primaryPressedBackgroundColor,
      parameters.values.primaryPressedTextColor,
      parameters.values.primaryFontSizePx,
      parameters.values.secondaryBackgroundColor,
      parameters.values.secondaryTextColor,
      parameters.values.secondaryHoverBackgroundColor,
      parameters.values.secondaryHoverTextColor,
      parameters.values.secondaryPressedBackgroundColor,
      parameters.values.secondaryPressedTextColor,
      parameters.values.secondaryFontSizePx,
      parameters.values.tertiaryBackgroundColor,
      parameters.values.tertiaryTextColor,
      parameters.values.tertiaryHoverBackgroundColor,
      parameters.values.tertiaryHoverTextColor,
      parameters.values.tertiaryPressedBackgroundColor,
      parameters.values.tertiaryPressedTextColor,
      parameters.values.tertiaryFontSizePx,
      parameters.values.roundingCoefficient,
      parameters.values.primaryShadowCoefficient,
      parameters.values.secondaryShadowCoefficient,
      parameters.values.tertiaryShadowCoefficient,
    ],
  );

  // Hidden buttons are dropped entirely for rendering; force-disabled ids are merged onto the
  // remainder; each remaining button's colorScheme/fontSizeScheme/shadowScheme (each defaulting
  // to "none") is then applied, overriding its own inline buttonsJson fields whenever it isn't
  // "none", and its rounding is always overwritten with the group's single universal
  // roundingCoefficient — see applyButtonSchemes. Active-state tracking below stays keyed off the
  // full, unfiltered `buttons` list so a switch's state is preserved (and restored) even while
  // it's hidden or force-disabled.
  const displayButtons = useMemo(
    () =>
      applyButtonSchemes(
        applyButtonVisibilityAndDisabled(buttons, hiddenButtonIds, disabledButtonIds),
        groupConfig,
      ),
    [buttons, hiddenButtonIds, disabledButtonIds, groupConfig],
  );

  // Loading-state placeholder only: buttonHeightPx being null (auto-fill mode) has nothing to
  // measure yet since there are no real buttons rendered, so the skeleton falls back to the same
  // representative constant used elsewhere for buttonHeightPx-unaware cosmetic calculations.
  const skeletonHeightPx = groupConfig.buttonHeightPx ?? AUTO_HEIGHT_ANIMATION_BASIS_PX;

  const [activeButtonIds, setActiveButtonIds] = useState<Set<string>>(() => new Set());

  // Initialize from `defaultActive` / reconcile with the host-provided `activeButtonIdsJson`
  // whenever it changes (including after this widget's own optimistic updates round-trip back).
  //
  // This must NOT unconditionally overwrite `activeButtonIds` with whatever this recomputes,
  // even though `parameters.values.activeButtonIdsJson` is the dependency that triggers it. A
  // click already updates `activeButtonIds` optimistically (see "change" below) before this
  // parameter has round-tripped back through the host at all; if the host's `parameters.values`
  // object gets rebuilt (new array reference, identical content) for any *unrelated* reason
  // while that round trip is still in flight — another parameter changing, an SDK heartbeat,
  // whatever — this effect re-runs, and overwriting with a same-content-but-fresh Set would
  // force PalantirButtonGroup and every button to re-render for no reason. Worse, if the
  // round-tripped value briefly still reflects the *pre-click* state, a blind overwrite would
  // regress the just-clicked switch back to its old value for a render and then snap forward
  // again once the real echo lands — which is exactly a press/active transition playing twice.
  // Comparing by content and bailing out (returning the same Set instance) when nothing
  // genuinely changed avoids both: React skips the render entirely when the updater returns the
  // existing state reference, so a same-content echo is a no-op, and a real content difference
  // (the host's actual authoritative value) still applies normally.
  useEffect(() => {
    if (isLoading) {
      return;
    }
    const reconciled = computeInitialActiveButtonIds(
      buttons,
      parameters.values.activeButtonIdsJson,
      groupConfig.selectionMode,
    );
    setActiveButtonIds((current) => (areButtonIdSetsEqual(current, reconciled) ? current : reconciled));
  }, [isLoading, buttons, parameters.values.activeButtonIdsJson, groupConfig.selectionMode]);

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

      if (event.type === "unpress") {
        emitEvent("buttonUnpressed", {
          parameterUpdates: {
            lastButtonId: event.id,
            lastButtonInteraction: "unpress",
            lastButtonActive: event.active,
          },
        });
        return;
      }

      // "change"
      const nextActiveButtonIds = computeNextActiveButtonIds(activeButtonIds, event, groupConfig.selectionMode);
      if (areButtonIdSetsEqual(nextActiveButtonIds, activeButtonIds)) {
        // "single-required" refusing a deactivation (see computeNextActiveButtonIds) is the only
        // way this is reachable — PalantirButton's commitActivation already blocks the click
        // itself from firing this event in the first place for a single-required group's sole
        // active button. Nothing about the group's active state actually changed, so treat this
        // as a genuine no-op: no re-render, no event emitted.
        return;
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
    [emitEvent, activeButtonIds, groupConfig.selectionMode],
  );

  return (
    <Theme appearance={isDarkTheme ? "dark" : "light"} hasBackground={false}>
      <Flex
        direction="column"
        align="center"
        // In "row" orientation the button group is always bounded to exactly this available
        // space (see PalantirButtonGroup), so it never overflows — "center" keeps the prior,
        // unaffected look. In "column" orientation the stack is deliberately content-sized and
        // can grow taller than this box (see PalantirButtonGroup's containerStyle.flex), so it's
        // anchored to the top ("start") instead: centering content that might scroll would look
        // odd, cutting content evenly off both ends rather than letting the user scroll down from
        // a stable top edge.
        justify={groupConfig.orientation === "column" ? "start" : "center"}
        p="2"
        style={{
          width: "100%",
          height: "100%",
          minWidth: "0px",
          minHeight: "0px",
          boxSizing: "border-box",
          // "row" orientation's button group is always bounded to exactly this available space,
          // so nothing can ever overflow it — "hidden" is just a safety net. "column"
          // orientation intentionally lets the button stack grow taller than this box so it can
          // "extend" past a short widget tile instead of squishing every button — "auto" means
          // that excess is reachable by scrolling instead of being silently clipped away.
          overflowY: groupConfig.orientation === "column" ? "auto" : "hidden",
        }}
      >
        {isLoading ? (
          <Skeleton>
            <Flex gap="2" align="center" direction={groupConfig.orientation === "column" ? "column" : "row"}>
              <Box style={{ width: 120, height: skeletonHeightPx, borderRadius: 8 }} />
              <Box style={{ width: 120, height: skeletonHeightPx, borderRadius: 8 }} />
              <Box style={{ width: 120, height: skeletonHeightPx, borderRadius: 8 }} />
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
              orientation={groupConfig.orientation}
              selectionMode={groupConfig.selectionMode}
              customGapPx={groupConfig.customGapPx}
              groupPaddingPx={groupConfig.groupPaddingPx}
              buttonHeightPx={groupConfig.buttonHeightPx}
              buttonVerticalPaddingPx={groupConfig.buttonVerticalPaddingPx}
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
