/**
 * PM2 process file for KiniKerja on VPS
 * Usage: pm2 start deploy/ecosystem.config.cjs
 */
module.exports = {
  apps: [
    {
      name: 'kinikerja',
      script: 'server/index.js',
      cwd: process.cwd(),
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOST: '0.0.0.0',
        ENABLE_CRON: 'true',
      },
      // Load secrets from .env via dotenv inside server/index.js
      // Or use: env_file: '.env' (pm2 ecosystem doesn't natively support env_file;
      // export vars in shell or use dotenv)
    },
  ],
};
