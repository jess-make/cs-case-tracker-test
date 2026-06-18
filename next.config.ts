import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** 預設 false；明確設定避免 webhook POST 被 trailing slash 308 redirect */
  trailingSlash: false,
  skipTrailingSlashRedirect: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "52mb",
    },
  },
};

export default nextConfig;
