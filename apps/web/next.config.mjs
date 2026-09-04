/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ecommerce/core', '@ecommerce/config'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
