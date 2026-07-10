import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "api.dicebear.com",
      },
      {
        protocol: "https",
        hostname: "secure.gravatar.com",
      },
      {
        // GitHub contribution chart service used by GitHubGraph component
        protocol: "https",
        hostname: "ghchart.rshah.org",
      },
    ],
  },
};

export default nextConfig;
