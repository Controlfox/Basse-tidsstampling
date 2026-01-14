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

## Important: om hemligheter blivit committade 🛑

Om du av misstag har committat känslig information (API-nycklar, Google Apps Script webhook URL, service account JSON osv.) gör följande omgående:

1. **ROTERA eller SPÄRRA** nyckeln (t.ex. skapa en ny Apps Script webhook eller generera en ny API-nyckel) så att exponerad värde inte längre fungerar.
2. Ta bort det känsliga innehållet från din nuvarande kod (ersätt med placeholders eller använd miljövariabler), t.ex. byta ut webhook-URL mot `YOUR_APPS_SCRIPT_URL_HERE`.
3. Om du vill rensa historiken: använd verktyg som `git filter-repo` eller BFG för att ta bort filer/strängar från historiken, följt av en force-push till fjärr. Var försiktig — detta påverkar alla som arbetar i repot.

   - Exempel med git-filter-repo (installera först):
     - `git clone --mirror git@github.com:USER/REPO.git`
     - `cd REPO.git`
     - `git filter-repo --path src/app/app.component.ts --invert-paths  # (exempel: ta bort fil helt)`
     - `git push --force`

4. Informera teamet och återställ lokala kloner (de måste klona om efter att historiken rewrite:ats).

Tips: spara aldrig hemligheter i koden — använd GitHub Secrets, App Platform runtime envs eller andra hemliga hanterare.
