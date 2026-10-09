# Lean Startup Lab

A personal, read-only board for one person's idea validation. Each idea is a hand-drawn frame on an infinite canvas, read left to right through the loop: **Idea → Assumptions → Experiment → Measure → Learn → Pivot / Persevere**.

Coaching stays in chat. This app only shows the board.

The bundled ideas (TuitionMatch KL, Kek Pre-order, and the rest) are **example data**. They are not real customers, prices, or results.

## Why rough.js

Strokes come from [rough.js](https://github.com/rough-stuff/rough) (MIT). Lettering is [Excalifont](public/fonts/OFL.txt) (OFL), the handwriting face used by Excalidraw.

`@excalidraw/excalidraw` and tldraw are drawing editors. This screen is a structured dashboard: columns are laid out from the data, text changes with zoom, a detail panel opens on selection, and dragged positions live only in the browser. rough.js draws the wobbly outlines. The camera and the layout stay in this repo.

## What you see

- Pan (drag the background), scroll or pinch to zoom, a minimap, and Fit.
- Zoomed out, frames keep a readable title and status. Zoomed in, the cards show their text. Long text is truncated on the card and written out in the detail panel.
- Click a frame to zoom into it. The breadcrumb is Board › idea › section.
- The latest Lean Canvas for an idea is Ash Maurya's 9-box layout from *Running Lean*, numbered in his fill order.
- Assumption stickies are coloured by risk. Experiment cards carry a locked pass line: "We are right if …". Arrows join a test to the assumption it checks.
- A dashed loop returns from the decision to the canvas.
- Drag a card to nudge it. The offset is saved in `localStorage` under `lean-startup-lab:positions:v1`. Nothing is written back to Notion. Reset clears those nudges.
- Filter by status. The corner says whether you are looking at Notion or at example data, with the last sync time and a refresh button.
- On a phone, pinch to zoom and use the bottom sheet to open an idea.

Evidence, when the field exists: Opinion, Research, Said, Did. Only **Did** (someone paid, signed up, or came back) can mark an assumption Validated. A passed interview that is only Said stays Testing. If the evidence field is empty, that ladder is hidden.

## Notion

Databases live under the Lean Startup Lab page. Create an internal integration at [notion.so/profile/integrations](https://www.notion.so/profile/integrations) with **Read content**. On the Lean Startup Lab page, open **⋯ → Connections** and add the integration. Child databases inherit it.

Put the token in Netlify as `NOTION_TOKEN`. Do not commit it. This repository is public.

The function calls `POST /v1/data_sources/{id}/query` with `Notion-Version: 2025-09-03`, follows pagination, and caches the normalized JSON for about 45 seconds. Refresh skips the cache.

Data source IDs are not secret. Defaults are in `shared/config.ts` and `netlify.toml`. Override them with:

| Variable | Database |
| --- | --- |
| `NOTION_DS_IDEAS` | Ideas |
| `NOTION_DS_CANVAS` | Lean Canvas |
| `NOTION_DS_ASSUMPTIONS` | Assumptions |
| `NOTION_DS_EXPERIMENTS` | Experiments |
| `NOTION_DS_LEARNINGS` | Learnings |

If `NOTION_TOKEN` is missing, `GET /api/board` returns the example board and the red **Example data** banner stays up. If the token is set and Notion returns an error, the page shows that error instead of pretending the example is live.

### Fields the normalizer reads

Titles: Ideas `Name`, Lean Canvas `Canvas`, Assumptions `Statement`, Experiments `Name`, Learnings `Insight`.

| Database | Properties |
| --- | --- |
| Ideas | Status, Problem, Customer segment |
| Lean Canvas | Version (number), Date, Idea, and the 9 boxes: Problem, Solution, Unique Value Proposition, Unfair Advantage, Customer Segments, Key Metrics, Channels, Cost Structure, Revenue Streams |
| Assumptions | Type, Risk (High / Medium / Low), Status (Untested / Testing / Validated / Invalidated), Idea |
| Experiments | Method, Outcome (Planned / Running / Passed / Failed), Success metric, Target, Result, Idea, Assumption |
| Learnings | Date, Decision (Persevere / Pivot / Pause), Pivot type, Idea, Experiment |

These are optional. The card hides them when the property is absent:

- Experiments `Evidence` (Opinion / Research / Said / Did)
- Experiments `Locked` (date) — shown as "locked 1 Sep" on the pass line
- Learnings `Observed`, `Learned`, `Therefore`
- The `Pause` option on Learnings `Decision`

Relations are matched by page id. The board shows the highest canvas `Version` for each idea.

## Local development

Node 20 or newer.

```bash
npm install
npm run dev
```

`npm run dev` uses the Netlify Vite plugin, so `/api/board` is served with the function. A local `.env` (gitignored) can hold `NOTION_TOKEN` for a trial against Notion. `.env.example` lists the variable names.

```bash
npm test
npm run lint
npm run build
```

`netlify dev` also works if you prefer the CLI.

## Deploy

Deploy yourself. `netlify.toml` is already set:

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`
- Node 20

Set `NOTION_TOKEN` in the Netlify UI before you expect live rows. Until then the published site shows the example board.
