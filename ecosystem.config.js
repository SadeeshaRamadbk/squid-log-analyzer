module.exports = {
  apps: [
    {
      name: 'squid-web-dashboard',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        COOKIE_SECURE: 'false',
      },
    },
    {
      name: 'squid-log-ingest',
      script: 'npm',
      args: 'run ingest',
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'pfsense-netflow-collector',
      script: 'npm',
      args: 'run netflow',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
