# Guia de Despliegue AWS - Paso a Paso

Guia completa para desplegar **Facturacion-Grupo-CP** y **Administrador-de-Empresas** en AWS.

**Prerequisitos:**
- Cuenta de AWS activa
- Dominio propio (ej: `tuempresa.com`)
- Acceso a los repositorios Git de ambos proyectos
- AWS CLI instalado localmente (opcional pero recomendado)

---

## Paso 1: Configurar VPC y Networking

### 1.1 Crear VPC

1. Ir a **VPC** > **Create VPC**
2. Seleccionar **VPC and more** (crea subnets automaticamente)
3. Configurar:
   - Name: `omnni-vpc`
   - IPv4 CIDR: `10.0.0.0/16`
   - Number of AZs: `2`
   - Number of public subnets: `2`
   - Number of private subnets: `2`
   - NAT gateways: `None` (para reducir costos; las instancias en subnets publicas tienen acceso a internet)
   - VPC endpoints: `S3 Gateway` (acceso gratis a S3 desde la VPC)
4. Click **Create VPC**

> **Nota sobre NAT Gateway:** Un NAT Gateway cuesta ~$32/mes. Si RDS y ElastiCache estan en subnets privadas (sin acceso directo a internet), no necesitan NAT porque solo se comunican dentro de la VPC. Si en el futuro necesitas que recursos en subnets privadas accedan a internet, agrega un NAT Gateway.

### 1.2 Anotar los IDs creados

Guardar estos valores (los necesitaras despues):
- VPC ID: `vpc-xxxxxxxxx`
- Public Subnet 1 (AZ-a): `subnet-pub-1`
- Public Subnet 2 (AZ-b): `subnet-pub-2`
- Private Subnet 1 (AZ-a): `subnet-priv-1`
- Private Subnet 2 (AZ-b): `subnet-priv-2`

---

## Paso 2: Crear Security Groups

### 2.1 Security Group - ALB

1. **VPC** > **Security Groups** > **Create security group**
2. Configurar:
   - Name: `omnni-alb-sg`
   - VPC: `omnni-vpc`
   - Inbound rules:
     - HTTP (80) desde `0.0.0.0/0` (redirige a HTTPS)
     - HTTPS (443) desde `0.0.0.0/0`
   - Outbound: All traffic

### 2.2 Security Group - EC2

1. Crear security group:
   - Name: `omnni-ec2-sg`
   - VPC: `omnni-vpc`
   - Inbound rules:
     - SSH (22) desde **tu IP** (ej: `190.xxx.xxx.xxx/32`)
     - Custom TCP (8000) desde `omnni-alb-sg` (Facturacion)
     - Custom TCP (8001) desde `omnni-alb-sg` (Administrador)
     - Custom TCP (6001) desde `omnni-alb-sg` (Reverb Facturacion)
     - Custom TCP (6002) desde `omnni-alb-sg` (Reverb Admin)
   - Outbound: All traffic

### 2.3 Security Group - RDS

1. Crear security group:
   - Name: `omnni-rds-sg`
   - VPC: `omnni-vpc`
   - Inbound rules:
     - PostgreSQL (5432) desde `omnni-ec2-sg`
   - Outbound: All traffic

### 2.4 Security Group - ElastiCache

1. Crear security group:
   - Name: `omnni-redis-sg`
   - VPC: `omnni-vpc`
   - Inbound rules:
     - Custom TCP (6379) desde `omnni-ec2-sg`
   - Outbound: All traffic

---

## Paso 3: Crear RDS PostgreSQL

### 3.1 Crear Subnet Group

1. **RDS** > **Subnet groups** > **Create DB subnet group**
2. Configurar:
   - Name: `omnni-db-subnet-group`
   - VPC: `omnni-vpc`
   - Subnets: Seleccionar las 2 **private subnets**

### 3.2 Crear Instancia RDS

