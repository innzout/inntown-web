import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  poweredByHeader: false,
  images: { unoptimized: true },
  // There is a second lockfile higher up (D:\Innzout); pin the root to this app.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
