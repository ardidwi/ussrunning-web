import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Public event listings live under /runs; /events is a common guess and old link.
      { source: "/events", destination: "/runs", permanent: true },
      { source: "/events/:slug", destination: "/runs/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