1. **RDS** > **Create database**
2. Configurar:
   - Engine: **PostgreSQL**
   - Engine version: **16.x** (la mas reciente estable)
   - Templates: **Free tier** (si aplica) o **Production**
   - DB instance identifier: `omnni-postgres`
   - Master username: `omnni_admin`
   - Master password: (generar una segura y guardarla)
   - Instance class: `db.t3.small`
   - Storage type: `gp3`
   - Allocated storage: `30 GB`
   - Storage autoscaling: **Enabled** (max 100 GB)
   - Multi-AZ: **No**
   - VPC: `omnni-vpc`
   - Subnet group: `omnni-db-subnet-group`
   - Public access: **No**
   - Security group: `omnni-rds-sg`
   - Database authentication: **Password authentication**
   - Initial database name: `facturacion_grupo_cp`
   - Backup retention: 7 days
   - Encryption: **Enabled**
   - Performance Insights: **Disabled** (para reducir costos)
   - Monitoring: Enhanced monitoring **Disabled**
3. Click **Create database**
4. Esperar ~10 minutos a que este disponible

### 3.3 Crear las Bases de Datos Adicionales

Una vez el RDS este disponible, conectarse desde el EC2 (que crearemos despues) o temporalmente habilitando public access:

```bash
# Conectarse al RDS (desde EC2)
psql -h omnni-postgres.xxxxx.us-east-1.rds.amazonaws.com -U omnni_admin -d facturacion_grupo_cp

# Crear las otras bases de datos
CREATE DATABASE administrador_de_empresas;
CREATE DATABASE zyscore;

# Crear usuarios especificos por aplicacion
CREATE USER facturacion_user WITH PASSWORD 'password_seguro_1';
CREATE USER admin_user WITH PASSWORD 'password_seguro_2';

# Permisos para facturacion_user
GRANT ALL PRIVILEGES ON DATABASE facturacion_grupo_cp TO facturacion_user;
GRANT CONNECT ON DATABASE zyscore TO facturacion_user;

# Permisos para admin_user
GRANT ALL PRIVILEGES ON DATABASE administrador_de_empresas TO admin_user;
GRANT CONNECT ON DATABASE facturacion_grupo_cp TO admin_user;
GRANT CONNECT ON DATABASE zyscore TO admin_user;

# Dar permisos de lectura en schemas (ejecutar dentro de cada DB)
\c facturacion_grupo_cp
GRANT USAGE ON SCHEMA public TO admin_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO admin_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO admin_user;

\c zyscore
GRANT USAGE ON SCHEMA public TO facturacion_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO facturacion_user;
GRANT USAGE ON SCHEMA public TO admin_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO admin_user;
```

### 3.4 Anotar el Endpoint RDS

Guardar el endpoint (lo necesitaras para los `.env`):
```
omnni-postgres.xxxxxxxxx.us-east-1.rds.amazonaws.com
```

---

## Paso 4: Crear ElastiCache Redis

### 4.1 Crear Subnet Group

1. **ElastiCache** > **Subnet groups** > **Create subnet group**
2. Configurar:
   - Name: `omnni-redis-subnet-group`
   - VPC: `omnni-vpc`
   - Subnets: Seleccionar las 2 **private subnets**

### 4.2 Crear Cluster Redis

1. **ElastiCache** > **Redis caches** > **Create Redis cache**
2. Configurar:
   - Choose a cluster creation method: **Design your own cache**
   - Cluster mode: **Disabled**
   - Name: `omnni-redis`
   - Engine version: **7.x**
   - Node type: `cache.t3.micro`
   - Number of replicas: **0** (sin replicas para reducir costos)
   - Subnet group: `omnni-redis-subnet-group`
   - Security group: `omnni-redis-sg`
   - Encryption in-transit: **Yes**
   - Encryption at-rest: **Yes**
   - Auto minor version upgrade: **Yes**
3. Click **Create**

### 4.3 Anotar el Endpoint Redis

```
omnni-redis.xxxxx.0001.use1.cache.amazonaws.com:6379
```

---

## Paso 5: Crear y Configurar EC2

### 5.1 Crear Key Pair

1. **EC2** > **Key Pairs** > **Create key pair**
2. Configurar:
   - Name: `omnni-key`
   - Type: RSA
   - Format: `.pem`
3. Descargar y guardar el archivo `.pem` de forma segura

### 5.2 Lanzar Instancia EC2

1. **EC2** > **Launch instance**
2. Configurar:
   - Name: `omnni-app-server`
   - AMI: **Ubuntu Server 24.04 LTS**
   - Instance type: `t3.large`
   - Key pair: `omnni-key`
   - VPC: `omnni-vpc`
   - Subnet: **Public Subnet 1**
   - Auto-assign public IP: **Enable**
   - Security group: `omnni-ec2-sg`
   - Storage: `30 GB gp3`
   - Credit specification: **Unlimited**
