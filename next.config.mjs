/** @type {import('next').NextConfig} */
const nextConfig = {
  // Server Actions haben default 1 MB body-limit — auf 50 MB anheben,
  // damit Logo-/Profilbild-Uploads nicht am Framework-Limit scheitern.
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Erlaubt Browser DNS-Prefetching
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          // Erzwingt HTTPS für 2 Jahre (inkl. Subdomains)
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          // Verhindert Clickjacking (kein iFrame-Einbetten auf fremden Seiten)
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          // Verhindert MIME-Type Sniffing
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Referrer nur bei Same-Origin vollständig, bei Cross-Origin nur Origin
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          // Deaktiviert Browser-Features die wir nicht nutzen
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig
