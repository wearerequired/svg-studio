// Railway Infrastructure as Code. Railway does not read this file on deploy:
// run `railway config plan` / `railway config apply` after changing it (see README).
import { defineRailway, github, project, service } from "railway/iac";

// Named partial: an apply from this repo only ever touches resources it declares,
// even if the CLI is accidentally linked to a different project.
export const partial = "svg-studio";

export default defineRailway(() => {
  // No build/start here on purpose: Railpack detects the Vite SPA and serves dist/
  // with Caddy (see Caddyfile). A custom start command would disable that.
  const web = service("svg-studio", {
    source: github("wearerequired/svg-studio", { branch: "main" }),
    healthcheck: "/health",
    replicas: { "europe-west4-drams3a": 1 },
    // Caddy listens on $PORT, so pin it to the port the custom domain routes to.
    env: { PORT: "8080" },
    // The CLI can't register new custom domains: add a domain in the dashboard
    // first, then list it here so the config stays in sync.
    domains: [{ domain: "svg-studio.required.com", port: 8080 }],
  });

  return project("SVG Studio", {
    resources: [web],
  });
});
