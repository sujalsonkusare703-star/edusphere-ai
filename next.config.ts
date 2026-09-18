import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/auth/login", destination: "/login" },
      { source: "/auth/signup", destination: "/signup" },
    ];
  },
};

export default nextConfig;
