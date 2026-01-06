/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration de base sans PWA
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  // Mode standalone pour déploiement
  output: 'standalone',
  // Pas de redirections automatiques
  async redirects() {
    return [];
  },
  // Variables d'environnement
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Configuration pour Docker
  experimental: {
    outputFileTracingRoot: process.env.DOCKER_BUILD ? '/app' : undefined,
  },
  // Désactiver ESLint temporairement
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Désactiver TypeScript temporairement
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configuration pour éviter les problèmes de session
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
