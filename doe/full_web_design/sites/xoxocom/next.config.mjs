/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["nodemailer"],
  // Legal pages read Markdown from ./content at request time (force-dynamic),
  // so the files must be bundled into their serverless functions on Vercel.
  outputFileTracingIncludes: {
    "/impressum": ["./content/**/*"],
    "/datenschutz": ["./content/**/*"],
    "/agb": ["./content/**/*"],
  },
};

export default nextConfig;
