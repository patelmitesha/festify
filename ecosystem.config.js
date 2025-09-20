module.exports = {
  apps: [
    {
      name: 'festify-backend',
      script: './backend/dist/index.js',
      cwd: '/var/www/festify',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/backend-err.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true
    },
    {
      name: 'festify-frontend',
      script: 'serve',
      args: '-s ./frontend/build -l 3000',
      cwd: '/var/www/festify',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/frontend-err.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true
    }
  ]
};