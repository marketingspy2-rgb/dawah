import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The demo stores data in a local JSON file, so it must run on Node.
  serverExternalPackages: [],
};

export default nextConfig;
