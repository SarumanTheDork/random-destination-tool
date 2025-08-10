
# Random Destination Tool

Indian passport oriented random destination picker with filters:
- Visa types and visa privilege flags
- Region, exclusions
- Max flight time from DEL (rough, unverified)
- Seasonality weighting using bestMonths
- Seedable spins
- Shareable URL params
- Import/Export JSON dataset

## Quick start
```bash
npm i
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Dataset
Edit `src/data/demoDataset.json` or import your own JSON with the schema shown in the app.
All visa rules in this repo are [Unverified] and only for demonstration.

## Deploy
- Push to GitHub
- Vercel: New Project → Import → Framework: Vite → Build Command: `npm run build` → Output: `dist`
- Set `NODE_VERSION` to 18 or 20

## Notes
- No server. Everything is static.
- All dates and rules can change. Replace the dataset with a maintained source before launch.
