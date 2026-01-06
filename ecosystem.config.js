module.exports = {
  apps: [{
    name: 'fonaredd-app',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3001',
    cwd: '/opt/fonaredd-app',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
