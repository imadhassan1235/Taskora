import path from 'node:path';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['fs', 'path'],
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
