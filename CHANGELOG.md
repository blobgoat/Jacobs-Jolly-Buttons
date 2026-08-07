# Changelog

All notable changes to this widget are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **`groupBackgroundColor`** (group-level, string, default `"transparent"`): explicit background
  paint on the button group's own container (behind/around the buttons, inside `groupPaddingPx`).
  Previously the container simply had no `background-color` set at all, relying on nothing further
  up the ancestor chain (Theme's `hasBackground={false}`, `html`/`body`'s own
  `background-color: transparent`) ever painting something opaque underneath it — which held up in
  every part of this codebase we could inspect, but apparently didn't always hold up once actually
  embedded in a Workshop tile. This parameter makes the paint explicit and configurable instead of
  implicit, so it wins regardless of the actual cause.

### Changed

- Merged the `infoOnShadowScheme` "Info" toggle into `infoOnColorScheme` (both documented the same
  `colorScheme`/`fontSizeScheme`/`shadowScheme` enum shape) to free a parameter slot for
  `groupBackgroundColor` — Workshop's 50-parameter budget was already fully used.

- **`selectionMode`** (group-level, `"independent"` \| `"single"` \| `"single-required"`, default
  `"independent"`): governs how the group's switch buttons' active state relates to each other.
  `"independent"` is unchanged from before — every switch tracks its own active state with no
  relation to any other. `"single"` turns the group into a classic radio-button group: activating
  a switch deactivates every other active switch, so at most one is ever active; deactivating the
  currently active one is still allowed, bringing the group back to zero active. `"single-required"`
  behaves the same way for activation, but refuses to ever drop the group from one active switch
  back down to zero — once a switch is active (from a click, or from a button's own
  `defaultActive`), clicking it again to deselect it is a no-op; the only way to change the
  selection is to activate a different switch. A `"single-required"` group can still start out with
  none active, if nothing sets `defaultActive` and the host hasn't supplied `activeButtonIdsJson` —
  that's the one state the "always one active" rule doesn't cover, since nothing's been activated
  yet. Only affects switch-mode buttons; momentary buttons have no persistent active state either
  way.

## [5.0.0] - 2026-08-05

### Added

- **`buttonVerticalPaddingPx`** (group-level, 0–64px, default `0`): vertical layout space placed
  above and below every button, outside the button's own height. It's independent of a button's
  internal `paddingY` (inner content spacing) and its `interactiveMarginY` (transparent hit
  area) — both continue to work exactly as before.
- **Auto-fill height for `buttonHeightPx`**: leaving `buttonHeightPx` unconfigured, or setting it
  to a negative number, now makes every button automatically fill the widget's available height,
  instead of falling back to a fixed 40px. Set it to a non-negative number for the previous
  fixed-height behavior.
- **`unpress` / `buttonUnpressed` event**: fires when a switch button becomes deselected. Pairs
  with the existing `press` / `buttonPressed` event, which for switch buttons now fires only when
  the toggle *selects* it (see Changed, below). A momentary button has no persistent selected
  state, so it's unaffected — it still always fires `press` and never fires `unpress`.
- **3 named color/font-size schemes** — `"primary"`, `"secondary"`, `"tertiary"` — each configured
  once at the group level via 6 new colors (default/hover/pressed × background/text) plus a font
  size, i.e. `{primary|secondary|tertiary}BackgroundColor`, `*TextColor`, `*HoverBackgroundColor`,
  `*HoverTextColor`, `*PressedBackgroundColor`, `*PressedTextColor` (18 fields total), and
  `{primary|secondary|tertiary}FontSizePx` (3 fields). Each button opts into one via two new
  per-button `buttonsJson` fields, **`colorScheme`** and **`fontSizeScheme`** — independent of
  each other, so a button can mix e.g. secondary colors with the tertiary font size. Both default
  to `"none"` when unset, which keeps that button's own inline fields (`backgroundColor`,
  `hoverBackgroundColor`, `fontSizePx`, etc.) exactly as before — schemes are opt-in. Set either
  to `"primary"`/`"secondary"`/`"tertiary"` to opt in: **a scheme other than `"none"` always
  overrides that button's own inline fields in `buttonsJson`, even when both are set** — the
  group-level scheme wins.
