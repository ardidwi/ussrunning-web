import { ImageResponse } from "next/og";

/** Branded 1200×630 share image used when a page has no CMS cover. */
export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#050505",
          color: "#f4f1ea",
          padding: "72px 80px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, letterSpacing: 6, color: "#a8a39a" }}>
          <span>JAKARTA, INDONESIA</span>
          <span>EST. 2024</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 168, fontWeight: 900, lineHeight: 0.9, letterSpacing: -4 }}>USS RUNNING</div>
          <div style={{ fontSize: 56, fontWeight: 800, marginTop: 28, letterSpacing: 2 }}>
            WE RUN. WE CONNECT. WE MOVE.
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 24, letterSpacing: 5, color: "#a8a39a" }}>
          <span>RUNNING / COMMUNITY / CULTURE</span>
          <span>COMMUNITY IN MOTION</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