3. Click **Launch instance**

### 5.3 Asignar Elastic IP

1. **EC2** > **Elastic IPs** > **Allocate Elastic IP address**
2. Click **Allocate**
3. Seleccionar la IP > **Actions** > **Associate Elastic IP address**
4. Seleccionar la instancia `omnni-app-server`
5. Anotar la IP elastica: `xx.xx.xx.xx`

### 5.4 Conectarse al EC2

```bash
chmod 400 omnni-key.pem
ssh -i omnni-key.pem ubuntu@xx.xx.xx.xx
```

---

## Paso 6: Instalar Software en EC2

### 6.1 Actualizar Sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### 6.2 Instalar PHP 8.2 y Extensiones

```bash
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

sudo apt install -y php8.2 php8.2-fpm php8.2-cli php8.2-pgsql php8.2-mbstring \
  php8.2-xml php8.2-curl php8.2-zip php8.2-gd php8.2-bcmath php8.2-intl \
  php8.2-readline php8.2-redis php8.2-opcache php8.2-soap
```

### 6.3 Configurar PHP para Produccion

```bash
sudo nano /etc/php/8.2/fpm/php.ini
```

Cambiar estos valores:
```ini
memory_limit = 256M
upload_max_filesize = 20M
post_max_size = 25M
max_execution_time = 60
opcache.enable = 1
opcache.memory_consumption = 128
opcache.max_accelerated_files = 10000
opcache.validate_timestamps = 0
```

```bash
sudo nano /etc/php/8.2/fpm/pool.d/www.conf
```

Configurar el pool para rendimiento:
```ini
pm = dynamic
pm.max_children = 20
pm.start_servers = 5
pm.min_spare_servers = 3
pm.max_spare_servers = 10
```

```bash
sudo systemctl restart php8.2-fpm
```

### 6.4 Instalar Composer

```bash
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

### 6.5 Instalar Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 6.6 Instalar Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 6.7 Instalar Supervisor

```bash
sudo apt install -y supervisor
sudo systemctl enable supervisor
```

### 6.8 Instalar Redis CLI (para testing)

```bash
sudo apt install -y redis-tools
```

### 6.9 Verificar Instalaciones

```bash
php -v          # PHP 8.2.x
composer -V     # Composer 2.x
node -v         # v20.x
npm -v          # 10.x
nginx -v        # nginx/1.x
supervisord -v  # 4.x
```

---

## Paso 7: Clonar y Configurar Facturacion-Grupo-CP

### 7.1 Crear Directorio y Clonar

```bash
sudo mkdir -p /var/www
sudo chown ubuntu:ubuntu /var/www

cd /var/www
git clone https://github.com/TU_ORG/Facturacion-Grupo-CP.git facturacion
cd facturacion
```

### 7.2 Instalar Dependencias

```bash
composer install --no-dev --optimize-autoloader
npm install
npm run build
```

### 7.3 Configurar Entorno

```bash
cp .env.example .env
php artisan key:generate
nano .env
```

**Variables de entorno de produccion (`.env`):**

```env
APP_NAME="Facturacion Grupo CP"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://facturacion.tudominio.com

# Base de datos principal
DB_CONNECTION=pgsql
DB_HOST=omnni-postgres.xxxxxxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_DATABASE=facturacion_grupo_cp
DB_USERNAME=facturacion_user
DB_PASSWORD=password_seguro_1

# Cache y Sesiones con Redis
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

# Redis (ElastiCache)
REDIS_HOST=omnni-redis.xxxxx.0001.use1.cache.amazonaws.com
REDIS_PASSWORD=null
REDIS_PORT=6379
REDIS_DB=0
REDIS_CACHE_DB=1

# WebSocket Reverb
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=facturacion-prod
REVERB_APP_KEY=genera-clave-segura-32-caracteres
REVERB_APP_SECRET=genera-secret-seguro-32-caracteres
REVERB_HOST=facturacion.tudominio.com
REVERB_PORT=443
REVERB_SCHEME=https
REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=6001

# Vite Reverb (ya compilado en build, pero necesario si rebuild)
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"

