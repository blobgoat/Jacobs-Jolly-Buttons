# custom-basic-widgets

This project was generated with [`@osdk/create-widget`](https://www.npmjs.com/package/@osdk/create-widget) and demonstrates developing custom widgets to be embedded within Foundry UIs such as Workshop. It uses the Ontology SDK package `@custom-widget/sdk` with React on top of Vite. Check out the [Vite](https://vitejs.dev/guide/) docs for further configuration. The Vite plugin [`@osdk/widget.vite-plugin`](https://www.npmjs.com/package/@osdk/widget.vite-plugin) automatically generates a `widgets.config.json` manifest file containing metadata about widgets inside this project during the build command.

See [CHANGELOG.md](./CHANGELOG.md) for what's changed in the button-group widget itself.

## Button group widget

The widget defined in `src/main.config.ts` renders a configurable, responsive row of momentary
and/or switch buttons, driven entirely by Workshop parameters — no code changes needed for most
customization.

**Buttons** are defined via `buttonsJson`, a JSON array of button objects. Each needs at least an
`id` and a `label`; every other per-button field (`mode`, `paddingX`/`paddingY`,
`interactiveMarginX`/`interactiveMarginY`, `backgroundColor`/`hoverBackgroundColor`/`pressedBackgroundColor`
and their `*TextColor` pairs, `colorScheme`, `fontSizePx`, `fontSizeScheme`, `shadowCoefficient`,
`shadowScheme`) is optional and documented on the "Info: ..." toggle parameters next to it in the
widget setup panel. For any `*Px` field, a negative number resets it to its default value.

**Color, font-size & shadow schemes.** Rather than setting these on every button individually,
each button can opt into one of the group's 3 named schemes — `"primary"`, `"secondary"`, or
`"tertiary"` — independently per axis, via its own `colorScheme`, `fontSizeScheme`, and
`shadowScheme` fields (e.g. a button can mix secondary colors with the tertiary font size). Each
defaults to `"none"`, which keeps that button's own inline field exactly as before — schemes are
opt-in. Each scheme is configured once, group-wide, via the `primary*`/`secondary*`/`tertiary*`
parameters below, and **always overrides that button's own inline field in `buttonsJson` for that
axis whenever it isn't `"none"`**. There's no separate "active" color: a switch that's selected
reuses the pressed colors. There's no separate "disabled" color either: a disabled button always
renders its normal default colors, just faded (more transparent).

**Corner rounding is universal, not a scheme.** Unlike color/font size/shadow, there's a single
group-wide `roundingCoefficient` parameter (0–0.5, default 0.2) that always applies to every
button — there's no per-button `roundingCoefficient` field and no `roundingScheme` to opt into.

**Layout** is controlled by the group-level parameters:

| Parameter                 | Range / values                              | Notes                                                                                                    |
| -------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `layoutMode`               | `joined` \| `space-between` \| `custom-gap`  | All three fill the group's width with equal-width buttons. `joined` renders a connected segmented control (no gap, seam corners); `custom-gap` inserts `customGapPx` between buttons; `space-between` keeps each button's independent corners/borders with a fixed 24px gap (not configurable). |
| `customGapPx`               | 0–128px, default 8                           | Gap between buttons; only applied in `custom-gap` mode — `space-between` always uses a fixed 24px gap instead.  |
| `groupPaddingPx`            | 0–128px, default 0                           | Padding between the button row and the outer group boundary.                                                |
| `buttonHeightPx`            | 28–240px, or blank/negative for auto-fill    | Fixed visible-button height. Leave unconfigured or set negative to have buttons automatically fill the widget's available height instead.                                          |
| `buttonVerticalPaddingPx`   | 0–64px, default 0                            | Vertical layout space placed above and below every button, outside its own height — independent of a button's internal `paddingY` and its `interactiveMarginY` hit area.            |
| `{primary\|secondary\|tertiary}BackgroundColor` / `*TextColor` | string, e.g. `"#2563eb"` | That scheme's default (unpressed) look.                                              |
| `{primary\|secondary\|tertiary}HoverBackgroundColor` / `*HoverTextColor` | string      | That scheme's hover look.                                                            |
| `{primary\|secondary\|tertiary}PressedBackgroundColor` / `*PressedTextColor` | string  | That scheme's pressed/active look (a selected switch reuses this — see above).       |
| `{primary\|secondary\|tertiary}FontSizePx` | 8–48px, default 14, negative resets to default | That scheme's font size.                                                             |
| `{primary\|secondary\|tertiary}ShadowCoefficient` | 0–4, default 1, negative clamps to 0 (not default) | That scheme's shadow/press depth.                                                    |
| `roundingCoefficient`       | 0–0.5, default 0.2, negative clamps to 0 (not default) | Corner rounding for every button — universal, not tiered; see above.               |
| `disabled`                  | boolean                                      | Disables every button in the group.                                                                          |
| `disabledButtonIdsArray` / `hiddenButtonIdsArray` | array of button IDs      | Force-disable or hide specific buttons without editing `buttonsJson`; a hidden switch's active state is preserved and restored once it's un-hidden.                                                 |

**Events** reported back to Workshop via output parameters (`lastButtonId`,
`lastButtonInteraction`, `lastButtonActive`, and — for changes — `activeButtonIdsJson`):

| Event             | Fires when...                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| `buttonHovered` / `buttonHoverEnded` | the pointer enters / leaves a button.                                                  |
| `buttonPressed`      | a momentary button is activated, or a switch button becomes **selected**.                          |
| `buttonUnpressed`    | a switch button becomes **deselected**. Never fires for momentary buttons.                          |
| `buttonChanged`      | a switch button's active state changes, in either direction — the event to use for tracking persisted state. |

## Pointing this project at your own Foundry project

Two files wire this project to one specific stack and widget set: `.npmrc` (the registry `@custom-widget/sdk` resolves from) and `foundry.config.json` (where `npm run dev` / `npx @osdk/cli widgetset deploy` publish to). Both are **gitignored** and not checked in, since they identify a specific Foundry project/widget set rather than something generic to share — you create your own locally from the checked-in `.example` templates:

```sh
cp .npmrc.example .npmrc
cp foundry.config.json.example foundry.config.json
```

Then fill in the placeholders in each:

1. **Create (or open) your own widget set.** In your Foundry stack, go to the Developer Console's **Custom Widgets** page (or **Workshop → Widgets**) and create a new widget set if you don't already have one. Foundry will show you its RID and the npm registry URL for its generated SDK — you'll need both below.

2. **`.npmrc`** — replace `<your-stack-hostname>` and `<your-widget-set-rid>` with your stack's hostname and your widget set's RID:
   ```
   //<your-stack-hostname>/artifacts/api/:_authToken=${FOUNDRY_TOKEN}
   @custom-widget:registry=https://<your-stack-hostname>/artifacts/api/repositories/<your-widget-set-rid>/contents/release/npm/
   ```

3. **`foundry.config.json`** — replace the same two placeholders, matching the same stack and widget set:
   ```json
   {
     "foundryUrl": "https://<your-stack-hostname>",
     "widgetSet": {
       "rid": "<your-widget-set-rid>",
       "directory": "./dist",
       "autoVersion": { "type": "package-json" }
     }
   }
   ```

4. **Install dependencies** so `@custom-widget/sdk` (and its generated Ontology types, like `$ontologyRid` in `src/client.ts`) resolve from *your* widget set's registry. This needs the same token from [Deploying](#deploying) step 1, since `.npmrc` reads it via `FOUNDRY_TOKEN`:
   ```sh
   export FOUNDRY_TOKEN=<token>
   npm install
   ```

Once these exist and are filled in, the [Developing](#developing) and [Deploying](#deploying) steps below work the same way, just against your own project.

## Developing

Run the following commands (or equivalent with your preferred package manager) to start a local development server and follow the instructions printed to set up developer mode in Foundry:

```sh
export FOUNDRY_TOKEN=<token>
npm run dev
```

> **Note:** A widget no longer needs to be published before you can develop on it. Publishing a widget once (see [Deploying](#deploying)) is still required to use it in Workshop so that it becomes selectable in the **Widget setup** panel.

## Deploying

`foundry.config.json` (create it from `foundry.config.json.example` if you haven't yet — see [Pointing this project at your own Foundry project](#pointing-this-project-at-your-own-foundry-project)) holds the deployment configuration: which stack and widget set to publish to. Once it exists and points at your project, deploying only needs a token plus the steps below.

### 1. Generate a token

1. Sign in to the Foundry stack in a browser (`https://blobfishmaster.usw-18.palantirfoundry.com`).
2. Open your profile menu (top right) and go to **Settings → Tokens** (sometimes labeled **API Tokens** / **Developer Tokens**, depending on your Foundry version).
3. Click **Create Token** (or **Generate Token**), give it a name you'll recognize later (e.g. `widget-deploy`), and copy the value immediately — it's only shown once.

Keep this token secret; treat it like a password. If you ever suspect it's leaked, revoke it from the same Tokens page and generate a new one.

### 2. Connect the OSDK to your account

Export the token as `FOUNDRY_TOKEN` so both local development (`npm run dev`, see [Developing](#developing)) and the build below authenticate as you against the stack in `foundry.config.json`:

```sh
export FOUNDRY_TOKEN=<token>
```

### 3. Build

```sh
npm run build
```

This type-checks the project, produces a production build, and regenerates the `.palantir/widgets.config.json` manifest describing your widgets.

### 4. Deploy

```sh
npx @osdk/cli@latest widgetset deploy --token <token>
```

Use the same token from step 1. This publishes the build to the widget set configured in `foundry.config.json`; once deployed at least once, the widget becomes selectable in Workshop's **Widget setup** panel.

By default the `package-json` strategy is used for determining the version for your widgets from the `version` field in this project's `package.json` file. Remember to update this field and rerun the build command to update the manifest file when deploying a new version.

If you prefer to infer the version from a git tag, you can use the `git-describe` strategy by setting the `autoVersion` field in the `foundry.config.json` file to:

```json
{
  "type": "git-describe",
  "tagPrefix": ""
}
```
