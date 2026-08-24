import { ImageResponse } from "next/og";
import { getLogoDataUri } from "@/lib/logo";
import { getAllRoadmaps, getRoadmapDetail } from "@/lib/roadmaps";

export const alt = "DevOps Interview KB Roadmap preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllRoadmaps().map((r) => ({ slug: r.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const detail = getRoadmapDetail(slug);
  const title = detail?.title ?? "DevOps Roadmap";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <img src={getLogoDataUri()} width={48} height={48} style={{ borderRadius: 24 }} />
          <div style={{ fontSize: 24, color: "#818cf8", fontWeight: 600, letterSpacing: 2 }}>DEVOPS INTERVIEW KB</div>
          <div style={{ fontSize: 20, color: "#94a3b8" }}>· Roadmap</div>
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.2, maxWidth: 1040 }}>{title}</div>
        <div style={{ fontSize: 26, color: "#cbd5e1" }}>A staged learning path for interview readiness</div>
      </div>
    ),
    { ...size },
  );
}
