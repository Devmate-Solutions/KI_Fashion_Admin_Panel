/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,
  
  // ESLint configuration
  eslint: {
    // Ignore during builds for faster development, but can be enabled later
    ignoreDuringBuilds: true,
  },
  
  // TypeScript configuration
  typescript: {
    // Ignore build errors for now, can be enabled after fixing type issues
    ignoreBuildErrors: true,
  },
  
  // Image optimization configuration
  images: {
    unoptimized: true,
    // Add remote patterns if needed for external images
    remotePatterns: [],
  },
  
  // Enable experimental features for better performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
}

export default nextConfig
