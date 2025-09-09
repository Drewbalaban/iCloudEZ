import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'epglytuhydzvitrcuvzj.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'epglytuhydzvitrcuvzj.supabase.co',
        port: '',
        pathname: '/storage/v1/object/sign/**',
      },
    ],
  },
};

export default nextConfig;
