/**
 * Shared HTML stripping utilities — single source of truth.
 * Previously duplicated 4× across specialized-adapters, public-adapters, local-parser, etc.
 */

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

/** Fix mojibake (latin1 misread as utf-8) that some RSS feeds produce */
export function fixMojibake(value: string): string {
  const markers = (v: string) => (v.match(/(?:Ã.|Â.|â|ð|â€™|â€œ|â€)/g) ?? []).length;
  if (!markers(value)) return value;
  const repaired = Buffer.from(value, "latin1").toString("utf8");
  return markers(repaired) < markers(value) ? repaired : value;
}

/** Strip HTML tags, convert <br> to newlines, decode entities */
export function stripHtml(value: string): string {
  return fixMojibake(
    decodeHtmlEntities(
      value
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    )
  );
}

/** Extract a publicly usable email from text (excludes noreply, example.com etc.) */
export function extractPublicEmail(text: string): string | null {
  const candidate = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() ?? null;
  if (!candidate) return null;
  if (/(?:noreply|no-reply|example\.com|sentry\.io|webpack)/i.test(candidate)) return null;
  return candidate;
}
