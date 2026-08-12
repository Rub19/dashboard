export function stripMarkup(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function wordCount(text: string): number {
  const clean = text.trim();
  if (!clean) return 0;
  return clean.split(/\s+/).length;
}

export function wordCountFromHtml(html: string): number {
  return wordCount(stripMarkup(html));
}
