import { Tooltip as RadixTooltip } from "radix-ui";
import React from "react";

export interface ButtonTooltipProps {
  /** Full label text to show inside the tooltip. */
  label: string;
  /** Hover/focus delay before the tooltip appears, in milliseconds. */
  delayMs: number;
  /**
   * Whether the tooltip is allowed to appear at all. Expanded buttons pass `false`
   * so that the tooltip is fully unmounted (and therefore cannot be shown).
   */
  enabled: boolean;
  children: React.ReactElement;
}

const TOOLTIP_CONTENT_STYLE: React.CSSProperties = {
  backgroundColor: "rgba(0, 0, 0, 0.92)",
  color: "#ffffff",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 14,
  lineHeight: 1.2,
  maxWidth: 240,
  boxShadow: "0 4px 10px rgba(0, 0, 0, 0.25)",
  pointerEvents: "none",
  zIndex: 50,
  wordBreak: "break-word",
};

/**
 * A black, white-text tooltip shown above a collapsed button. Built directly on the
 * `radix-ui` Tooltip primitive (not `@radix-ui/themes` Tooltip) so that the black
 * appearance is guaranteed regardless of the active Radix Theme color scale.
 */
export const ButtonTooltip: React.FC<ButtonTooltipProps> = ({
  label,
  delayMs,
  enabled,
  children,
}) => {
  if (!enabled) {
    return children;
  }

  return (
    <RadixTooltip.Root delayDuration={delayMs} disableHoverableContent>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side="top"
          sideOffset={6}
          collisionPadding={8}
          style={TOOLTIP_CONTENT_STYLE}
        >
          {label}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
};
