/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL;

const nextConfig = {
  typescript: {
    // Allows production builds to successfully complete even if your project has type errors
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allows production builds to successfully complete even if your project has ESLint warnings/errors
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      // Single-origin traffic: no CORS in the browser, backend URL stays server-side.
      { source: "/backend/:path*", destination: `${BACKEND_URL}/:path*` },
    ];
  },
};

export default nextConfig;