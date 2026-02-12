import type { NextConfig } from 'next';
import { resolve } from 'node:path';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: resolve(import.meta.dirname, '..', '..'),
  transpilePackages: ['@solis/shared'],
};

export default nextConfig;
