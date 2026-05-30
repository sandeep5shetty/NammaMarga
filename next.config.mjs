/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [{ source: "/pricing", destination: "/", permanent: false }];
  },
};

export default nextConfig;
