# Deploy to DigitalOcean App Platform

This repo includes a Dockerfile and a GitHub Actions workflow that builds the app, pushes a container to DigitalOcean Container Registry (DOCR) and creates/updates a DigitalOcean App Platform app using doctl.

## What the workflow does

- Builds the Angular SSR app (production)
- Builds a Docker image and pushes it to `registry.digitalocean.com/<your-registry>/basse-tidsstampling`
- Creates or updates a DigitalOcean App using the spec file `.do/app.yaml` (the workflow renders the repository placeholder)

## Required GitHub repository secrets

- `DO_API_TOKEN` — a DigitalOcean API token with write access. Create it at https://cloud.digitalocean.com/account/api/tokens (give it `Write` rights).
- `DOCR_REGISTRY` — the name of your DigitalOcean Container Registry (e.g., `myregistry`). The workflow will create the registry if it doesn't exist.

Optional runtime secrets (set them in the App Platform dashboard or extend `.do/app.yaml`):

- `GOOGLE_SHEETS_KEY` — if your app needs a Google Sheets API key, add it as an environment variable in the App Platform app (set as secret/value in DO).

## How to use

1. Add `DO_API_TOKEN` and `DOCR_REGISTRY` to your GitHub repo's Secrets (Settings → Secrets → Actions).
2. Push to the `main` branch (or `master`) — the workflow runs on push to those branches.
3. The workflow will print a success message; open the DigitalOcean App Platform dashboard to see the app and the provided domain.

## Notes

- The app listens on port `4000` by default; App Platform will route HTTP traffic to that port.
- If you need to add other environment variables, you can add them to `.do/app.yaml` under `envs:` or set them manually in the App dashboard.
- If you want a custom domain, configure it from the App Platform dashboard.
