/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Must stay above the app-wide 50MB upload cap (see the 50 * 1024 * 1024
      // checks in actions.ts, OrderDetail.tsx and google-storage.ts). If this is
      // lower than the uploaded file, Next.js rejects the request *before* the
      // action runs and the client receives `undefined`, which surfaces as
      // "Cannot read properties of undefined (reading 'success')". The headroom
      // covers multipart/form-data encoding overhead.
      bodySizeLimit: '60mb',
    },
  },
};

export default nextConfig;
