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
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d1521",
          borderRadius: 6,
        }}
      >
        {/* Target icon - cerchi concentrici oro */}
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          stroke="#d4a726"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="10" />
          <circle cx="11" cy="11" r="6" />
          <circle cx="11" cy="11" r="2" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
