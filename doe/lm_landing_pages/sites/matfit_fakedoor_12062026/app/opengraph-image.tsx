import { ImageResponse } from "next/og";
import { site } from "@/lib/config";

// Site-wide default Open Graph / Twitter image. A root-level opengraph-image is inherited
// by every route, so all pages get an og:image without per-page work. Generated at build
// time with next/og (built in — no external service, no cost). On-brand: lime on near-black.

export const alt = `${site.company} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#0a0a0a";
const FG = "#fafafa";
const MUTED = "#a3a3a3";
const ACCENT = "#bef264";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          backgroundColor: BG,
          padding: "80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div style={{ width: "28px", height: "28px", borderRadius: "8px", backgroundColor: ACCENT }} />
          <div style={{ fontSize: "34px", color: MUTED, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {site.company}
          </div>
        </div>
        {/* Single text node (no nested span): Satori requires display:flex on any
            element with multiple children, and a lone text node wraps naturally. */}
        <div
          style={{
            marginTop: "40px",
            fontSize: "76px",
            fontWeight: 800,
            color: FG,
            lineHeight: 1.05,
            maxWidth: "950px",
          }}
        >
          Starte deine KI-Transformation
        </div>
        {/* Single interpolated string (not expression + text) so this multi-child-free
            div doesn't trip Satori's "explicit display:flex" requirement. */}
        <div style={{ marginTop: "44px", fontSize: "30px", color: ACCENT, maxWidth: "900px" }}>
          {`${site.tagline} — von der Tech-Stack-Analyse bis zur umsetzbaren Roadmap.`}
        </div>
      </div>
    ),
    { ...size }
  );
}