- **Extended the scheme system to shadow depth.** Each of the 3 named schemes now also carries a
  `{primary|secondary|tertiary}ShadowCoefficient` (0–4, default `1`) — 3 new group-level fields.
  A new per-button `buttonsJson` field, **`shadowScheme`**, opts a button into them, following the
  exact same pattern as `colorScheme`/`fontSizeScheme`: defaults to `"none"` (keeps that button's
  own inline `shadowCoefficient`), is independent of the other 2 axes, and — once set to a named
  scheme — always overrides that button's own inline field.
- **Corner rounding is now a single universal group-level `roundingCoefficient`** (0–0.5, default
  `0.2`) that always applies to every button — unlike color/font size/shadow, it's not a 3-way
  scheme and there's no per-button opt-in/opt-out. The per-button `roundingCoefficient` field has
  been removed from `buttonsJson`; buttons already configuring it will simply have that JSON
  ignored.
- **`orientation`** (group-level, `"row"` \| `"column"`, default `"row"`): lays the button group
  out vertically instead of only horizontally. `"row"` is unchanged from before this existed.
  `buttonHeightPx` behaves like a direct rotation of its row meaning onto whichever axis
  `orientation` makes the "main" one: left unconfigured/negative, buttons equally share the
  available space and **grow to fill it** if there's room to spare (in `"column"` orientation
  this means buttons expand to fill up the available height, mirroring `"row"` orientation's
  fill behavior exactly, rather than staying small); set to a fixed number, every button is
  exactly that size instead and doesn't grow — in `"column"` orientation, that lets a stack with
  more buttons than fit **extend past the widget's own tile height** instead of being squeezed,
  with the widget's outer container becoming vertically scrollable in this orientation so nothing
  is lost. `layoutMode`'s three values (`joined`/`custom-gap`/`space-between`) now apply along
  whichever axis `orientation` is set to: e.g. a `"joined"` chain rounds its top/bottom seam
  corners in `"column"` orientation instead of left/right, and gaps apply vertically instead of
  horizontally.

### Changed

- **No more separate "active" color.** A switch button that's selected now reuses its pressed
  colors (`pressedBackgroundColor`/`pressedTextColor`, or the chosen scheme's pressed colors)
  instead of a dedicated `activeBackgroundColor`/`activeTextColor` pair — visually, being active
  now looks the same as being actively pressed, just persistent. These two per-button fields have
  been removed; buttons already configuring them will simply have that JSON ignored.
- **No more separate "disabled" color.** A disabled button now always renders its normal
  default/unpressed colors at reduced opacity, rather than a dedicated
  `disabledBackgroundColor`/`disabledTextColor` pair — the fade itself signals disabled,
  regardless of the button's actual colors. These two per-button fields have been removed;
  buttons already configuring them will simply have that JSON ignored.
- **Merged the `infoOnFontSizeScheme` info toggle into `infoOnColorScheme`** (now documenting both
  `colorScheme` and `fontSizeScheme` together) to stay within Workshop's 50-parameter cap after
  adding `orientation`. Purely a documentation-panel change — neither toggle's boolean value was
  ever read, so this has no functional effect.

- **Buttons now automatically divide and fill the available group width**, equally, in every
  `layoutMode` — `joined`, `custom-gap`, and `space-between` — using CSS flexbox instead of
  natural (content-based) sizing.
- **`space-between` no longer uses `justify-content: space-between`** to distribute content-sized
  buttons; it now uses the same equal-width columns as the other modes, just without the joined
  seam/corner treatment, and now always inserts a fixed 24px gap between buttons (`customGapPx`
  has no effect in this mode — that only applies to `custom-gap`). The `"space-between"`
  configuration value itself is unchanged for backward compatibility — only its visual behavior
  changed.
- **Horizontal scrolling on overflow has been removed.** The button group no longer scrolls when
  its content doesn't fit; buttons instead shrink together (down to `min-width: 0`) to stay
  within the widget.
- **`buttonHeightPx`'s clamp range raised from 28–96px to 28–240px.** The group is also now
  bounded to the widget's real available height (rather than sizing independently of it), so an
  oversized or auto-filled button — and its hover-grow animation — can never render or animate
  past the widget's own boundary.
- **For switch buttons, `press` / `buttonPressed` now fires only when the toggle results in the
  button becoming selected** (previously it fired on every toggle, in both directions). Use the
  new `unpress` / `buttonUnpressed` event for the deselect case. `change` / `buttonChanged` is
  unaffected and remains the event to use for tracking persisted active state either way.

### Fixed

- Fixed a layout bug where the button group's own box (including the padding reserved for the
  hover/press animation) could size itself independently of the widget's real available height.
  In a short widget, or with a large `buttonVerticalPaddingPx`, this let the surrounding container
  clip the group unevenly — most noticeably cutting off the hover-grow animation partway through.
  The group is now bounded to the widget's actual available height via `flex: 1 1 auto` +
  `min-height: 0`, so clipping only ever happens when content genuinely can't fit.
