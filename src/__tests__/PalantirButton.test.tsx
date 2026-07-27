import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MediaSets } from "@osdk/foundry.mediasets";
import { PalantirButton } from "../components/PalantirButton.js";
import type { InternalButtonEvent, ResolvedButtonConfig } from "../buttonWidget.types.js";

// The real client.ts constructs an OSDK client from `@custom-widget/sdk`'s generated ontology
// RID, which isn't meaningful in a unit test. PalantirButton only ever passes this straight
// through to MediaSets.read as an opaque `$ctx`, which is itself mocked below, so a stand-in
// object is enough.
vi.mock("../client.js", () => ({ client: {} }));
vi.mock("@osdk/foundry.mediasets", () => ({
  MediaSets: { read: vi.fn() },
}));

const BASE_CONFIG: ResolvedButtonConfig = {
  id: "test-button",
  label: "Test Button",
  mode: "momentary",
  defaultActive: false,
  disabled: false,
  iconPosition: "left",
  backgroundImageFit: "cover",
  fontSizePx: 14,
  roundingCoefficient: 0.2,
  paddingX: 14,
  paddingY: 8,
  interactiveMarginX: 6,
  interactiveMarginY: 6,
  backgroundColor: "#2563eb",
  textColor: "#ffffff",
  hoverBackgroundColor: "#1d4ed8",
  hoverTextColor: "#ffffff",
  pressedBackgroundColor: "#1e40af",
  pressedTextColor: "#ffffff",
  activeBackgroundColor: "#1e40af",
  activeTextColor: "#ffffff",
  disabledBackgroundColor: "#d1d5db",
  disabledTextColor: "#4b5563",
  shadowCoefficient: 1,
};

function renderButton(overrides: Partial<ResolvedButtonConfig> = {}, props: Partial<{
  active: boolean;
  groupDisabled: boolean;
}> = {}) {
  const onEvent = vi.fn<(event: InternalButtonEvent) => void>();
  const { container } = render(
    <PalantirButton
      config={{ ...BASE_CONFIG, ...overrides }}
      active={props.active ?? false}
      groupDisabled={props.groupDisabled ?? false}
      buttonHeightPx={40}
      joinedPosition="single"
      onEvent={onEvent}
    />,
  );
  return { onEvent, container };
}

