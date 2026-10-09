/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL;
const WHEP_URL = process.env.WHEP_URL;

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      // Proxy /backend/... API traffic to main backend
      {
        source: "/backend/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
      // Proxy /whep client requests directly to your ngrok WHEP endpoint
      {
        source: "/whep",
        destination: WHEP_URL || "https://fritter-uncolored-stability.ngrok-free.dev/cam/whep",
      },
    ];
  },
  async headers() {
    return [
      {
        // Inject ngrok skip header for all proxied /whep requests on Vercel server-side
        source: "/whep",
        headers: [
          {
            key: "ngrok-skip-browser-warning",
            value: "69420",
          },
        ],
      },
      {
        // Inject ngrok skip header for all proxied /backend requests
        source: "/backend/:path*",
        headers: [
          {
            key: "ngrok-skip-browser-warning",
            value: "69420",
          },
        ],
      },
    ];
  },
};

export default nextConfig;