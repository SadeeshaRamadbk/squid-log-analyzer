module.exports = {
  apps: [
    {
      name: "squid-web-dashboard",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 0.0.0.0",
      cwd: "E:/squid-log-analyzer",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        COOKIE_SECURE: "false"
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "1G"
    },
    {
      name: "pfsense-netflow-collector",
      script: "node_modules/tsx/dist/cli.mjs",
      args: "src/netflow-collector/index.ts",
      cwd: "E:/squid-log-analyzer",
      env: {
        NODE_ENV: "production"
      },
      autorestart: true,
      max_memory_restart: "500M"
    },
    {
      name: "squid-ssh-ingestion",
      script: "node_modules/tsx/dist/cli.mjs",
      args: "src/ingestion/index.ts",
      cwd: "E:/squid-log-analyzer",
      env: {
        NODE_ENV: "production"
      },
      autorestart: true,
      max_memory_restart: "500M"
    }
  ]
};