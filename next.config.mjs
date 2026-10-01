/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL ?? "https://monitoring.snappretail.io";

const nextConfig = {
  async rewrites() {
    return [
      // /backend/login → https://monitoring.snappretail.io/login
      // /backend/api/session-review?... → .../api/session-review?...
      // Single-origin traffic: no CORS in the browser, backend URL stays server-side.
      { source: "/backend/:path*", destination: `${BACKEND_URL}/:path*` },
    ];
  },
};

export default nextConfig;