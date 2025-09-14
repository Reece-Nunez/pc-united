import type { NextConfig } from "next";
import { withNextVideo } from 'next-video/process';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@aws-sdk'],
  // Add timeout configuration
  serverRuntimeConfig: {
    // Increase API timeout to 5 minutes for large uploads
    apiTimeout: 300000,
  },
};

export default withNextVideo(nextConfig);
