/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: []
  },
  turbopack: {
    root: import.meta.dirname,
  },
}

export default nextConfig
