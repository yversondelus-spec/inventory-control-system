import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@repo/ui'],
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;