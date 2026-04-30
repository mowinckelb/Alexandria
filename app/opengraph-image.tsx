import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "alexandria — the thinking republic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Fetches a single TTF file referenced by a Google Fonts CSS URL.
// Satori (the engine behind next/og) only accepts TTF/OTF, not WOFF2,
// so we send an older User-Agent that triggers Google's TTF fallback.
async function loadGoogleFont(cssUrl: string): Promise<ArrayBuffer> {
  const css = await fetch(cssUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 6.1)" },
  }).then((r) => r.text());
  const url = css.match(/src:\s*url\((https:\/\/[^)]+\.ttf)\)/)?.[1];
  if (!url) throw new Error("Could not resolve TTF URL from Google Fonts CSS");
  return fetch(url).then((r) => r.arrayBuffer());
}

export default async function OpengraphImage() {
  const [spectralItalic, spectralRegular] = await Promise.all([
    loadGoogleFont(
      "https://fonts.googleapis.com/css2?family=Spectral:ital,wght@1,500&display=swap",
    ),
    loadGoogleFont(
      "https://fonts.googleapis.com/css2?family=Spectral:wght@500&display=swap",
    ),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          background: "#f8f0e0",
          backgroundImage:
            "radial-gradient(ellipse 70% 60% at 100% 100%, rgba(20, 12, 6, 0.18), rgba(20, 12, 6, 0) 70%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Spectral",
          color: "#2a1f28",
        }}
      >
        <div
          style={{
            fontSize: 220,
            fontStyle: "italic",
            fontWeight: 500,
            letterSpacing: "-0.026em",
            lineHeight: 0.9,
            display: "flex",
          }}
        >
          alexandria
          <span style={{ fontStyle: "normal", marginLeft: "-0.04em" }}>.</span>
        </div>
        <div
          style={{
            marginTop: 36,
            fontSize: 42,
            fontStyle: "italic",
            fontWeight: 500,
            color: "#7a6a70",
            letterSpacing: "0.005em",
          }}
        >
          the thinking republic
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Spectral",
          data: spectralItalic,
          style: "italic",
          weight: 500,
        },
        {
          name: "Spectral",
          data: spectralRegular,
          style: "normal",
          weight: 500,
        },
      ],
    },
  );
}
