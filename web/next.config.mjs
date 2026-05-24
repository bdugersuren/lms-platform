/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  webpack: (config) => {
    // pdfjs-dist uses canvas as an optional peer dep for Node.js; ignore it in the browser build
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
