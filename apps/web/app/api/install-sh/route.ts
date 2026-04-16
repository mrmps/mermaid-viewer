import { baseUrl } from "@/lib/env";

const INSTALL_SH = `#!/bin/sh
set -e

# merm.sh CLI installer
# Usage: curl -fsSL https://merm.sh/install.sh | sh

BOLD="\\033[1m"
DIM="\\033[2m"
GREEN="\\033[32m"
RED="\\033[31m"
RESET="\\033[0m"

err() { printf "\${RED}Error:\${RESET} %s\\n" "$1" >&2; exit 1; }

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
  err "Node.js is required (>= 18). Install it from https://nodejs.org"
fi

NODE_VERSION=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [ "$NODE_VERSION" -lt 18 ] 2>/dev/null; then
  err "Node.js >= 18 required (found v$NODE_VERSION)"
fi

# Pick install dir
if [ -d "$HOME/.local/bin" ]; then
  INSTALL_DIR="$HOME/.local/bin"
elif [ -w /usr/local/bin ]; then
  INSTALL_DIR="/usr/local/bin"
else
  INSTALL_DIR="$HOME/.local/bin"
  mkdir -p "$INSTALL_DIR"
fi

DEST="$INSTALL_DIR/mermaidsh"

# Download
printf "\${DIM}Downloading mermaidsh...\${RESET}\\n"
curl -fsSL "${baseUrl}/mermaidsh.mjs" -o "$DEST"
chmod +x "$DEST"

# Verify
if [ -x "$DEST" ]; then
  printf "\\n\${GREEN}\${BOLD}Installed!\${RESET} %s\\n" "$DEST"
  printf "\\n  \${BOLD}Quick start:\${RESET}\\n"
  printf "    echo \\"graph TD; A-->B\\" | mermaidsh create\\n"
  printf "    mermaidsh create diagram.mmd -t \\"My Diagram\\"\\n"
  printf "    mermaidsh --help\\n\\n"

  # Check if in PATH
  case ":$PATH:" in
    *":$INSTALL_DIR:"*) ;;
    *)
      printf "  \${DIM}Note: %s is not in your PATH.\\n" "$INSTALL_DIR"
      printf "  Add it with: export PATH=\\"%s:\\$PATH\\"\\n\${RESET}\\n" "$INSTALL_DIR"
      ;;
  esac
else
  err "Installation failed"
fi
`;

export async function GET() {
  return new Response(INSTALL_SH, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
