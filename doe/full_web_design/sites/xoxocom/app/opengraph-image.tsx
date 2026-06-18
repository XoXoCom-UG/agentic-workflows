import { ImageResponse } from "next/og";
import { site } from "@/lib/config";

// Site-wide default Open Graph / Twitter image. A root-level opengraph-image is inherited
// by every route, so all pages get an og:image without per-page work. Generated at build
// time with next/og (built in — no external service, no cost). On-brand: coral on dark.

export const alt = `${site.company} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#0b0e11";
const FG = "#eaecef";
const MUTED = "#8c8f92";
const ACCENT = "#fb6b4c";

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
          <div style={{ fontSize: "34px", color: MUTED, letterSpacing: "0.04em" }}>{site.company}</div>
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
          Moderne Arbeitsweisen und A.I. gewinnbringend vereinen
        </div>
        <div style={{ marginTop: "44px", fontSize: "30px", color: MUTED, maxWidth: "880px" }}>
          Coaching · Projekteinsätze · A.I. Transformation für Teams und Unternehmen
        </div>
      </div>
    ),
    { ...size }
  );
}
