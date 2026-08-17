import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Arena live preview (E2B reverse proxy): the dev server must accept
  // cross-origin requests arriving from the browser-facing preview domain,
  // otherwise Next.js dev-mode origin protection blocks JS chunks with 403.
  allowedDevOrigins: [
    "3000-i717vbw6bd5skg3wbconr.e2b.app",
    "*.e2b.app",
    "127.0.0.1",
    "localhost",
  ],
};

export default nextConfig;
