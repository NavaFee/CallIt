/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@callit/core', '@callit/db'],
  webpack: (config) => {
    // @callit/core uses NodeNext-style `.js` specifiers in TS source
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
    };
    return config;
  },
};

export default nextConfig;