- Fixed a root-level CSS issue where `height: 100%` never resolved to real pixels because `html`,
  `body`, and `#root` had no definite height anywhere in the chain back to the real viewport /
  host container. This silently broke any height-relative sizing — most visibly, it's what made
  `buttonHeightPx` auto-fill mode not actually expand vertically (only width was ever affected,
  since width defaults to filling its parent while height does not).
- Fixed the hover-grow and press-down animations interfering with each other. Both used to be
  combined into a single `transform` value (`translateY(...) scale(...)`) on the same element,
  which composes them into one coordinate-space chain — scaling a translated element visually
  distorts how far the translate reads as moving it, and vice versa, so pressing a hovered button
  (or hovering a pressed one) looked subtly different from doing either alone. They're now split
  across two nested layers (an outer layer that only ever translates, an inner one that only ever
  scales), so each transform lives in its own coordinate space and neither affects the other.
- Fixed a switch button's press-down animation and color sometimes visibly flickering or briefly
  reverting right after a click. `Widget.tsx` reconciles its `activeButtonIds` state against the
  host-provided `activeButtonIdsJson` parameter in a `useEffect` that re-runs whenever that
  parameter changes — including the round trip triggered by the widget's own optimistic update
  after a click. That effect unconditionally overwrote `activeButtonIds`, so if the parameter's
  array reference changed for any reason (an unrelated parameter update, an SDK refresh, a
  same-content re-delivery) or briefly still reflected the pre-click value while the real echo
  was still in flight, the just-clicked button's state — and with it, its press-down translate and
  color — could snap back and then forward again, reading as the animation "playing twice" or
  the wrong color showing momentarily. Reconciliation now compares the incoming value by content
  and only actually updates state (and re-renders) when it genuinely differs.
- Fixed a second, related cause of the same flicker, most noticeable exactly when the host is
  laggy or another parameter is updating around the same time as a click. `PalantirButton`'s
  `pendingActive` (its locally-known outcome of a click, held until the host's `active` prop
  round-trips back to confirm it — see the comment on its declaration) used to release control
  back to that prop the instant it first agreed, on any single render. Parameter delivery around a
  click isn't guaranteed to be a single, in-order round trip — an unrelated parameter update, or a
  stale/queued redelivery, can transiently make `active` agree for one render and then revert
  before the real, settled value lands. Releasing on that first coincidental match handed control
  back right as it was about to swing the wrong way, which is exactly a lag-correlated flicker.
  `pendingActive` now only releases once `active` has agreed with it continuously for a 300ms
  settle window (`PENDING_ACTIVE_SETTLE_MS`); any renewed disagreement during that window cancels
  the release and restarts the wait, so a burst of out-of-order deliveries around a click can never
  reach the screen.
