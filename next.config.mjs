/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/instruct",
        destination: "/api/instruct",
      },
      {
        source: "/bio_data",
        destination: "/api/bio_data",
      },
      {
        source: "/pi_instructions",
        destination: "/api/pi_instructions",
      },
      {
        source: "/raw",
        destination: "/api/db?format=text",
      },
    ];
  },
};

export default nextConfig;
