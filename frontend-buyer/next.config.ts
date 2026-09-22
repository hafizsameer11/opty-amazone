import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  // /var/www contains an unrelated package-lock.json on production. Without
  // an explicit root, Turbopack can resolve its workspace from there instead
  // of this Buyer project and emit an incompatible client runtime bundle.
  turbopack: {
    root: process.cwd(),
  },
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
