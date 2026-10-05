# SVG Studio

A fast, modern web app for optimizing SVG files. Powered by [SVGO v4](https://svgo.dev/), running entirely in the browser.

## Features

- **Upload** via drag & drop, file picker, or paste (Ctrl+V / Cmd+V)
- **43 optimization options** with individual toggles, grouped by category
- **Live preview** with split view: code and visual side by side, resizable panels
- **Size comparison** showing original vs. optimized file size with percentage savings
- **Multiple export formats**: SVG download, SVG code, Data URL, CSS `background-image`, CSS `mask-image`, CSS `list-style-image`
- **Theme support**: system preference, light, and dark mode
- **Client-side only**: no server, no uploads - everything runs in a Web Worker in your browser

## Tech Stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [SVGO v4](https://svgo.dev/) in a Web Worker

## Getting Started

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The production build is output to `dist/`.

## Deployment

Deployed on [Railway](https://railway.com/), which builds and deploys every push to `main`.

- `.railway/railway.ts`: [Infrastructure as Code](https://docs.railway.com/infrastructure-as-code) for the Railway service (GitHub source, `/health` health check, EU West region, custom domain). Railway does not read it on deploy. After changing it, apply it from a directory linked to the "SVG Studio" project:

  ```bash
  railway link        # once: select the "SVG Studio" project, production environment
  railway config plan # review: must only list the svg-studio service
  railway config apply
  ```

  New custom domains can't be created this way: add them in the Railway dashboard (service → Settings → Networking) first, then list them in `domains` so `railway config plan` reports no changes.

- Builder: [Railpack](https://railpack.com/), Railway's default for new services.
- `Caddyfile`: Railpack serves `dist/` with Caddy. This replaces Railpack's default config with the same setup, plus long-lived cache headers for the content-hashed files in `/assets`. `{{.DIST_DIR}}` and `{{.IndexFallback}}` are filled in by Railpack at build time.
- Node version: taken from `engines.node` in `package.json`.

No environment variables are needed.

## License

MIT
