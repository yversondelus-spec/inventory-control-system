import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@repo/ui'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
