/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@ainblockchain/ain-js', '@ainblockchain/ain-util', 'eccrypto', 'elliptic', '@x402/core', '@x402/fetch'],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent webpack from bundling ain-js and its native dependencies.
      // The file: reference causes webpack to resolve into the ain-js tree,
      // which includes native addons (eccrypto) that can't be bundled.
      config.externals = config.externals || [];
      config.externals.push({
        '@ainblockchain/ain-js': 'commonjs @ainblockchain/ain-js',
      });
    } else {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
