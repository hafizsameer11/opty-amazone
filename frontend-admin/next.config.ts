import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  // Production /var/www contains other projects' package-lock files. Keep
  // Turbopack's dependency resolution scoped to this Admin application.
  turbopack: {
    root: process.cwd(),
  },
  /* config options here */
  reactStrictMode: true,
};

export default nextConfig;
