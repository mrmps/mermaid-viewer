import { buildOpenAPISpec } from "@/lib/openapi";

export async function GET() {
  const spec = JSON.stringify(buildOpenAPISpec());

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>API Reference — merm.sh</title>
  <meta name="description" content="OpenAPI reference for the merm.sh REST API." />
</head>
<body>
  <script id="api-reference" type="application/json"
    data-configuration='${JSON.stringify({ theme: "kepler", hideDownloadButton: true })}'
  >${spec}</script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.52.1/dist/browser/standalone.js" integrity="sha384-mf6gxVzEDU/HNmr0o4taUchYTK9MzpkZLQsEmEGNJFyp2Cb+k6ilAOVAFCRj1Z4R" crossorigin="anonymous"></script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
