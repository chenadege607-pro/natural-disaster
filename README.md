# Cameroon Safety Net

Build a web-based natural disaster forecasting application for Cameroon, covering all 10 regions. Focus first on strong, polished UI/UX design (using realistic mock/sample data for now — real environmental API integration comes later).


Core concept: helps citizens and local officials understand flood and landslide risk across Cameroon's regions, with alerts and historical context.

Key screens/features to design:
1. Landing/Home page — hero explaining the app's purpose, current national risk snapshot, call to action.
2. Interactive risk map of Cameroon's 10 regions (Adamawa, Centre, East, Far North, Littoral, North, Northwest, West, South, Southwest) — color-coded by flood/landslide risk level (low/moderate/high/severe), clickable regions showing detail panel.
3. Region detail view — current risk level for flood and landslide separately, recent rainfall/environmental trend chart, short forecast summary, safety recommendations.
4. Alerts page — list/feed of active warnings by region and severity, with timestamps; visually distinct urgent/severe alerts.
5. Historical trends — charts showing past disaster events and environmental data (rainfall, soil saturation proxy) per region over time.
6. Community reporting — a simple form for users to report a flood/landslide incident they observe (location/region, description, optional photo), plus a feed of recent community reports.
7. Simple admin/monitoring view — a dashboard summarizing all regions at a glance for officials (table or grid of regions with risk levels and latest reports), separate from the public view.

Design requirements:
- Fully responsive: clean layouts for desktop, tablet, and mobile.
- Design language should feel trustworthy, clear, and calm-but-urgent-when-needed — use color coding consistently for risk severity (e.g. green/yellow/orange/red), good contrast and accessibility, legible typography.
- Use realistic mock data for the 10 Cameroon regions so all screens look populated and real.
- Set up Lovable Cloud so we have a real database ready for community reports, alerts, and region risk data (still seeded with mock/sample data for now), so this is easy to wire to live environmental APIs later.

Do not integrate any external environmental/flood/landslide data API yet — that comes in a follow-up step once the design is approved.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/33ca3a80-2d50-4f6d-9f8e-8067f4422f27).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
