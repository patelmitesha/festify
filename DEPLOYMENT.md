# 🚀 Festify Production Deployment Guide

## Quick Start

```bash
# Make deployment script executable
chmod +x deploy.sh

# Deploy with Docker (Recommended)
./deploy.sh docker

# Or deploy traditionally
./deploy.sh traditional
```

## 📋 Prerequisites

### System Requirements
- **CPU**: 2+ cores
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 20GB available space
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+

### Software Requirements
- **Node.js**: 16+ LTS
- **MySQL**: 8.0+
- **Git**: Latest version
- **Domain**: Optional but recommended for SSL

## 🌐 Deployment Options

### Option 1: Docker Deployment (Recommended)

#### Advantages
✅ Containerized environment
✅ Easy scaling
✅ Consistent across environments
✅ Automated dependency management

#### Prerequisites
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Add user to docker group
sudo usermod -aG docker $USER
```

#### Deployment Steps

1. **Clone and Setup**
```bash
git clone https://github.com/patelmitesha/festify.git
cd festify
```

2. **Configure Environment**
```bash
# Copy and edit production environment
cp .env.production .env
nano .env.production
```

Required environment variables:
```env
MYSQL_ROOT_PASSWORD=secure_root_password_here
MYSQL_PASSWORD=secure_festify_password_here
JWT_SECRET=your_very_secure_jwt_secret_key_here_minimum_32_characters
FRONTEND_URL=https://yourdomain.com
```

3. **Deploy**
```bash
./deploy.sh docker
```

4. **Verify Deployment**
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Access application
curl http://localhost
```

#### Docker Commands Reference
```bash
# Stop services
docker-compose down

# Restart services
docker-compose restart

# Update application
git pull
docker-compose build --no-cache
docker-compose up -d

# Backup database
docker-compose exec database mysqldump -u root -p festify > backup.sql

# View container logs
docker-compose logs [service_name]
```

### Option 2: Traditional Server Deployment

#### Advantages
✅ Direct control over services
✅ Better for debugging
✅ Lower resource usage

#### Prerequisites
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt install mysql-server -y
sudo mysql_secure_installation

# Install PM2
sudo npm install -g pm2

# Install Nginx (optional)
sudo apt install nginx -y
```

#### Database Setup
```bash
# Connect to MySQL
sudo mysql -u root -p

# Create database and user
CREATE DATABASE festify;
CREATE USER 'festify_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON festify.* TO 'festify_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### Deployment Steps

1. **Clone Repository**
```bash
cd /var/www
sudo git clone https://github.com/patelmitesha/festify.git
sudo chown -R $USER:$USER festify
cd festify
```

2. **Configure Environment**

Create `backend/.env`:
```env
PORT=5000
NODE_ENV=production

DB_HOST=localhost
DB_PORT=3306
DB_USER=festify_user
DB_PASSWORD=your_secure_password
DB_NAME=festify

JWT_SECRET=your_very_secure_jwt_secret_key_here_min_32_chars
JWT_EXPIRES_IN=7d

FRONTEND_URL=https://yourdomain.com
```

Create `frontend/.env`:
```env
REACT_APP_API_URL=https://yourdomain.com/api
```

3. **Setup Database**
```bash
mysql -u festify_user -p festify < database/schema.sql
mysql -u festify_user -p festify < database/schema_update.sql
```

4. **Deploy**
```bash
./deploy.sh traditional
```

5. **Setup Nginx (Optional)**
```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/festify
sudo ln -s /etc/nginx/sites-available/festify /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

#### PM2 Commands Reference
```bash
# Check status
pm2 status

# View logs
pm2 logs

# Restart applications
pm2 restart ecosystem.config.js

# Stop applications
pm2 stop ecosystem.config.js

# Monitor resources
pm2 monit

# Startup on boot
pm2 startup
pm2 save
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
# Server Configuration
PORT=5000
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=festify_user
DB_PASSWORD=your_secure_password
DB_NAME=festify

# Authentication
JWT_SECRET=your_very_secure_jwt_secret_key_here_minimum_32_characters
JWT_EXPIRES_IN=7d

