import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@repo/ui'],
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;