const URL_ATTRS = new Set([
  "action",
  "background",
  "formaction",
  "href",
  "poster",
  "src",
  "xlink:href",
]);

const FORBIDDEN_ELEMENTS = [
  "base",
  "embed",
  "iframe",
  "link",
  "meta",
  "noscript",
  "object",
  "script",
];

const SAFE_DATA_URL_PREFIXES = [
  "data:image/avif",
  "data:image/bmp",
  "data:image/gif",
  "data:image/jpeg",
  "data:image/jpg",
  "data:image/png",
  "data:image/webp",
  "data:video/mp4",
  "data:video/webm",
];

export const SANITIZED_UI_CSP = [
  "default-src 'none'",
  "script-src 'none'",
  "connect-src 'none'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "navigate-to 'none'",
  "img-src data: blob:",
  "media-src data: blob:",
  "font-src data:",
  "style-src 'unsafe-inline'",
].join("; ");

export function hasHtmlContent(content: string) {
  return /<\/?[a-z][\s\S]*>/i.test(content);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function isSafeUrl(value: string) {
  const trimmed = value.trim().replace(/[\u0000-\u001f\u007f\s]+/g, "");
  if (!trimmed || trimmed.startsWith("#")) return true;

  const lower = trimmed.toLowerCase();
  if (SAFE_DATA_URL_PREFIXES.some((prefix) => lower.startsWith(prefix))) {
    return true;
  }
  if (lower.startsWith("blob:")) return true;

  return false;
}

function sanitizeCss(value: string) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@import[^;]+;?/gi, "")
    .replace(/url\([^)]*\)/gi, "none")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/behavior\s*:/gi, "")
    .replace(/-moz-binding\s*:/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/vbscript\s*:/gi, "")
    .trim();
}

function sanitizeDocument(doc: Document) {
  for (const selector of FORBIDDEN_ELEMENTS) {
    doc.querySelectorAll(selector).forEach((node) => node.remove());
  }

  doc.querySelectorAll("style").forEach((style) => {
    style.textContent = sanitizeCss(style.textContent ?? "");
  });

  for (const element of doc.querySelectorAll("*")) {
    for (const attr of [...element.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value;

      if (
        name.startsWith("on") ||
        name === "srcdoc" ||
        name === "nonce" ||
        name === "integrity" ||
        name === "ping"
      ) {
        element.removeAttribute(attr.name);
        continue;
      }

      if (URL_ATTRS.has(name) && !isSafeUrl(value)) {
        element.removeAttribute(attr.name);
        continue;
      }

      if (name === "style") {
        const safeStyle = sanitizeCss(value);
        if (safeStyle) {
          element.setAttribute(attr.name, safeStyle);
        } else {
          element.removeAttribute(attr.name);
        }
      }
    }

    if (element.tagName.toLowerCase() === "a") {
      element.setAttribute("rel", "noopener noreferrer nofollow");
      element.setAttribute("target", "_blank");
    }
  }
}

function sanitizeUiHtmlFallback(content: string) {
  return content
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<\/?(?:base|embed|iframe|link|meta|noscript|object)\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(?:srcdoc|nonce|integrity|ping)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(
      /\s(?:action|background|formaction|href|poster|src|xlink:href)\s*=\s*(["'])(.*?)\1/gi,
      (_match, _quote: string, value: string) =>
        isSafeUrl(value) ? _match : ""
    )
    .replace(
      /\sstyle\s*=\s*(["'])(.*?)\1/gi,
      (_match, quote: string, value: string) => {
        const safeStyle = sanitizeCss(value);
        return safeStyle ? ` style=${quote}${safeStyle}${quote}` : "";
      }
    )
    .replace(
      /<style\b[^>]*>([\s\S]*?)<\/style>/gi,
      (_match, css: string) => `<style>${sanitizeCss(css)}</style>`
    );
}

export function sanitizeUiHtml(content: string) {
  if (typeof DOMParser === "undefined") {
    return sanitizeUiHtmlFallback(content);
  }

  const doc = new DOMParser().parseFromString(content, "text/html");
  sanitizeDocument(doc);

  const headStyles = [...doc.head.querySelectorAll("style")]
    .map((style) => style.outerHTML)
    .join("");
  const bodyHtml = doc.body.innerHTML || escapeHtml(content);

  return `${headStyles}${bodyHtml}`;
}

export function buildSanitizedUiDocument(content: string, title = "Website") {
  const body = hasHtmlContent(content)
    ? sanitizeUiHtml(content)
    : `<main class="plain">${escapeHtml(content)}</main>`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${SANITIZED_UI_CSP}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
* { box-sizing: border-box; }
html, body { min-height: 100%; margin: 0; }
body {
  background: #ffffff;
  color: #111827;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
img, video, canvas, svg { max-width: 100%; }
.plain {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 48px;
  white-space: pre-wrap;
  font: 600 18px/1.5 ui-sans-serif, system-ui, sans-serif;
}
</style>
</head>
<body>${body}</body>
</html>`;
}
