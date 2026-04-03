/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pbs.twimg.com" },
      { protocol: "https", hostname: "imagedelivery.net" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "i.imgur.com" },
      { protocol: "https", hostname: "warpcast.com" },
      { protocol: "https", hostname: "d1kgk9u8ytew77.cloudfront.net" },
      { protocol: "https", hostname: "tba-mobile.mypinata.cloud" },
      { protocol: "https", hostname: "openseauserdata.com" },
      { protocol: "https", hostname: "ipfs.decentralized-content.com" },
    ],
  },
};

module.exports = nextConfig;

try {
  const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare");
  initOpenNextCloudflareForDev();
} catch {
  // The adapter is only needed for Cloudflare preview/deploy workflows.
}
