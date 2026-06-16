import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Hardcoded fallback data in case the external server is unreachable
const FALLBACK_VERSIONS = [
  {
    "date": "Tue 21 Oct 2025 16:14",
    "title": "4.6.4 Regression",
    "desc": "Download HamrahBaam_4.6.4_b1-develop.ipa",
    "plistUrl": "manifest_4.6.4_b1-develop.plist"
  },
  {
    "date": "Wed 22 Oct 2025 14:50",
    "title": "Regression V4.6.4 B2",
    "desc": "Download HamrahBaam_4.6.4_b2-develop.ipa",
    "plistUrl": "manifest_4.6.4_b2-develop.plist"
  }
];

// API endpoint to fetch versions and proxy them safely to avoid CORS issues
app.get("/api/versions", async (req, res) => {
  try {
    const response = await fetch("https://iosbaam.ir/test/versions.json", {
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) iOS Beta Dist Engine"
      },
      // Short timeout to guarantee fast page loads even if user's server is slow/unreachable
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`External server returned status: ${response.status}`);
    }

    const data = await response.json();
    res.json({
      success: true,
      data,
      isFallback: false
    });
  } catch (error: any) {
    console.warn("Proxy fetch to https://iosbaam.ir/test/versions.json failed, serving fallback data. Error:", error.message || error);
    res.json({
      success: true,
      data: FALLBACK_VERSIONS,
      isFallback: true,
      error: error.message || String(error)
    });
  }
});

// Set up Vite or static serving based on environment
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use("/test", express.static(distPath));
    app.get("/test/*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
