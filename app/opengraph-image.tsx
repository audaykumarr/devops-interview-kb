import { ImageResponse } from "next/og";
import { getLogoDataUri } from "@/lib/logo";
import { SITE_NAME } from "@/lib/site";

export const alt = SITE_NAME;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <img src={getLogoDataUri()} width={84} height={84} style={{ borderRadius: 42 }} />
          <div style={{ fontSize: 28, color: "#818cf8", fontWeight: 600, letterSpacing: 2 }}>DEVOPS INTERVIEW KB</div>
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, marginTop: 32, lineHeight: 1.15, maxWidth: 980 }}>
          Practical DevOps Interview Questions
        </div>
        <div style={{ fontSize: 30, color: "#cbd5e1", marginTop: 24, maxWidth: 900 }}>
          Scenario-driven prep for real production engineering interviews
        </div>
      </div>
    ),
    { ...size },
  );
}
