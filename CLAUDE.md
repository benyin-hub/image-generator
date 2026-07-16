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

### Prompt templates (brand-compliance layer)

`lib/promptTemplates.ts` holds hardcoded prompt scaffolding per asset type (`app-icon`, `feature-icon`, `key-visual`), each with a `{{USER_PROMPT}}` placeholder plus fixed style/quality/negative-prompt directives. This is the mechanism that keeps generated assets on-brief — edit these templates (not ad-hoc prompt strings elsewhere) to change asset-level output behavior.

The same file also exports `assetPromptPlaceholder(assetType)`, which drives the per-asset-type placeholder text shown in `components/PromptInput.tsx`'s textarea (different example prompt for each of the three asset types). `PromptInput` also renders a hover/focus tooltip (info icon next to the "Prompt" label) coaching the user to describe **Subject** and **Composition** for more predictable output — this is UI guidance only and isn't sent to Gemini.

### Style system

A "style" is just a previously generated reference image plus a text description. When generating an asset with a style selected, `app/api/generate-asset/route.ts` appends the style's description to the asset prompt **and** passes the style's thumbnail image as an inline reference image, so Gemini visually matches palette/linework/rendering technique rather than relying on text alone.

- `lib/defaultStyles.ts` defines seed prompts for two default styles ("Minimal", "3D").
- `app/page.tsx`'s `seedDefaultStyles()` lazily generates these on first load if the user has no styles yet, gated by a `localStorage` flag (`hasSeededDefaultStyles`/`markDefaultStylesSeeded` in `lib/storage.ts`) so it only ever attempts once, even if generation fails (e.g. missing API key).
- Style selection always defaults to "Minimal" (or the first available style) whenever nothing is explicitly selected — see `pickDefaultStyleId()` in `app/page.tsx`. There is intentionally **no** "no style" option in the UI; deleting the selected style falls back to another default rather than clearing selection.

#### Add Style modal (`components/StyleModal.tsx`)

The "Add Style" modal has a style name field, an optional colour palette picker (up to 3 hex colours, via `components/ColorWheel.tsx` + `lib/color.ts#hslToHex`), and a "Style Image Generation" section with three tabs mapping 1:1 to the API's three modes:

- **Upload Image** — a single image upload box (`mode: "upload"`).
- **Prompt** — a text description textarea (`mode: "prompt"`).
- **Reference Image** — up to 2 reference image uploads plus a multiline instructions textbox (`mode: "reference"`).

After a successful generation, the preview screen offers **Save to Library** (calls `onSave`), **Restart** (resets every field in the modal back to empty, including switching back to the Upload Image tab), and **Download** (saves the generated PNG locally via a temporary `<a download>` link).

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
