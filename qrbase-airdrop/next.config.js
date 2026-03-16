/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", ".prisma/client"],
  },
};

module.exports = nextConfig;

try {
  const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare");
  initOpenNextCloudflareForDev();
} catch {
  // The adapter is only needed for Cloudflare preview/deploy workflows.
}
