/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // We can also proxy /api calls to backend port 8001 if needed
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: "http://127.0.0.1:8001/:path*",
      },
    ];
  },
};

export default nextConfig;
