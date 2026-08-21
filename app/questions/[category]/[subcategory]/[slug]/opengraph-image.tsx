import { ImageResponse } from "next/og";
import { labelize } from "@/lib/format";
import { getAllQuestions, getCategoryName, getQuestionDetail } from "@/lib/questions";

export const alt = "DevOps interview question preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return getAllQuestions().map((q) => ({
    category: q.category,
    subcategory: q.subcategory,
    slug: q.slug,
  }));
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "#34d399",
  intermediate: "#38bdf8",
  advanced: "#fbbf24",
  expert: "#fb7185",
};

export default async function Image({
  params,
}: {
  params: Promise<{ category: string; subcategory: string; slug: string }>;
}) {
  const { category, subcategory, slug } = await params;
  const detail = getQuestionDetail(category, subcategory, slug);
  const title = detail?.title ?? "DevOps Interview Question";
  const difficulty = detail?.difficulty ?? "intermediate";
  const categoryName = detail ? (getCategoryName(detail.category) ?? labelize(detail.category)) : "DevOps";
  const color = DIFFICULTY_COLORS[difficulty] ?? "#818cf8";

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
          <div style={{ fontSize: 24, color: "#818cf8", fontWeight: 600, letterSpacing: 2 }}>DEVOPS INTERVIEW KB</div>
          <div style={{ fontSize: 20, color: "#94a3b8" }}>{`· ${categoryName}`}</div>
        </div>
        <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.2, maxWidth: 1040 }}>{title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 26, color, fontWeight: 600 }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: color, display: "flex" }} />
          {labelize(difficulty)}
        </div>
      </div>
    ),
    { ...size },
  );
}
