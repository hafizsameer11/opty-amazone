import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  async rewrites() {
    return [
      {
        // Keep Buyer API calls same-origin in production. This prevents a
        // browser extension or cross-origin policy from blocking every
        // dynamic Buyer request while Laravel remains the API authority.
        source: "/vista-service/:path*",
        destination: "https://api.vistaexpress.it/api/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        // Turbopack can expose route chunks under stable names such as
        // app/page.js. Revalidate those assets after a deployment so the
        // browser cannot retain an older client bundle than the HTML shell.
        source: "/_next/static/chunks/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "plus.unsplash.com",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "localhost",
        port: "8000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "api.vistaexpress.it",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "api.vistaexpress.it",
        pathname: "/**",
      },
    ],
    // Allow loading images from localhost
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
