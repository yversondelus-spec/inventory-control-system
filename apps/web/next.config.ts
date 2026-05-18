import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@repo/shared-types', '@repo/ui'],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
