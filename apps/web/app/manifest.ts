import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sagat Singh Research Foundation",
    short_name: "SSRF",
    description: "A documented, source-referenced record of the life and campaigns of Lt Gen Sagat Singh.",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F0E6",
    theme_color: "#2F391C",
    lang: "en-IN",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }, { src: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  };
}
