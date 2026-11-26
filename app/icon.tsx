import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/** Square USS mark for the browser tab (the wordmark logo is too wide for a favicon). */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050505",
          color: "#f4f1ea",
          fontSize: 28,
          fontWeight: 900,
          letterSpacing: -1,
          fontFamily: "sans-serif",
        }}
      >
        USS
      </div>
    ),
    size,
  );
}