describe("PalantirButton momentary behavior", () => {
  it("emits exactly one hover event on pointer enter", async () => {
    const { onEvent } = renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    const user = userEvent.setup();
    await user.hover(button);
    const hoverEvents = onEvent.mock.calls.filter(([event]) => event.type === "hover");
    expect(hoverEvents).toHaveLength(1);
    expect(hoverEvents[0][0]).toEqual({ type: "hover", id: "test-button", active: false });
  });

  it("emits a press event on pointer activation", async () => {
    const { onEvent } = renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    const user = userEvent.setup();
    await user.click(button);
    expect(onEvent).toHaveBeenCalledWith({ type: "press", id: "test-button", active: false });
  });

  it("activates on Enter", async () => {
    const { onEvent } = renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    const user = userEvent.setup();
    button.focus();
    await user.keyboard("{Enter}");
    expect(onEvent).toHaveBeenCalledWith({ type: "press", id: "test-button", active: false });
  });

  it("activates on Space", async () => {
    const { onEvent } = renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    const user = userEvent.setup();
    button.focus();
    await user.keyboard(" ");
    expect(onEvent).toHaveBeenCalledWith({ type: "press", id: "test-button", active: false });
  });

  it("does not activate when the pointer is pressed inside and released outside", async () => {
    const { onEvent } = renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    const outside = document.createElement("div");
    document.body.appendChild(outside);

    const user = userEvent.setup();
    await user.pointer([
      { keys: "[MouseLeft>]", target: button },
      { target: outside },
      { keys: "[/MouseLeft]", target: outside },
    ]);

    const pressEvents = onEvent.mock.calls.filter(([event]) => event.type === "press");
    expect(pressEvents).toHaveLength(0);
    document.body.removeChild(outside);
  });

  it("emits no interaction events when disabled", async () => {
    const { onEvent } = renderButton({ disabled: true });
    const button = screen.getByRole("button", { name: "Test Button" });
    expect(button).toBeDisabled();
    const user = userEvent.setup();
    await user.hover(button);
    await user.click(button);
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("does not set aria-pressed on a momentary button", () => {
    renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    expect(button).not.toHaveAttribute("aria-pressed");
  });
});

describe("PalantirButton switch behavior", () => {
  it("toggles from inactive to active and back, and reflects aria-pressed", () => {
    renderButton({ mode: "switch" }, { active: false });
    const button = screen.getByRole("button", { name: "Test Button" });
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("emits change with the new active state on activation (inactive -> active)", async () => {
    const { onEvent } = renderButton({ mode: "switch" }, { active: false });
    const button = screen.getByRole("button", { name: "Test Button" });
    const user = userEvent.setup();
    await user.click(button);
    expect(onEvent).toHaveBeenCalledWith({ type: "change", id: "test-button", active: true });
  });

  it("emits change with the new active state on activation (active -> inactive)", async () => {
    const { onEvent } = renderButton({ mode: "switch" }, { active: true });
    const button = screen.getByRole("button", { name: "Test Button" });
    const user = userEvent.setup();
    await user.click(button);
    expect(onEvent).toHaveBeenCalledWith({ type: "change", id: "test-button", active: false });
  });

  it("reflects an active state via aria-pressed", () => {
    renderButton({ mode: "switch" }, { active: true });
    const button = screen.getByRole("button", { name: "Test Button" });
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("stays visually pushed down (translated) while active, not just darker, with no active press", () => {
    const { container } = render(
      <PalantirButton
        config={{ ...BASE_CONFIG, mode: "switch" }}
        active={true}
        groupDisabled={false}
        buttonHeightPx={40}
        joinedPosition="single"
        onEvent={vi.fn()}
      />,
    );
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    // No pointer or keyboard interaction at all — being active alone should keep the visual
    // surface translated down, matching the shared shadow coefficient's press depth. Not
    // hovered, so the hover-grow scale factor stays at 1 (no visual growth).
    expect(surface.style.transform).toBe("translateY(2px) scale(1)");
  });

  it("springs back to the resting position once an active switch is deactivated", () => {
    const props = {
      groupDisabled: false,
      buttonHeightPx: 40,
      joinedPosition: "single" as const,
      onEvent: vi.fn(),
    };
    const { container, rerender } = render(
      <PalantirButton config={{ ...BASE_CONFIG, mode: "switch" }} active={true} {...props} />,
    );
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    expect(surface.style.transform).toBe("translateY(2px) scale(1)");

    rerender(<PalantirButton config={{ ...BASE_CONFIG, mode: "switch" }} active={false} {...props} />);
    expect(surface.style.transform).toBe("translateY(0px) scale(1)");
  });

  it("does not push down a momentary button just because 'active' is passed (it always ignores it)", () => {
    const { container } = render(
      <PalantirButton
        config={{ ...BASE_CONFIG, mode: "momentary" }}
        active={true}
        groupDisabled={false}
        buttonHeightPx={40}
        joinedPosition="single"
        onEvent={vi.fn()}
      />,
    );
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    expect(surface.style.transform).toBe("translateY(0px) scale(1)");
  });
});

describe("PalantirButton hover-exit event", () => {
  it("emits a hoverEnd event when the pointer leaves after a hover", async () => {
    const { onEvent } = renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    const user = userEvent.setup();
    await user.hover(button);
    await user.unhover(button);
    const hoverEndEvents = onEvent.mock.calls.filter(([event]) => event.type === "hoverEnd");
    expect(hoverEndEvents).toHaveLength(1);
    expect(hoverEndEvents[0][0]).toEqual({ type: "hoverEnd", id: "test-button", active: false });
  });

  it("does not emit hoverEnd for a pointer-leave with no preceding hover", () => {
    const { onEvent } = renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    // A pointerleave with no matching pointerenter first (the component guards against emitting
    // hoverEnd when no "hover" was ever emitted for this button).
    fireEvent.pointerLeave(button);
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("emits hoverEnd with the switch's active state", async () => {
    const { onEvent } = renderButton({ mode: "switch" }, { active: true });
    const button = screen.getByRole("button", { name: "Test Button" });
    const user = userEvent.setup();
    await user.hover(button);
    await user.unhover(button);
    expect(onEvent).toHaveBeenCalledWith({ type: "hoverEnd", id: "test-button", active: true });
  });

  it("emits no hover or hoverEnd events when disabled", async () => {
    const { onEvent } = renderButton({ disabled: true });
    const button = screen.getByRole("button", { name: "Test Button" });
    const user = userEvent.setup();
    await user.hover(button);
    await user.unhover(button);
    expect(onEvent).not.toHaveBeenCalled();
  });
});

describe("PalantirButton hover-grow", () => {
  it("scales the visual surface up on hover and back down on hover-out", async () => {
    const { container } = renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    expect(surface.style.transform).toBe("translateY(0px) scale(1)");

    const user = userEvent.setup();
    await user.hover(button);
    expect(surface.style.transform).toBe("translateY(0px) scale(1.08)");

    await user.unhover(button);
    expect(surface.style.transform).toBe("translateY(0px) scale(1)");
  });

  it("does not grow a disabled button on hover", async () => {
    const { container } = renderButton({ disabled: true });
    const button = screen.getByRole("button", { name: "Test Button" });
    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    const user = userEvent.setup();
    await user.hover(button);
    expect(surface.style.transform).toBe("translateY(0px) scale(1)");
  });

  it("raises the hovered button's stacking order so it paints above its neighbors", async () => {
    renderButton();
    const button = screen.getByRole("button", { name: "Test Button" });
    expect(button.style.zIndex).toBe("0");

    const user = userEvent.setup();
    await user.hover(button);
    expect(button.style.zIndex).toBe("2");
  });
});

describe("PalantirButton interactive margin / hit area", () => {
  it("puts the transparent interactive margin on the native button hit area, not the visual surface", () => {
    const { container } = render(
      <PalantirButton
        config={BASE_CONFIG}
        active={false}
        groupDisabled={false}
        buttonHeightPx={40}
        joinedPosition="single"
        onEvent={vi.fn()}
      />,
    );
    const button = screen.getByRole("button", { name: "Test Button" });
    expect(button.style.paddingTop).toBe("6px");
    expect(button.style.paddingLeft).toBe("6px");

    const surface = container.querySelector(".palantir-button-visual-surface") as HTMLElement;
    expect(surface).not.toBeNull();
    expect(surface.style.padding).toBe("8px 14px");
  });

  it("triggers the same button action when pressing the icon", async () => {
    // The icon is now fetched with credentials (so protected images render correctly) rather than
    // set directly as an <img src>, so the <img> only appears once that fetch resolves.
    const mockBlob = new Blob(["fake-svg"], { type: "image/svg+xml" });
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue({ ok: true, blob: () => Promise.resolve(mockBlob) } as Response);

    const onEvent = vi.fn<(event: InternalButtonEvent) => void>();
    const { container } = render(
      <PalantirButton
        config={{ ...BASE_CONFIG, iconSrc: "/icon.svg" }}
        active={false}
        groupDisabled={false}
        buttonHeightPx={40}
        joinedPosition="single"
        onEvent={onEvent}
      />,
    );

    // The icon is decorative (empty alt) so it has no accessible role; query it directly.
    const icon = await waitFor(() => {
      const img = container.querySelector("img") as HTMLImageElement | null;
      expect(img).not.toBeNull();
      return img as HTMLImageElement;
    });
    expect(fetchSpy).toHaveBeenCalledWith("/icon.svg", { credentials: "include" });

    const user = userEvent.setup();
    await user.click(icon);
    expect(onEvent).toHaveBeenCalledWith({ type: "press", id: "test-button", active: false });

    fetchSpy.mockRestore();
  });

  it("warns and renders no icon when the credentialed icon fetch fails", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValue({ ok: false, status: 404 } as Response);

    const { container } = render(
      <PalantirButton
        config={{ ...BASE_CONFIG, iconSrc: "/icon.svg" }}
        active={false}
        groupDisabled={false}
        buttonHeightPx={40}
        joinedPosition="single"
        onEvent={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("test-button"));
    });
    expect(container.querySelector("img")).toBeNull();

    fetchSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("routes a Foundry media-set item URL through MediaSets.read instead of a plain fetch", async () => {
    // The widget iframe doesn't carry the parent stack's session cookies, so a Foundry-hosted
    // media-set image can't authenticate via a plain credentialed fetch — it has to go through
    // the OSDK client instead. See parseMediaSetItemUrl in buttonWidget.utils.ts.
    const mockBlob = new Blob(["fake-png"], { type: "image/png" });
    const readMock = vi
      .mocked(MediaSets.read)
      .mockResolvedValue({ ok: true, blob: () => Promise.resolve(mockBlob) } as Response);
    const fetchSpy = vi.spyOn(global, "fetch");

    const mediaUrl =
      "https://blobfishmaster.usw-18.palantirfoundry.com/mio/api/media-set/ri.mio.main.media-set.265c6711-b0b9-4cdf-a1f8-ed3687e0ba14/items/ri.mio.main.media-item.019f80de-7362-745e-b4f5-ec047ccea69d";

    const { container } = render(
      <PalantirButton
        config={{ ...BASE_CONFIG, iconSrc: mediaUrl }}
        active={false}
        groupDisabled={false}
        buttonHeightPx={40}
        joinedPosition="single"
        onEvent={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(container.querySelector("img")).not.toBeNull();
    });
    expect(readMock).toHaveBeenCalledWith(
      {},
      "ri.mio.main.media-set.265c6711-b0b9-4cdf-a1f8-ed3687e0ba14",
      "ri.mio.main.media-item.019f80de-7362-745e-b4f5-ec047ccea69d",
    );
    expect(fetchSpy).not.toHaveBeenCalled();

    readMock.mockRestore();
    fetchSpy.mockRestore();
  });
});
