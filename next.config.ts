import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: "750mb",
    serverActions: {
      bodySizeLimit: "750mb"
    }
  }
};

export default nextConfig;
