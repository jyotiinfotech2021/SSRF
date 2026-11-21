import { ytThumb } from "@/lib/yt";

/** A poster that links to the original video, with its thumbnail when one is held locally. */
export default function VideoThumb({ link, title, label, duration, type, host }: { link?: string; title: string; label?: string; duration?: string; type?: string; host?: string }) {
  const img = ytThumb(link);
  return (
    <a className="vthumbwrap" href={link} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${title}${host ? ` on ${host}` : ""}`}>
      <div className="vposter"><span className="vposter-camp">{label || type || "Video"}</span><span className="vposter-title">{title}</span></div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {img && <img className="vthumb" src={img} alt="" loading="lazy" />}
      <span className="vplay" aria-hidden="true" />
      {duration && <span className="vdur">{duration}</span>}
      {type && type !== "Documentary" && <span className="vtype">{type}</span>}
    </a>
  );
}
