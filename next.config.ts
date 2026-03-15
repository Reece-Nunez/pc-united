import type { NextConfig } from "next";
import { withNextVideo } from 'next-video/process';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@aws-sdk'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pc-united.s3.us-east-1.amazonaws.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'woaifjyohjmtyfrgtrbo.supabase.co',
        pathname: '/storage/**',
      },
    ],
  },
};

export default withNextVideo(nextConfig);
