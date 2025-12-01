/** @type {import('next').NextConfig} */
const nextConfig = {
  // Increase API route body size limit to 50MB for large templates with images
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    }
  }
}

module.exports = nextConfig

