import { ImageResponse } from "next/og";

export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 20,
          background: "#0f1419",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 4,
          fontFamily: "Arial, sans-serif",
        }}
      >
        <span style={{ color: "#f5a623", fontWeight: "bold" }}>K</span>
        <span style={{ color: "#f5a623", fontSize: 12, marginTop: 4 }}>sc</span>
      </div>
    ),
    {
      ...size,
    }
  );
}
