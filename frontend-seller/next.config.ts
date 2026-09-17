import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/storage/**",
      },
      {
        protocol: "https",
        hostname: "localhost",
        port: "8000",
        pathname: "/storage/**",
      },
      {
        protocol: "http",
        hostname: "api.vistaexpress.it",
        pathname: "/storage/**",
      },
      {
        protocol: "https",
        hostname: "api.vistaexpress.it",
        pathname: "/storage/**",
      },
    ],
  },
};

export default nextConfig;
