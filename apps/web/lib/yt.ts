import thumbs from "./thumbs.json";

export const ytId = (u?: string | null) => (String(u ?? "").match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/) ?? [])[1] ?? "";
/** Thumbnails were fetched once and are served from this site, so a page view sends nothing to the video host. */
export const ytThumb = (u?: string | null) => { const id = ytId(u); return id && (thumbs as string[]).includes(id) ? `/thumbs/${id}.jpg` : ""; };
