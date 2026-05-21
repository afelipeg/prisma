import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@prism/core', '@prism/compiler'],

  // The Prism packages use `.js` import specifiers (NodeNext / bundler convention)
  // but the actual sources are `.ts`. Tell webpack to look up `.ts`/`.tsx` first.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
