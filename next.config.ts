import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  
  // Optimize images and fonts  
  images: {
    unoptimized: true, // For static export
  },
  
  // Tree shaking improvements
  webpack: (config) => {
    config.optimization.usedExports = true;
    return config;
  },
};

export default nextConfig;
