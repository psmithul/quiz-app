import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};
module.exports = {
  eslint: {
    // Warning: this allows production builds to complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};
export default nextConfig;
