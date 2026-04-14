/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://gateway:80/api/:path*' },
      { source: '/his/:path*', destination: 'http://gateway:80/his/:path*' },
    ];
  },
};

module.exports = nextConfig;
