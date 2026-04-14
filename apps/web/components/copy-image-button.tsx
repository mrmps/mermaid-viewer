"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useMediaQuery } from "@/lib/use-media-query";
import { renderMermaid, type MermaidTheme, type MermaidLook } from "@/lib/mermaid-client";
import { ImageIcon, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";

function svgToPngBlob(svg: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, "image/svg+xml");
    const svgEl = doc.querySelector("svg");
    if (!svgEl) return reject(new Error("No SVG element"));

    // Ensure required XML namespaces are present
    if (!svgEl.getAttribute("xmlns")) {
      svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }
    svgEl.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

    // foreignObject children need the XHTML namespace for Image rendering
    svgEl.querySelectorAll("foreignObject > *").forEach((child) => {
      if (!child.getAttribute("xmlns")) {
        child.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
      }
    });

    // Read viewBox for natural dimensions
    const vb = svgEl.getAttribute("viewBox");
    let width = 800;
    let height = 600;
    if (vb) {
      const parts = vb.split(/[\s,]+/).map(Number);
      width = parts[2];
      height = parts[3];
    }

    // Set explicit dimensions
    svgEl.setAttribute("width", String(width));
    svgEl.setAttribute("height", String(height));

    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("No canvas context"));

    const isDark = document.documentElement.classList.contains("dark");
    ctx.fillStyle = isDark ? "#1a1a1a" : "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const img = new Image();
    const serialized = new XMLSerializer().serializeToString(svgEl);
    // Data URLs are more reliable than blob URLs for SVGs with embedded styles
    const dataUrl =
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(serialized);

    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(new Error("Failed to create PNG blob")),
        "image/png",
      );
    };
    img.onerror = () => {
      reject(new Error("Failed to load SVG as image"));
    };
    img.src = dataUrl;
  });
}

function ImagePreview({
  content,
  theme,
  look = "classic",
  onReady,
}: {
  content: string;
  theme: MermaidTheme;
  look?: MermaidLook;
  onReady: (blob: Blob, url: string) => void;
}) {
  const [state, setState] = useState<
    | { status: "generating" }
    | { status: "error"; error: string }
    | { status: "ready"; previewUrl: string }
  >({ status: "generating" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "generating" });

    renderMermaid(content, theme, look)
      .then((svg) => svgToPngBlob(svg))
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setState({ status: "ready", previewUrl: url });
        onReady(blob, url);
      })
      .catch((e) => {
        if (cancelled) return;
        setState({ status: "error", error: e instanceof Error ? e.message : "Failed to generate image" });
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, theme, look]);

  if (state.status === "error") {
    return (
      <div className="flex items-center justify-center h-48 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
        {state.error}
      </div>
    );
  }

  if (state.status === "generating") {
    return (
      <div className="flex items-center justify-center h-48 rounded-lg border border-border bg-muted/50">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden bg-muted/30">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={state.previewUrl}
        alt="Diagram preview"
        className="w-full h-auto max-h-[50vh] object-contain"
      />
    </div>
  );
}

export function CopyImageButton({
  content,
  theme,
  look = "classic",
}: {
  content: string;
  theme: MermaidTheme;
  look?: MermaidLook;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const blobRef = useRef<Blob | null>(null);
  const urlRef = useRef<string | null>(null);
  const isDesktop = useMediaQuery("(min-width: 640px)");

  const handleReady = useCallback((blob: Blob, url: string) => {
    blobRef.current = blob;
    urlRef.current = url;
    setReady(true);
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next);
    if (!next) {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      blobRef.current = null;
      setCopied(false);
      setReady(false);
    }
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (!blobRef.current) return;
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blobRef.current }),
    ]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const trigger = (
    <Button variant="outline" size="sm" onClick={() => handleOpenChange(true)}>
      <ImageIcon className="size-3.5" data-icon="inline-start" aria-hidden="true" />
      Copy Image
    </Button>
  );

  const body = (
    <>
      <ImagePreview content={content} theme={theme} look={look} onReady={handleReady} />
      <div className="flex justify-end">
        <Button
          variant="secondary"
          onClick={copyToClipboard}
          disabled={!ready}
        >
          {copied ? (
            <>
              <Check className="size-3.5" data-icon="inline-start" />
              Copied!
            </>
          ) : (
            "Copy to Clipboard"
          )}
        </Button>
      </div>
    </>
  );

  if (isDesktop) {
    return (
      <>
        {trigger}
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Copy as image</DialogTitle>
              <DialogDescription>
                Preview and copy the diagram as a PNG image.
              </DialogDescription>
            </DialogHeader>
            {body}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Copy as image</DrawerTitle>
            <DrawerDescription>
              Preview and copy the diagram as a PNG image.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-4">{body}</div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
