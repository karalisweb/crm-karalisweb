// PM2 Configuration — Sales CRM
// Avvia con: pm2 start ecosystem.config.cjs
// Deploy:    ./deploy-quick.sh

module.exports = {
  apps: [{
    name: 'sales-crm',
    script: '.next/standalone/server.js',
    cwd: '/opt/sales-app',
    env: {
      NODE_ENV: 'production',
      PORT: 3003,
      HOSTNAME: '0.0.0.0',
    },
    // Come gira davvero sul server (prima era una modifica locale che ogni deploy
    // metteva da parte con git stash): solo .env.
    env_file: '.env',
    // Restart automatico se crasha
    autorestart: true,
    max_restarts: 10,
    restart_delay: 3000,
    // Memoria max (restart se supera)
    max_memory_restart: '1G',
    // Log
    error_file: '/opt/sales-app/logs/error.log',
    out_file: '/opt/sales-app/logs/out.log',
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
