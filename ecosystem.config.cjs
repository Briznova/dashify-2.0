const path = require("node:path");

const frontendDir = path.join(__dirname, "apps", "frontend");
const backendDir = path.join(__dirname, "apps", "backend");

module.exports = {
  apps: [
    {
      name: "dashify-frontend",
      cwd: frontendDir,
      script: path.join(frontendDir, "node_modules", "next", "dist", "bin", "next"),
      args: "dev",
      env: { NODE_ENV: "development" },
      autorestart: true,
      restart_delay: 3000,
    },
    {
      name: "dashify-backend",
      cwd: backendDir,
      script: path.join(backendDir, "node_modules", "@nestjs", "cli", "bin", "nest.js"),
      args: "start --watch",
      env: { NODE_ENV: "development" },
      autorestart: true,
      restart_delay: 3000,
    },
    {
      name: "dashify-prisma-studio",
      cwd: backendDir,
      script: path.join(backendDir, "node_modules", "prisma", "build", "index.js"),
      args: "studio --port 5555",
      env: { NODE_ENV: "development" },
      autorestart: true,
      restart_delay: 3000,
    },
  ],
};
