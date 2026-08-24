"use client";

import { useEffect, useRef, useState } from "react";
import { buildShareText, buildXIntentUrl, type ShareablePageType } from "@/lib/share";

const TRIGGER_CLASS =
  "flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-900";

const MENU_ITEM_CLASS =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800";

export function ShareButton({
  type,
  title,
  path,
  hook,
}: {
  type: ShareablePageType;
  title: string;
  /** Site-relative canonical path, e.g. detail.url. */
  path: string;
  /** Optional richer one-line hook for X — see lib/share.ts. */
  hook?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nativeShareAvailable, setNativeShareAvailable] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNativeShareAvailable(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function absoluteUrl(): string {
    return `${window.location.origin}${path}`;
  }

  async function handleTrigger() {
    if (nativeShareAvailable) {
      const url = absoluteUrl();
      try {
        await navigator.share({ title, text: buildShareText({ type, title, url, hook }), url });
      } catch {
        // User cancelled the share sheet, or the platform rejected it — nothing to recover from.
      }
      return;
    }
    setOpen((v) => !v);
  }

  function handleXShare() {
    window.open(buildXIntentUrl({ type, title, url: absoluteUrl(), hook }), "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(buildShareText({ type, title, url: absoluteUrl() }));
    setCopied(true);
    setOpen(false);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div ref={containerRef} className="relative">
      <button type="button" onClick={handleTrigger} className={TRIGGER_CLASS} aria-haspopup={!nativeShareAvailable} aria-expanded={open}>
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9" />
        </svg>
        {copied ? "Copied!" : "Share"}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Share options"
          className="absolute right-0 z-20 mt-1.5 w-44 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <button type="button" role="menuitem" onClick={handleXShare} className={MENU_ITEM_CLASS}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true">
              <path d="M18.9 2H22l-7.5 8.6L23 22h-6.9l-5.4-6.5L4.5 22H1.3l8.1-9.2L1 2h7.1l4.9 5.9L18.9 2Zm-1.2 18h1.7L6.4 4H4.6l13.1 16Z" />
            </svg>
            Share on X
          </button>
          <button type="button" role="menuitem" onClick={handleCopy} className={MENU_ITEM_CLASS}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Copy
          </button>
        </div>
      )}
    </div>
  );
}
