import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const backendApiUrl = process.env.BACKEND_API_URL?.replace(/\/$/, '');
    if (!backendApiUrl) return [];
    return [{ source: '/api/v1/:path*', destination: `${backendApiUrl}/api/v1/:path*` }];
  },
};

export default nextConfig;