# Frontend URL
FRONTEND_URL=https://yourdomain.com
```

#### Frontend (.env)
```env
REACT_APP_API_URL=https://yourdomain.com/api
```

### Security Recommendations

1. **Use Strong Passwords**
   - MySQL root password: 16+ characters
   - Database user password: 16+ characters
   - JWT secret: 32+ characters

2. **Firewall Configuration**
```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw status
```

3. **SSL Certificate**
```bash
# Using Let's Encrypt
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

4. **Regular Updates**
```bash
# System updates
sudo apt update && sudo apt upgrade -y

# Application updates
cd /var/www/festify
git pull
npm run build:frontend
npm run build:backend
pm2 restart ecosystem.config.js
```

## 📊 Monitoring & Maintenance

### Log Locations

#### Docker Deployment
```bash
# Application logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Database logs
docker-compose logs -f database
```

#### Traditional Deployment
```bash
# PM2 logs
pm2 logs

# Application logs
tail -f /var/www/festify/logs/backend-combined.log
tail -f /var/www/festify/logs/frontend-combined.log

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Performance Monitoring

#### PM2 Monitoring
```bash
# Real-time monitoring
pm2 monit

# Memory and CPU usage
pm2 show festify-backend
pm2 show festify-frontend
```

#### Docker Monitoring
```bash
# Container stats
docker stats

# Container resource usage
docker-compose exec backend top
```

### Database Backup

#### Manual Backup
```bash
# Docker deployment
docker-compose exec database mysqldump -u root -p festify > backup_$(date +%Y%m%d_%H%M%S).sql

# Traditional deployment
mysqldump -u festify_user -p festify > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Automated Backup Script
```bash
#!/bin/bash
# Save as backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/festify"
mkdir -p $BACKUP_DIR

# Create backup
mysqldump -u festify_user -p festify > $BACKUP_DIR/festify_$DATE.sql

# Keep only last 7 backups
find $BACKUP_DIR -name "festify_*.sql" -mtime +7 -delete

echo "Backup completed: festify_$DATE.sql"
```

```bash
# Make executable and add to crontab
chmod +x backup.sh
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

## 🚨 Troubleshooting

### Common Issues

#### Database Connection Error
```bash
# Check MySQL status
sudo systemctl status mysql

# Check database user permissions
mysql -u festify_user -p -e "SHOW GRANTS;"

# Reset database password
mysql -u root -p
ALTER USER 'festify_user'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
```

#### Port Already in Use
```bash
# Check what's using port 5000
sudo lsof -i :5000

# Kill process
sudo kill -9 <PID>

# Or change port in backend/.env
PORT=5001
```

#### Frontend Build Errors
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf frontend/node_modules
cd frontend && npm install

# Check Node.js version
node --version  # Should be 16+
```

#### SSL Certificate Issues
```bash
# Renew certificate
sudo certbot renew

# Test renewal
sudo certbot renew --dry-run

# Check certificate status
sudo certbot certificates
```

### Health Checks

#### Application Health
```bash
# Backend health
curl http://localhost:5000/api/health

# Frontend health
curl http://localhost:3000
```

#### Database Health
```bash
# MySQL status
sudo systemctl status mysql

# Connection test
mysql -u festify_user -p -e "SELECT 1;"
```

## 📈 Scaling

### Horizontal Scaling

#### Load Balancer Setup
```nginx
upstream backend {
    server 127.0.0.1:5000;
    server 127.0.0.1:5001;
    server 127.0.0.1:5002;
}

server {
    location /api {
        proxy_pass http://backend;
    }
}
```

#### Multiple Backend Instances
```bash
# PM2 cluster mode
pm2 start ecosystem.config.js --env production
pm2 scale festify-backend 3
```

### Database Optimization

#### MySQL Configuration
```bash
# Edit MySQL config
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# Add optimizations
[mysqld]
innodb_buffer_pool_size = 2G
innodb_log_file_size = 512M
max_connections = 200
query_cache_size = 64M
```

## 🆘 Support

### Getting Help
- **GitHub Issues**: [Create an issue](https://github.com/patelmitesha/festify/issues)
- **Documentation**: Check README.md for API documentation
- **Logs**: Always include relevant logs when reporting issues

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

**🎉 Congratulations! Your Festify application is now deployed in production!**

For additional support or questions, please refer to the project documentation or create an issue on GitHub.