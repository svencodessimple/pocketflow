/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for the standalone Docker image build
  output: 'standalone',

  // Optional: Disable the 'X-Powered-By' header for security
  poweredByHeader: false,

  // Optional: Enable React Strict Mode
  reactStrictMode: true,
};

export default nextConfig;
