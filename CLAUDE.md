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

`npm run lint` (`next lint`) is currently broken on the installed Next.js version (`^16.2.10`) — it fails with `Invalid project directory provided, no such directory: .../lint` regardless of what's in the repo. This is an upstream/version issue, not something introduced by local changes; don't try to "fix" it by editing app code, and don't treat its failure as a signal about a diff's correctness. Use `npx tsc --noEmit` to typecheck instead.

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
- `generateImage`'s `generateContent` call passes `config: { imageConfig: { aspectRatio: "1:1" } }`. Without it, Gemini is free to return non-square output, which then gets letterboxed (visible bars top/bottom) by the `aspect-square` + `object-contain` CSS used in `GeneratedImageGrid.tsx` and `StyleCard.tsx`. This forces true 1:1 (e.g. 1024×1024) so generated assets and style thumbnails fill their square containers edge-to-edge.
- The Gemini API key is only ever read server-side (`process.env.GEMINI_API_KEY` inside route handlers) — never exposed to the client.
- Two route handlers act as thin proxies to Gemini:
  - `app/api/generate-style/route.ts` — generates a style thumbnail from one of three modes: `upload` (a single uploaded image, echoed back as-is), `prompt` (a text description), or `reference` (up to 2 uploaded reference images plus instructions for how Gemini should use them, e.g. "combine these into one style"). Accepts an optional `colors` array (up to 3 hex codes) for all three modes, which gets appended to the prompt as a hard colour constraint (see `colorConstraintBlock()`).
  - `app/api/generate-asset/route.ts` — generates 1-3 asset PNGs from an asset type + user prompt + optional style.
  - `app/api/fetch-image/route.ts` — proxies an arbitrary image URL server-side (avoids browser CORS restrictions) and returns it as base64 + a data URL. Used by the Add Style modal's "paste an image link" option. Rejects non-http(s) URLs, non-`image/*` responses, and payloads over 10MB.

### Prompt templates (composition layer)

`lib/promptTemplates.ts` exports `assetTypeComposition(assetType)`, hardcoded per asset type (`app-icon`, `feature-icon`, `key-visual`) with format/composition directives (e.g. "rounded-square launcher tile" for app icons) plus quality/negative-prompt guardrails. It deliberately says nothing about rendering style (line work, fills, colour palette) — that comes from the selected Style's detected characteristics instead, so a custom style isn't fighting a hardcoded "flat vector" assumption baked into the asset type. Asset type is otherwise purely a filter/tag (it scopes which styles are visible and gets stored on history items) — there's no `{{USER_PROMPT}}`-style template merge anymore. The final prompt sent to Gemini is assembled in `app/api/generate-asset/route.ts` as three concatenated blocks, in order: `assetTypeComposition(assetType)` → the selected style's Preserve/Do-NOT-copy block (if a style is selected) → the user's raw prompt text (expected to describe Subject and Composition only). A `console.log("=== Gemini prompt (generate-asset) ===\n" + prompt)` right before the `generateImages()` call prints the exact final prompt — since this runs server-side, it shows up in the terminal running `npm run dev`, not the browser console.

`assetPromptPlaceholder()` (no argument) drives a single shared placeholder text in `components/PromptInput.tsx`'s textarea, used identically for all three asset types — there's no per-asset-type tooltip anymore; the former info-icon tooltip (coaching the user to describe Subject/Composition) was removed and its content folded directly into this placeholder text.

#### Prompt Checker

`PromptInput` also renders an underlined "Prompt checker" button below the textarea, disabled while the prompt is empty. Clicking it shows a spinner with "Evaluating prompt…" and calls `POST /api/check-prompt` → `evaluatePrompt()` in `lib/gemini.ts` (a `gemini-2.5-flash`-family text model call, `GEMINI_TEXT_MODEL`-overridable, using structured JSON output). It scores 1-5 how clearly the prompt describes SUBJECT and COMPOSITION only — it is explicitly instructed to avoid suggesting or preserving any style/mood adjectives (e.g. "modern", "vibrant", "professional"), since rendering style is the Style system's job, not the prompt's. The response (`score`, one-line `feedback`, and one rewritten `suggestion`) renders inline with a "Use this" button that overwrites the prompt textarea with the suggestion.

### Style system

A "style" is a reference image plus Gemini-detected style metadata: `description` (a style-only prose paragraph — no subject, no composition, no asset-type language), `colors` (up to 3 dominant hex codes), and `characteristics` (3-5 short visual-trait tags, e.g. "Rounded geometry"). See `lib/types.ts#Style`. When generating an asset with a style selected, `app/api/generate-asset/route.ts` builds a `Preserve:` block directly from that style's `characteristics` plus a `Colour palette: ...` line (falling back to the style's `description` only if a style has neither, e.g. one saved before the analysis feature existed or where analysis failed) — followed by a fixed `Do NOT copy: the subject matter / exact objects / exact composition` guardrail — and passes the style's thumbnail image as an inline reference image, so Gemini visually matches the detected rendering technique rather than relying on text alone.

