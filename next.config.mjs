/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL ;
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
      {
        source: "/backend/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
      {
        source: "/whep",
        destination: WHEP_URL,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/whep",
        headers: [
          {
            key: "ngrok-skip-browser-warning",
            value: "true",
          },
        ],
      },
      {
        source: "/backend/:path*",
        headers: [
          {
            key: "ngrok-skip-browser-warning",
            value: "true",
          },
        ],
      },
    ];
  },
};

export default nextConfig;