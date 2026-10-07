import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/register", destination: "/signup", permanent: true },
      { source: "/ai-guidance", destination: "/recommendations", permanent: true },
    ];
  },
  async rewrites() {
    return [
      { source: "/auth/login", destination: "/login" },
      { source: "/auth/signup", destination: "/signup" },
    ];
  },
};

export default nextConfig;
