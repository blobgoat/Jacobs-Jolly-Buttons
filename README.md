# custom-basic-widgets

This project was generated with [`@osdk/create-widget`](https://www.npmjs.com/package/@osdk/create-widget) and demonstrates developing custom widgets to be embedded within Foundry UIs such as Workshop. It uses the Ontology SDK package `@custom-widget/sdk` with React on top of Vite. Check out the [Vite](https://vitejs.dev/guide/) docs for further configuration. The Vite plugin [`@osdk/widget.vite-plugin`](https://www.npmjs.com/package/@osdk/widget.vite-plugin) automatically generates a `widgets.config.json` manifest file containing metadata about widgets inside this project during the build command.

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
