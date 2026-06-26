import type { NextConfig } from "next";

// Set by the GitHub Pages workflow so assets resolve under
// https://<usuario>.github.io/<repositorio>/
const basePath = process.env.NEXT_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
};

export default nextConfig;
