/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: [
      '@ainblockchain/ain-js',
      '@ainblockchain/ain-util',
      'eccrypto',
      'elliptic',
    ],
  },
};

module.exports = nextConfig;
