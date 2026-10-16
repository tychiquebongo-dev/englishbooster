/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  onDemandEntries: {
    maxInactiveAge: 120 * 1000,
    pagesBufferLength: 8,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'canvas-confetti'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config) => {
    config.output = config.output || {};
    config.output.chunkLoadingGlobal = 'webpackChunk_englishbooster';
    return config;
  },
};

module.exports = nextConfig;

