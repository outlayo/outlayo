# Outlayo Website

This app serves the public marketing site for `outlayo.com`.

- Framework: Astro
- Purpose: landing page, public website, and future docs surface
- Deployment target: public website domain, separate from the hosted app
- Hosting target: GitHub Pages with custom domain `outlayo.com`

Local commands from the repo root:

```bash
npm run website:dev
npm run website:build
npm run website:preview
```

The self-hostable app and API remain in `apps/server`.

Deployment notes:

- GitHub workflow: `.github/workflows/deploy-website.yml`
- Publish source: `apps/website/dist`
- Custom domain file: `apps/website/public/CNAME`
- Astro emits production CSS into `/_astro/*.css`; that is expected. Use `npm run website:preview` to inspect the built site locally instead of opening `dist/index.html` directly as a file.
- Current Pages target is the root GitHub Pages URL `https://outlayo.github.io/`, so the deploy workflow builds with `WEBSITE_BASE_PATH=/`. This requires the publishing repository to be the GitHub Pages user/org site repository (`outlayo.github.io`) or an equivalent root-site publishing setup.
