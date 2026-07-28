/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '/projects',
  assetPrefix: '/projects',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/calendar',
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig
