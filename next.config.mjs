/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL;
const NGROK_HLS_BASE = process.env.NGROK_HLS_BASE;

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
      // Handles /hls/cam/index.m3u8 -> Ngrok /cam/index.m3u8
      {
        source: "/hls/cam/:path*",
        destination: `${NGROK_HLS_BASE}/cam/:path*`,
      },
      // Handles /cam/index.m3u8 -> Ngrok /cam/index.m3u8
      {
        source: "/cam/:path*",
        destination: `${NGROK_HLS_BASE}/cam/:path*`,
      },
      // Fallback for any other /hls/ path
      {
        source: "/hls/:path*",
        destination: `${NGROK_HLS_BASE}/cam/:path*`,
      },
    ];
  },
};

export default nextConfig;