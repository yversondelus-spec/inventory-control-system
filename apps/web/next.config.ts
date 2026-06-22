import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@repo/ui'],
  typedRoutes: false,
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
};

export default nextConfig;