# AWS S3
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=tu-access-key-id
AWS_SECRET_ACCESS_KEY=tu-secret-access-key
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=omnni-s3
AWS_URL=https://omnni-s3.s3.us-east-1.amazonaws.com
AWS_USE_PATH_STYLE_ENDPOINT=false

# Email (Resend)
MAIL_MAILER=resend
RESEND_API_KEY=re_xxxxxxxxx
MAIL_FROM_ADDRESS=info@tudominio.com
MAIL_FROM_NAME="Facturacion Grupo CP"

# DIAN Facturacion Electronica
ELECTRONIC_INVOICING_API_URL=https://vetlogy.apifacturacionelectronica.xyz/api/ubl2.1
ELECTRONIC_INVOICING_MOCK=false

# Sanctum
SANCTUM_STATEFUL_DOMAINS=facturacion.tudominio.com

# Logging
LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=warning

# Octane (si usas RoadRunner)
OCTANE_SERVER=roadrunner
OCTANE_HTTPS=false
```

### 7.4 Ejecutar Migraciones y Seeders

```bash
php artisan migrate --force
php artisan db:seed --force
```

### 7.5 Permisos de Storage

```bash
sudo chown -R ubuntu:www-data /var/www/facturacion/storage
sudo chown -R ubuntu:www-data /var/www/facturacion/bootstrap/cache
chmod -R 775 /var/www/facturacion/storage
chmod -R 775 /var/www/facturacion/bootstrap/cache
php artisan storage:link
```

### 7.6 Optimizar para Produccion

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

---

## Paso 8: Clonar y Configurar Administrador-de-Empresas

### 8.1 Clonar

```bash
cd /var/www
git clone https://github.com/TU_ORG/Administrador-de-Empresas.git administrador
cd administrador
```

### 8.2 Instalar Dependencias

```bash
composer install --no-dev --optimize-autoloader
npm install
npm run build
```

### 8.3 Configurar Entorno

```bash
cp .env.example .env
php artisan key:generate
nano .env
```

**Variables de entorno de produccion (`.env`):**

```env
APP_NAME="Administrador de Empresas"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://admin.tudominio.com

# Base de datos principal (Administrador)
DB_CONNECTION=pgsql
DB_HOST=omnni-postgres.xxxxxxxxx.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_DATABASE=administrador_de_empresas
DB_USERNAME=admin_user
DB_PASSWORD=password_seguro_2

# Base de datos Omnni (Facturacion) - LECTURA
DB_OMNNI_DRIVER=pgsql
DB_OMNNI_HOST=omnni-postgres.xxxxxxxxx.us-east-1.rds.amazonaws.com
DB_OMNNI_PORT=5432
DB_OMNNI_DATABASE=facturacion_grupo_cp
DB_OMNNI_USERNAME=admin_user
DB_OMNNI_PASSWORD=password_seguro_2

# Base de datos Zyscore - LECTURA
DB_ZYSCORE_HOST=omnni-postgres.xxxxxxxxx.us-east-1.rds.amazonaws.com
DB_ZYSCORE_PORT=5432
DB_ZYSCORE_DATABASE=zyscore
DB_ZYSCORE_USERNAME=admin_user
DB_ZYSCORE_PASSWORD=password_seguro_2

# Cache y Sesiones con Redis
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis

# Redis (ElastiCache) - usar DBs diferentes para no colisionar con Facturacion
REDIS_HOST=omnni-redis.xxxxx.0001.use1.cache.amazonaws.com
REDIS_PASSWORD=null
REDIS_PORT=6379
REDIS_DB=2
REDIS_CACHE_DB=3

# WebSocket Reverb (soporte en tiempo real)
BROADCAST_CONNECTION=reverb
REVERB_APP_ID=admin-prod
REVERB_APP_KEY=genera-otra-clave-segura-32chars
REVERB_APP_SECRET=genera-otro-secret-seguro-32chars
REVERB_HOST=admin.tudominio.com
REVERB_PORT=443
REVERB_SCHEME=https
REVERB_SERVER_HOST=0.0.0.0
REVERB_SERVER_PORT=6002

# Vite Reverb
VITE_REVERB_APP_KEY="${REVERB_APP_KEY}"
VITE_REVERB_HOST="${REVERB_HOST}"
VITE_REVERB_PORT="${REVERB_PORT}"
VITE_REVERB_SCHEME="${REVERB_SCHEME}"

