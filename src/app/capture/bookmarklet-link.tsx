"use client";

import { Check, Clipboard, MousePointerClick } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/shared/ui/button";

export function buildBookmarklet(base: string) {
  return `javascript:(()=>{const s=window.getSelection()?.toString().trim();const m=document.querySelector('meta[name="description"]')?.content;const t=(s||m||document.body.innerText).slice(0,6000);const u=new URL('${base}/import');u.searchParams.set('url',location.href);u.searchParams.set('title',document.title);u.searchParams.set('text',t);window.open(u.toString(),'_blank')})()`;
}

export function BookmarkletLink({ base }: { base: string }) {
  const anchor = useRef<HTMLAnchorElement>(null);
  const [copied, setCopied] = useState(false);
  const script = buildBookmarklet(base);

  // React intentionally blocks javascript: href values. A bookmarklet is installed by
  // dragging/copying the link, so set the attribute after hydration instead of navigating.
  useEffect(() => { anchor.current?.setAttribute("href", script); }, [script]);

  async function copy() {
    await navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return <div className="mt-6 flex flex-wrap items-center gap-3">
    <a ref={anchor} className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-md border border-transparent bg-[var(--accent)] px-4 text-sm font-semibold text-white transition hover:opacity-90" title="Перетащите эту кнопку на панель закладок" onClick={(event) => event.preventDefault()}>
      <MousePointerClick size={17} /> Отправить в Job Radar
    </a>
    <Button onClick={copy}>{copied ? <Check size={16} /> : <Clipboard size={16} />}{copied ? "Скопировано" : "Скопировать код"}</Button>
  </div>;
}
