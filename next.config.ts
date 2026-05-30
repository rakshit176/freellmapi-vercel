import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: "/home/z/my-project/freellmapi-vercel",
  },
};

export default nextConfig;
