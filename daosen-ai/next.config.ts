import type { NextConfig } from "next";
const config: NextConfig = {
  // Docker builds standalone on Linux. Native Windows builds use next start,
  // avoiding a requirement for OS-level symlink privileges.
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  devIndicators: false,
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  async headers() { return [{ source: "/(.*)", headers: [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
  ] }]; }
};
export default config;
