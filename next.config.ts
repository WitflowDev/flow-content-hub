import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  agentRules: false,
  devIndicators: false,
  serverExternalPackages: ['google-auth-library', 'firebase-admin'],
}

export default nextConfig