- There are no seeded/default styles — the library starts empty and only ever contains styles the user explicitly creates via the Add Style modal. (An earlier version auto-seeded "Minimal"/"3D" styles on first load via `lib/defaultStyles.ts`; that mechanism was removed.)
- **The style library is scoped per asset type.** Every `Style` carries an `assetType` field (set from whichever asset-type tab is active when it's saved, in `app/page.tsx#handleSaveStyle`), and `StyleLibrary` only ever renders `stylesForAssetType(styles, assetType)` — the App Icon, Feature Icon, and Key Visual tabs each see only their own styles, never each other's. Styles saved before this field existed have `assetType: undefined` and are treated as visible under all three tabs (see the filter in `stylesForAssetType()`), so nothing gets orphaned by the migration.
- Because the library is per-asset-type, "selected style" is too: `selectedStyleId` in `app/page.tsx` is a `Record<AssetType, string | null>`, not a single value — switching the asset-type tab switches which style is considered selected without losing the other tabs' selections.
- Style selection within a given asset type defaults to a style literally named "Minimal" if one exists (case-insensitive match), otherwise the first available style for that asset type, whenever nothing is explicitly selected — see `pickDefaultStyleId()` in `app/page.tsx`. There is intentionally **no** "no style" option in the UI; deleting the selected style falls back to another one (within the same asset type) rather than clearing selection.
- Hovering a style card in the library (`components/StyleCard.tsx`) shows a tooltip with that style's detected `characteristics` checklist and `colors` swatches — the same content shown live during Add Style. The tooltip is skipped entirely (`hasAnalysis` check) for styles with neither, e.g. ones saved before the analysis feature existed or where analysis failed.
- The card's outer wrapper deliberately has no `overflow-hidden` (only the image sub-container does, via `rounded-t-2xl overflow-hidden`) — otherwise the corner-badge delete button (shown in Edit mode) gets visually clipped by the card frame.

#### Add Style modal (`components/StyleModal.tsx`) & style detector

The "Add Style" modal has just two fields: a style name text input, and a "Reference Image" supplied either by uploading a file or by pasting an image URL (fetched server-side via `/api/fetch-image` to sidestep CORS, then treated identically to an uploaded file). The empty dropzone shows a "For best results, use:" checklist as placeholder copy, which differs by asset type — Key Visual gets a 2-line version (no icon-set line), App Icon/Feature Icon get a 3-line version including "A set of 3–10 icons in the same style".

As soon as an image is set (upload or URL), it's automatically sent to `POST /api/analyze-style` → `analyzeStyleImage()` in `lib/gemini.ts` (a vision-capable text-model call, same `TEXT_MODEL`/`GEMINI_TEXT_MODEL` as the Prompt Checker) — a semi-transparent bar reading "Analysing..." with a spinner overlays the bottom of the 40×40 preview while this runs. On completion it's replaced by a "☑" characteristics checklist and colour swatches (identical rendering to the `StyleCard` hover tooltip above). This result (`description`, `colors`, `characteristics`) is what gets saved onto the `Style` object when **Add** is clicked. Analysis is non-blocking: if it fails or hasn't finished, saving still works, just with a generic fallback description ("Custom uploaded style image.") and no colours/characteristics. There is still no separate generate/preview step for the image itself — clicking **Add** builds the rest of the `Style` object client-side and saves it straight to the library, closing the modal.

Note: `app/api/generate-style/route.ts` still implements `prompt` and `reference` modes plus its own local `colorConstraintBlock()`/optional `colors` palette constraint — that's unused surface area now that the modal only produces `source: "upload"` styles, kept in case the UI grows back into it. There is no UI for it currently.

### Data flow quirk

Style thumbnails are stored as data URLs in `localStorage`. `lib/dataUrl.ts#dataUrlToParts` converts them back to `{ mimeType, base64 }` whenever a style needs to be re-sent to Gemini as a reference image (both when generating an asset and — indirectly — inside `StyleModal.tsx` for downloads).

### Downloading generated images

Each image in `components/GeneratedImageGrid.tsx` has a hover-revealed download button. It does **not** set `href` directly to the image's `data:` URL — Safari ignores the `download` attribute on plain `data:` URIs and navigates to/opens the image instead of saving it. Instead it `fetch()`s the data URL, converts it to a `Blob`, and downloads via a `blob:` object URL (revoked after the click). Filenames are `asset-N.<ext>`, with the extension derived from `GeneratedImage.mimeType`.

### History panel "click outside" behavior

`app/page.tsx` clears the current `images` state and deselects `activeHistoryId` on any `mousedown` outside two ref-tracked zones: the history `<aside>` (`historyPanelRef`) and the "Generated Images" section (`generatedImagesRef`). Both refs must wrap any area whose content should stay visible when clicked — e.g. the download button in `GeneratedImageGrid` originally broke because it lived outside both zones, so clicking it cleared the view before the click handler could run. If you add new interactive elements that display history/generated content, make sure they're inside one of these ref'd containers (or add a new zone) rather than letting the outside-click handler wipe them.

## Version control

This is a git repository on branch `main`, with `origin` pointing at `https://github.com/benyin-hub/image-generator.git`. Neither the `gh` CLI nor Homebrew (`brew`) is installed on this machine — don't attempt to install either without the user's explicit go-ahead, since it requires elevated/interactive setup. Use plain `git` for status/diff/commit/push; for anything that would normally use `gh` (PRs, issues), ask the user to do it via the GitHub web UI or install `gh` themselves first.

## Notable non-default config

- `next.config.mjs` sets `devIndicators: false` — the Next.js dev-mode overlay badge is deliberately disabled (per explicit product decision, not an accident).
- `tsconfig.json` targets `ES2020` (not the CLI default) because `lib/dataUrl.ts` uses a regex `s` (dotAll) flag, which requires ES2018+.
