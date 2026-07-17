# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server (Turbopack) at http://localhost:3000
npm run build    # production build
npm run start    # run the production build
npm run lint     # next lint
```

There is no test suite in this project.

### Environment

Copy `.env.example` to `.env` (or `.env.local`) and set:

```
GEMINI_API_KEY=            # required — key from https://aistudio.google.com/apikey
GEMINI_IMAGE_MODEL=        # optional, defaults to gemini-2.5-flash-image
```

The dev server must be restarted after changing env vars. Without `GEMINI_API_KEY`, both API routes return a JSON `{ error }` (500) instead of throwing — this is intentional, not a bug to fix.

## Architecture

This is a single-page Next.js (App Router) app. Almost all state lives in `app/page.tsx` (asset type, styles, selected style, prompt, image count, generated images, history) and is passed down as props/callbacks to presentational components in `components/`. There is no global state library and no database — **styles and generation history are persisted entirely in browser `localStorage`** (`lib/storage.ts`), including generated images stored as base64 data URLs. This is a deliberate simplicity tradeoff, not an oversight.

### Gemini integration

- `lib/gemini.ts` wraps `@google/genai` and talks to the Gemini image model (`gemini-2.5-flash-image` / "Nano Banana" by default, overridable via `GEMINI_IMAGE_MODEL`). `generateImage`/`generateImages` send a text prompt plus optional inline reference images and scan the response parts for `inlineData` (the image) and any accompanying `text`.
- The Gemini API key is only ever read server-side (`process.env.GEMINI_API_KEY` inside route handlers) — never exposed to the client.
- Two route handlers act as thin proxies to Gemini:
  - `app/api/generate-style/route.ts` — generates a style thumbnail from one of three modes: `upload` (a single uploaded image, echoed back as-is), `prompt` (a text description), or `reference` (up to 2 uploaded reference images plus instructions for how Gemini should use them, e.g. "combine these into one style"). Accepts an optional `colors` array (up to 3 hex codes) for all three modes, which gets appended to the prompt as a hard colour constraint (see `colorConstraintBlock()`).
  - `app/api/generate-asset/route.ts` — generates 1-3 asset PNGs from an asset type + user prompt + optional style.
  - `app/api/fetch-image/route.ts` — proxies an arbitrary image URL server-side (avoids browser CORS restrictions) and returns it as base64 + a data URL. Used by the Add Style modal's "paste an image link" option. Rejects non-http(s) URLs, non-`image/*` responses, and payloads over 10MB.

### Prompt templates (brand-compliance layer)

`lib/promptTemplates.ts` holds hardcoded prompt scaffolding per asset type (`app-icon`, `feature-icon`, `key-visual`), each with a `{{USER_PROMPT}}` placeholder plus fixed style/quality/negative-prompt directives. This is the mechanism that keeps generated assets on-brief — edit these templates (not ad-hoc prompt strings elsewhere) to change asset-level output behavior.

The same file also exports `assetPromptPlaceholder(assetType)`, which drives the per-asset-type placeholder text shown in `components/PromptInput.tsx`'s textarea (different example prompt for each of the three asset types). `PromptInput` also renders a hover/focus tooltip (info icon next to the "Prompt" label) coaching the user to describe **Subject** and **Composition** for more predictable output — this is UI guidance only and isn't sent to Gemini.

### Style system

A "style" is just a previously generated reference image plus a text description. When generating an asset with a style selected, `app/api/generate-asset/route.ts` appends the style's description to the asset prompt **and** passes the style's thumbnail image as an inline reference image, so Gemini visually matches palette/linework/rendering technique rather than relying on text alone.

- There are no seeded/default styles — the library starts empty and only ever contains styles the user explicitly creates via the Add Style modal. (An earlier version auto-seeded "Minimal"/"3D" styles on first load via `lib/defaultStyles.ts`; that mechanism was removed.)
- **The style library is scoped per asset type.** Every `Style` carries an `assetType` field (set from whichever asset-type tab is active when it's saved, in `app/page.tsx#handleSaveStyle`), and `StyleLibrary` only ever renders `stylesForAssetType(styles, assetType)` — the App Icon, Feature Icon, and Key Visual tabs each see only their own styles, never each other's. Styles saved before this field existed have `assetType: undefined` and are treated as visible under all three tabs (see the filter in `stylesForAssetType()`), so nothing gets orphaned by the migration.
- Because the library is per-asset-type, "selected style" is too: `selectedStyleId` in `app/page.tsx` is a `Record<AssetType, string | null>`, not a single value — switching the asset-type tab switches which style is considered selected without losing the other tabs' selections.
- Style selection within a given asset type defaults to a style literally named "Minimal" if one exists (case-insensitive match), otherwise the first available style for that asset type, whenever nothing is explicitly selected — see `pickDefaultStyleId()` in `app/page.tsx`. There is intentionally **no** "no style" option in the UI; deleting the selected style falls back to another one (within the same asset type) rather than clearing selection.

#### Add Style modal (`components/StyleModal.tsx`)

The "Add Style" modal has just two fields: a style name text input, and a style image supplied either by uploading a file or by pasting an image URL (fetched server-side via `/api/fetch-image` to sidestep CORS, then treated identically to an uploaded file). There is no separate generate/preview step — clicking **Add** builds the `Style` object client-side (no Gemini call; `/api/generate-style`'s `upload` mode never called Gemini either, it just echoed the image back) and saves it straight to the library, closing the modal.

Note: `app/api/generate-style/route.ts` still implements `prompt` and `reference` modes plus an optional `colors` palette constraint — that's unused surface area now that the modal only produces `source: "upload"` styles, kept in case the UI grows back into it. There is no UI for it currently.

### Data flow quirk

Style thumbnails are stored as data URLs in `localStorage`. `lib/dataUrl.ts#dataUrlToParts` converts them back to `{ mimeType, base64 }` whenever a style needs to be re-sent to Gemini as a reference image (both when generating an asset and — indirectly — inside `StyleModal.tsx` for downloads).

## Version control

This directory is **not** a git repository (`git status` fails with "not a git repository"). Neither the `gh` CLI nor Homebrew (`brew`) is installed on this machine, so a new GitHub repo cannot be created programmatically.

If asked to commit/push code:
1. `git init` and commit locally first.
2. For GitHub, ask the user to create an empty repo (no README/license/gitignore) on github.com and paste the URL — then add it as a remote and push. Don't attempt to install `gh`/`brew` without the user's explicit go-ahead, since it requires elevated/interactive setup.

## Notable non-default config

- `next.config.mjs` sets `devIndicators: false` — the Next.js dev-mode overlay badge is deliberately disabled (per explicit product decision, not an accident).
- `tsconfig.json` targets `ES2020` (not the CLI default) because `lib/dataUrl.ts` uses a regex `s` (dotAll) flag, which requires ES2018+.
