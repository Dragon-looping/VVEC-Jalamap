# JALAMAP · Monsoon Street Atlas

> **JALAMAP** is a community road-condition prototype designed for monsoon-affected commutes in Puttur, Dakshina Kannada, Karnataka. Built for **RESURRECT 2026**, it answers the critical commuter question:  
> *“A message says there's water near Darbe — which road does that mean, when was it reported, and does my route change?”*

![JALAMAP Confirmed Detour State](docs/screenshots/03-confirmed-detour.png)

---

## Cartographic Art Direction

JALAMAP is styled as a printed street atlas brought to life:
- **Warm paper ground** (`#F2EFE6`) with subtle urban settlement blocks in sand and stone tones.
- **Street network hierarchy** with realistic road widths, ivory fills, and casings that merge into authentic road intersections rather than abstract graph nodes.
- **Saturated petrol teal route** (`#007C76`) delivering high contrast across projector screens.
- **Vermilion closure barrier** (`#DC3826`) and direct leader line indicating the exact affected approach at Darbe Junction.
- **Working Route Comparison**: Interactive segmented buttons (`[ Original · 4.8 km ]` vs `[ Detour · 5.6 km ]`) allowing judges and commuters to visually compare paths before and after closure.

---

## What It Demonstrates

1. **State A — Initial Journey**: Opens directly on an active morning commute from **Kallare Gateway** to **Kombettu Hub** via Darbe Junction (4.8 km).
2. **State B — One Observation**: Rider A reports water at the Darbe West Approach. An amber beacon and leader callout flag the road (`▲ Darbe approach: 1 report`); the route remains unchanged awaiting independent confirmation.
3. **State C — Confirmed Detour**: Rider B independently confirms the blockage. Two matching observations trigger consensus. The Darbe Approach closes with a vermilion barrier, the former route becomes a muted dashed line, and the new detour draws via North Town Bypass (`5.6 km`, `+800 m detour`).
4. **Route Comparison**: Commuters can toggle between the historical path before closure (`Original · 4.8 km`) and the active detour (`Detour · 5.6 km`).
5. **State D — Verified Reopening**: When two riders observe water receding, the direct shorter route is restored, preserving the full chronological evidence timeline.

*Note on pilot data*: This prototype uses an offline schematic road network of the Puttur pilot area and simulated commuter identities (Rider A & Rider B) to demonstrate consensus rules under intermittent connectivity.

---

## Quick Start

### Prerequisites
- Node.js (v18+ recommended, verified on Node v24)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Local Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Production Build & Preview
```bash
npm run build
npm run preview
```

---

## Try the Demo (25-Second Walkthrough)

Follow these exact button steps in the running prototype:

1. **Open the App**: Observe the active commute line (`4.8 km via Darbe`) routed directly through Darbe Junction.
2. **Click `Report a blockage`**: Rider A records high water on *Darbe West Approach*. The status updates to `Awaiting a second rider` with an amber beacon on the map.
3. *(Duplicate Check)*: Click `Confirm blockage` while still as Rider A. Notice the inline guardrail: *"You already reported this incident. Switch to Rider B to provide independent verification."*
4. **Click `Switch to Rider B (Independent witness) →`**: Demo perspective switches to Rider B without adding false evidence.
5. **Click `Confirm blockage`**: Two independent confirmations trigger consensus. The Darbe Approach closes with a vermilion barrier, and the new detour draws via Town Bypass (`5.6 km`, `+800 m detour`).
6. **Click `Original · 4.8 km`**: Examine the path before closure while the Darbe barrier remains visible. Click `Detour · 5.6 km` to restore the active navigation route.
7. **Click `Report road passable (Water receded)`**, switch to Rider A, and click **`Confirm road reopened`**: Two independent observations restore the original 4.8 km route.
8. **Click `Reset demo`** (top right) at any time to return to the initial state.

---

## Architectural Implementation & Core Files

| Concern | Source File | Description |
|---|---|---|
| **Road Network Graph** | [`src/data/putturNetwork.ts`](src/data/putturNetwork.ts) | 9 junctions, coordinates, road segment definitions, and distance weights. |
| **Shortest-Path Routing** | [`src/utils/routing.ts`](src/utils/routing.ts) | Dijkstra shortest-path engine excluding blocked segments and computing path geometry. |
| **Consensus Verification** | [`src/utils/verification.ts`](src/utils/verification.ts) | Two-witness consensus rule and duplicate observer rejection logic. |
| **Cartographic Map** | [`src/components/MapAtlas.tsx`](src/components/MapAtlas.tsx) | Warm daylight SVG street atlas with urban blocks, seamless road junctions, leader lines, and route comparison. |
| **Incident Sheet** | [`src/components/IncidentSheet.tsx`](src/components/IncidentSheet.tsx) | Near-white paper evidence panel, working route comparison segmented control, and chronological timeline. |
| **State Persistence** | [`src/utils/storage.ts`](src/utils/storage.ts) | `localStorage` persistence surviving page refresh with dedicated demo reset. |

---

## Verified Proof Screenshots

All screenshots were captured from a standalone browser at 1440 × 900 (and 16:9 for the slide) and are located in `docs/screenshots/`:
- [`01-initial-route.png`](docs/screenshots/01-initial-route.png) — Initial 4.8 km commute through Darbe Junction.
- [`02-one-rider.png`](docs/screenshots/02-one-rider.png) — One observation by Rider A with amber beacon, awaiting verification.
- [`03-confirmed-detour.png`](docs/screenshots/03-confirmed-detour.png) — Confirmed closure with vermilion barrier, dashed former route, and 5.6 km (+800 m) detour.
- [`04-reopened.png`](docs/screenshots/04-reopened.png) — Two riders verify reopening, direct route restored, full timeline preserved.
- [`jalamap-route-comparison.png`](docs/screenshots/jalamap-route-comparison.png) — 16:9 presentation slide proof image with side-by-side equal-scale crops of Darbe approach in State B vs State C.