# AWS S3 (compartido)
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=tu-access-key-id
AWS_SECRET_ACCESS_KEY=tu-secret-access-key
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=omnni-s3
AWS_URL=https://omnni-s3.s3.us-east-1.amazonaws.com

# Email
MAIL_MAILER=resend
RESEND_API_KEY=re_xxxxxxxxx
MAIL_FROM_ADDRESS=admin@tudominio.com
MAIL_FROM_NAME="Administrador de Empresas"

# Sanctum
SANCTUM_STATEFUL_DOMAINS=admin.tudominio.com

# Logging
LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=warning

# Hashing
BCRYPT_ROUNDS=12
```

> **IMPORTANTE:** Notar que Redis usa DB 2 y 3 para Administrador (DB 0 y 1 son de Facturacion). Esto evita colision de cache/sesiones entre ambas aplicaciones.

### 8.4 Migraciones y Permisos

```bash
php artisan migrate --force
php artisan db:seed --force

sudo chown -R ubuntu:www-data /var/www/administrador/storage
sudo chown -R ubuntu:www-data /var/www/administrador/bootstrap/cache
chmod -R 775 /var/www/administrador/storage
chmod -R 775 /var/www/administrador/bootstrap/cache
php artisan storage:link
```

### 8.5 Optimizar

```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
```

---

## Paso 9: Configurar Nginx

### 9.1 Facturacion (con Octane/RoadRunner)

```bash
sudo nano /etc/nginx/sites-available/facturacion
```

```nginx
server {
    listen 8000;
    server_name facturacion.tudominio.com;
    root /var/www/facturacion/public;

    index index.php;
    charset utf-8;

    # Archivos estaticos
    location /build/ {
        alias /var/www/facturacion/public/build/;
        expires 1y;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    location /storage/ {
        alias /var/www/facturacion/storage/app/public/;
        expires 1y;
        access_log off;
    }

    # WebSocket Reverb
    location /app {
        proxy_pass http://127.0.0.1:6001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # Proxy a Octane/RoadRunner
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_buffering off;
    }
}
```

> **Nota:** Si NO usas Octane/RoadRunner, reemplaza el bloque `location /` con la configuracion PHP-FPM estandar (ver seccion 9.2 como referencia).

### 9.2 Administrador (con PHP-FPM)

```bash
sudo nano /etc/nginx/sites-available/administrador
```

```nginx
server {
    listen 8001;
    server_name admin.tudominio.com;
    root /var/www/administrador/public;

    index index.php;
    charset utf-8;

    # Archivos estaticos
    location /build/ {
        alias /var/www/administrador/public/build/;
        expires 1y;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    location /storage/ {
        alias /var/www/administrador/storage/app/public/;
        expires 1y;
        access_log off;
    }

    # WebSocket Reverb
    location /app {
        proxy_pass http://127.0.0.1:6002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }

    # PHP-FPM
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.(?!well-known) {
        deny all;
    }
}
```

### 9.3 Habilitar Sites

```bash
sudo ln -s /etc/nginx/sites-available/facturacion /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/administrador /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Verificar configuracion
sudo nginx -t

# Reiniciar
sudo systemctl restart nginx
```

---

## Paso 10: Configurar Supervisor

### 10.1 Reverb WebSocket - Facturacion

```bash
sudo nano /etc/supervisor/conf.d/facturacion-reverb.conf
```

```ini
[program:facturacion-reverb]
process_name=%(program_name)s
command=php /var/www/facturacion/artisan reverb:start
autostart=true
autorestart=true
user=ubuntu
redirect_stderr=true
stdout_logfile=/var/www/facturacion/storage/logs/reverb.log
stopwaitsecs=3600
```

### 10.2 Reverb WebSocket - Administrador

```bash
sudo nano /etc/supervisor/conf.d/admin-reverb.conf
```

```ini
[program:admin-reverb]
process_name=%(program_name)s
command=php /var/www/administrador/artisan reverb:start
autostart=true
autorestart=true
user=ubuntu
redirect_stderr=true
stdout_logfile=/var/www/administrador/storage/logs/reverb.log
stopwaitsecs=3600
```

### 10.3 Queue Worker - Facturacion

```bash
sudo nano /etc/supervisor/conf.d/facturacion-worker.conf
```

```ini
[program:facturacion-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/facturacion/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=ubuntu
numprocs=2
redirect_stderr=true
stdout_logfile=/var/www/facturacion/storage/logs/worker.log
stopwaitsecs=3600
```

### 10.4 Queue Worker - Administrador

```bash
sudo nano /etc/supervisor/conf.d/admin-worker.conf
```

```ini
[program:admin-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /var/www/administrador/artisan queue:work redis --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=ubuntu
numprocs=1
redirect_stderr=true
stdout_logfile=/var/www/administrador/storage/logs/worker.log
stopwaitsecs=3600
```

### 10.5 Octane RoadRunner - Facturacion (si usas Octane)

```bash
sudo nano /etc/supervisor/conf.d/facturacion-octane.conf
```

```ini
[program:facturacion-octane]
process_name=%(program_name)s
command=php /var/www/facturacion/artisan octane:start --server=roadrunner --host=127.0.0.1 --port=8080 --workers=4
autostart=true
autorestart=true
user=ubuntu
redirect_stderr=true
stdout_logfile=/var/www/facturacion/storage/logs/octane.log
stopwaitsecs=3600
```

### 10.6 Iniciar Supervisor

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start all

# Verificar estado
sudo supervisorctl status
```

Deberia mostrar algo como:
```
admin-reverb                     RUNNING   pid 12345, uptime 0:00:05
admin-worker:admin-worker_00     RUNNING   pid 12346, uptime 0:00:05
facturacion-octane               RUNNING   pid 12347, uptime 0:00:05
facturacion-reverb               RUNNING   pid 12348, uptime 0:00:05
facturacion-worker:facturacion-worker_00   RUNNING   pid 12349, uptime 0:00:05
facturacion-worker:facturacion-worker_01   RUNNING   pid 12350, uptime 0:00:05
```

---

## Paso 11: Configurar Cron (Laravel Scheduler)

```bash
sudo crontab -u ubuntu -e
```

Agregar estas lineas:

```cron
* * * * * cd /var/www/facturacion && php artisan schedule:run >> /dev/null 2>&1
* * * * * cd /var/www/administrador && php artisan schedule:run >> /dev/null 2>&1
```

Esto ejecuta el scheduler de Laravel cada minuto para ambas aplicaciones. Internamente, cada app define sus propios horarios (alertas horarias/diarias/semanales, retry de emails, etc.).

---

## Paso 12: Configurar SSL con ACM

### 12.1 Solicitar Certificado

1. **ACM** > **Request a certificate**
2. Tipo: **Public certificate**
3. Domain names:
   - `facturacion.tudominio.com`
   - `admin.tudominio.com`
   - (o usar wildcard `*.tudominio.com`)
4. Validation method: **DNS validation**
5. Click **Request**

### 12.2 Validar con DNS

1. En la solicitud del certificado, copiar los registros CNAME de validacion
2. Ir a **Route 53** (o tu proveedor DNS) y crear los registros CNAME
3. Esperar ~5-30 minutos a que se valide automaticamente

---

## Paso 13: Crear Application Load Balancer (ALB)

### 13.1 Crear Target Groups

**Target Group - Facturacion:**
1. **EC2** > **Target Groups** > **Create target group**
2. Configurar:
   - Type: **Instances**
   - Name: `tg-facturacion`
   - Protocol: HTTP, Port: **8000**
   - VPC: `omnni-vpc`
   - Health check path: `/`
   - Health check port: **8000**
3. Registrar la instancia EC2

**Target Group - Administrador:**
1. Repetir con:
   - Name: `tg-administrador`
   - Port: **8001**
   - Health check port: **8001**
2. Registrar la instancia EC2

### 13.2 Crear ALB

1. **EC2** > **Load Balancers** > **Create Load Balancer** > **Application Load Balancer**
2. Configurar:
   - Name: `omnni-alb`
   - Scheme: **Internet-facing**
   - IP address type: **IPv4**
   - VPC: `omnni-vpc`
   - Mappings: Seleccionar las 2 **public subnets**
   - Security group: `omnni-alb-sg`

### 13.3 Configurar Listeners

**Listener HTTP:80** (redirect a HTTPS):
1. Protocol: HTTP, Port: 80
2. Default action: **Redirect to HTTPS** port 443, status 301

**Listener HTTPS:443:**
1. Protocol: HTTPS, Port: 443
2. SSL Certificate: Seleccionar el certificado ACM creado
3. Default action: **Forward to** `tg-facturacion` (o una pagina 404 fija)
4. Agregar reglas:
   - **Regla 1:** IF Host header = `facturacion.tudominio.com` THEN Forward to `tg-facturacion`
   - **Regla 2:** IF Host header = `admin.tudominio.com` THEN Forward to `tg-administrador`

### 13.4 Habilitar Sticky Sessions (importante para WebSocket)

Para cada Target Group:
1. Ir al Target Group > **Attributes** > **Edit**
2. **Stickiness**: Enable
3. **Stickiness type**: Application-based cookie
4. **Cookie name**: `laravel_session`
5. **Stickiness duration**: 1 day

---

## Paso 14: Configurar Route 53 (DNS)

### 14.1 Crear Hosted Zone (si no existe)

1. **Route 53** > **Hosted zones** > **Create hosted zone**
2. Domain name: `tudominio.com`
3. Type: **Public hosted zone**

> Si tu dominio esta registrado en otro proveedor, actualiza los nameservers del dominio para que apunten a los NS records de Route 53.

### 14.2 Crear Records

**Record - Facturacion:**
1. Click **Create record**
2. Record name: `facturacion`
3. Record type: **A**
4. Alias: **Yes**
5. Route traffic to: **Alias to Application Load Balancer** > Region `us-east-1` > Seleccionar `omnni-alb`
6. Click **Create records**

**Record - Administrador:**
1. Repetir con record name: `admin`
2. Mismo ALB como destino

---

## Paso 15: Configurar S3 y CloudFront

### 15.1 S3 Bucket

Si el bucket `omnni-s3` no existe aun, seguir la guia existente en `docs/s3-setup.md`.

Si ya existe, verificar:
- Region: `us-east-1`
- Block Public Access: **Deshabilitado**
- Bucket Policy: La politica de lectura publica esta configurada

### 15.2 Crear Usuario IAM para S3

1. **IAM** > **Users** > **Create user**
2. Name: `omnni-s3-user`
3. Attach policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::omnni-s3",
                "arn:aws:s3:::omnni-s3/*"
            ]
        }
    ]
}
```

4. Crear Access Key y guardar credenciales

### 15.3 CloudFront (Opcional)

1. **CloudFront** > **Create distribution**
2. Origin domain: `omnni-s3.s3.us-east-1.amazonaws.com`
3. Origin access: **Public** (el bucket ya es publico)
4. Viewer protocol policy: **Redirect HTTP to HTTPS**
5. Allowed HTTP methods: **GET, HEAD**
6. Cache policy: **CachingOptimized**
7. Price class: **Use North America, Europe, Asia, Middle East, and Africa**
8. Alternate domain name: `cdn.tudominio.com` (opcional)
9. Custom SSL certificate: Seleccionar certificado ACM (debe estar en `us-east-1`)
10. Default root object: (dejar vacio)
11. Click **Create distribution**

Si usas CloudFront, actualizar `AWS_URL` en ambos `.env`:
```env
AWS_URL=https://cdn.tudominio.com
```

---

## Paso 16: Verificacion Final

### 16.1 Verificar Servicios

```bash
# En el EC2, verificar que todo esta corriendo
sudo supervisorctl status
sudo systemctl status nginx
sudo systemctl status php8.2-fpm

# Verificar conexion a RDS
psql -h omnni-postgres.xxxxx.rds.amazonaws.com -U facturacion_user -d facturacion_grupo_cp -c "SELECT 1;"

# Verificar conexion a Redis
redis-cli -h omnni-redis.xxxxx.cache.amazonaws.com ping
```

### 16.2 Verificar Aplicaciones

```bash
# Health check local
curl http://localhost:8000   # Deberia responder HTML de Facturacion
curl http://localhost:8001   # Deberia responder HTML de Administrador

# Health check externo (desde tu PC)
curl https://facturacion.tudominio.com
curl https://admin.tudominio.com
```

### 16.3 Checklist Final

- [ ] EC2 corriendo con Elastic IP
- [ ] RDS accesible desde EC2 (3 databases creadas)
- [ ] Redis accesible desde EC2
- [ ] Nginx sirviendo ambas apps en puertos 8000 y 8001
- [ ] Supervisor: Octane, Reverb x2, Workers x3 corriendo
- [ ] ALB recibiendo trafico HTTPS y enrutando a target groups
- [ ] DNS apuntando `facturacion.tudominio.com` y `admin.tudominio.com` al ALB
- [ ] SSL activo (candado verde en el navegador)
- [ ] S3 subiendo y sirviendo archivos correctamente
- [ ] Cron ejecutando schedulers de ambas apps
- [ ] Login funciona en ambas aplicaciones
- [ ] Chat/WebSocket funciona en Facturacion
- [ ] Soporte en tiempo real funciona en Administrador

---

## Troubleshooting

### Error 502 Bad Gateway
- Verificar que Octane/PHP-FPM esta corriendo: `sudo supervisorctl status`
- Verificar logs: `tail -f /var/www/facturacion/storage/logs/laravel.log`
- Verificar que Nginx apunta al puerto correcto

### Error de conexion a base de datos
- Verificar Security Group de RDS permite conexion desde EC2
- Verificar credenciales en `.env`
- Probar conexion manual: `psql -h ENDPOINT -U USER -d DB`

### WebSocket no conecta
- Verificar que Reverb esta corriendo: `sudo supervisorctl status facturacion-reverb`
- Verificar logs de Reverb: `tail -f /var/www/facturacion/storage/logs/reverb.log`
- Verificar que ALB permite WebSocket (sticky sessions habilitado)
- Verificar que las variables `VITE_REVERB_*` estaban en `.env` ANTES de `npm run build`

### Redis no conecta
- Verificar Security Group de ElastiCache
- Probar desde EC2: `redis-cli -h ENDPOINT ping`
- Si falla, verificar que el ElastiCache esta en la misma VPC

### Migraciones fallan
- Verificar que el usuario de DB tiene permisos suficientes
- Ejecutar migration status: `php artisan migrate:status`
- Ver el error especifico en los logs

### Assets no cargan (CSS/JS)
- Verificar que se hizo `npm run build` en produccion
- Verificar que el manifest existe: `ls public/build/manifest.json`
- Verificar `APP_URL` en `.env`

### Permisos de archivos
```bash
# Resetear permisos si hay problemas
sudo chown -R ubuntu:www-data /var/www/facturacion/storage
sudo chown -R ubuntu:www-data /var/www/facturacion/bootstrap/cache
chmod -R 775 /var/www/facturacion/storage
chmod -R 775 /var/www/facturacion/bootstrap/cache
```

---

## Actualizaciones y Deploys Futuros

### Script de deploy para Facturacion

```bash
#!/bin/bash
# deploy-facturacion.sh

cd /var/www/facturacion

# Bajar cambios
git pull origin main

# Instalar dependencias
composer install --no-dev --optimize-autoloader
npm install
npm run build

# Migraciones
php artisan migrate --force

# Limpiar y recachear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Reiniciar servicios
sudo supervisorctl restart facturacion-octane
sudo supervisorctl restart facturacion-reverb
sudo supervisorctl restart facturacion-worker:*

echo "Deploy de Facturacion completado!"
```

### Script de deploy para Administrador

```bash
#!/bin/bash
# deploy-administrador.sh

cd /var/www/administrador

# Bajar cambios
git pull origin main

# Instalar dependencias
composer install --no-dev --optimize-autoloader
npm install
npm run build

# Migraciones
php artisan migrate --force

# Limpiar y recachear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# Reiniciar servicios
sudo supervisorctl restart admin-reverb
sudo supervisorctl restart admin-worker:*
sudo systemctl restart php8.2-fpm

echo "Deploy de Administrador completado!"
```

### Hacer los scripts ejecutables

```bash
chmod +x /var/www/facturacion/deploy-facturacion.sh
chmod +x /var/www/administrador/deploy-administrador.sh
```

---

## Seguridad Adicional

### Firewall del EC2 (UFW)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 8000/tcp    # Facturacion (desde ALB)
sudo ufw allow 8001/tcp    # Administrador (desde ALB)
sudo ufw allow 6001/tcp    # Reverb Facturacion (desde ALB)
sudo ufw allow 6002/tcp    # Reverb Admin (desde ALB)
sudo ufw enable
```

> Nota: Los Security Groups de AWS ya hacen el filtrado. UFW es una capa adicional de seguridad dentro del EC2.

### Fail2Ban (proteccion SSH)

```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
```

### Actualizaciones automaticas de seguridad

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```
