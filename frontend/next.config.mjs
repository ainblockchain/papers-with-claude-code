import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin'

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      }

      config.plugins.push(
        new MonacoWebpackPlugin({
          languages: ['json', 'python', 'markdown', 'typescript', 'javascript'],
          features: [
            'bracketMatching',
            'clipboard',
            'coreCommands',
            'cursorUndo',
            'find',
            'folding',
            'format',
            'hover',
            'linesOperations',
            'multicursor',
            'suggest',
          ],
        }),
      )
    }

    config.module.rules.push({
      test: /\.ttf$/,
      type: 'asset/resource',
    })

    return config
  },
  turbopack: {},
  experimental: {
    optimizePackageImports: ['@monaco-editor/react'],
  },
}

export default nextConfig
