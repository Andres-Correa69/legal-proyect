# Especificaciones de Infraestructura AWS - Calculadora de Costos

## Arquitectura General

```
                      [Route 53 - DNS]
                            |
                      [ACM - SSL Free]
                            |
                [ALB - Application Load Balancer]
                      /           \
          [facturacion.dom]   [admin.dom]
                      \           /
                [EC2 t3.large - Apps Server]
                ├── Nginx (reverse proxy)
                ├── Facturacion-Grupo-CP (Laravel Octane/RoadRunner)
                ├── Administrador-de-Empresas (PHP-FPM)
                ├── Reverb WebSocket x2 (Supervisor)
                └── Queue Workers x2 (Supervisor)
                            |
          [RDS PostgreSQL db.t3.small - Single Instance]
          ├── DB: facturacion_grupo_cp
          ├── DB: administrador_de_empresas
          └── DB: zyscore
                            |
                [ElastiCache Redis t3.micro]
                └── cache, sessions, queues
                            |
                      [S3 - omnni-s3]
                      └── logos, products, docs
                            |
                  [CloudFront CDN] (opcional)
                  └── assets estaticos S3
```

---

## Servicios AWS - Especificaciones Detalladas

### 1. Amazon EC2 (Compute)

| Parametro | Valor |
|-----------|-------|
| **Tipo de instancia** | `t3.large` |
| **vCPUs** | 2 | 
| **RAM** | 8 GB |
| **Tipo de creditos CPU** | Unlimited (burstable) |
| **Sistema operativo** | Ubuntu Server 24.04 LTS |
| **Almacenamiento (EBS)** | gp3, 30 GB |
| **IOPS EBS** | 3,000 (default gp3) |
| **Throughput EBS** | 125 MB/s (default gp3) |
| **Elastic IP** | 1 (asociada a la instancia) |
| **Region** | `us-east-1` (N. Virginia) |
| **Tenancy** | Shared |

**Justificacion:** Con 200-500+ usuarios concurrentes, 2 apps Laravel (una con Octane/RoadRunner), 2 procesos Reverb WebSocket y queue workers, 8GB RAM es necesario. t3.large ofrece burstable performance con baseline de 30% CPU sostenido.

**Software que corre en el EC2:**
- Nginx (reverse proxy para ambas apps)
- PHP 8.2 con extensiones (pgsql, redis, mbstring, xml, gd, zip, bcmath, intl)
- Composer 2.x
- Node.js 20 LTS + npm
- Supervisor (gestionar procesos Reverb y queue workers)
- Facturacion: Laravel Octane con RoadRunner
- Administrador: PHP-FPM 8.2

#### Costos EC2

| Modelo de pago | Costo/hora | Costo/mes (730h) |
|----------------|------------|-------------------|
| **On-Demand** | $0.0832 | **~$60.74** |
| **Reserved 1 ano (sin pago anticipado)** | $0.0525 | **~$38.33** |
| **Reserved 1 ano (pago total anticipado)** | $0.0490 | **~$35.77** ($429 anual) |
| **Reserved 3 anos (pago total anticipado)** | $0.0310 | **~$22.63** ($815 total) |

**EBS (30 GB gp3):** ~$2.40/mes

---

### 2. Amazon RDS (Base de Datos PostgreSQL)

| Parametro | Valor |
|-----------|-------|
| **Motor** | PostgreSQL 16 |
| **Tipo de instancia** | `db.t3.small` |
| **vCPUs** | 2 |
| **RAM** | 2 GB |
| **Almacenamiento** | gp3, 30 GB (escalable hasta 100 GB) |
| **IOPS** | 3,000 (default gp3) |
| **Multi-AZ** | No (single AZ para costos bajos) |
| **Backup automatico** | Si, retencion 7 dias |
| **Backup window** | 03:00-04:00 UTC |
| **Maintenance window** | Dom 04:00-05:00 UTC |
| **Encryption** | Si (AES-256) |
| **Public access** | No (solo acceso desde VPC) |
| **Region** | `us-east-1` |

**Bases de datos en esta instancia:**

| Database | Proyecto | Uso |
|----------|----------|-----|
| `facturacion_grupo_cp` | Facturacion-Grupo-CP | DB principal de facturacion |
| `administrador_de_empresas` | Administrador-de-Empresas | DB principal del admin |
| `zyscore` | Zyscore | DB de datos empresariales |

**Usuarios PostgreSQL recomendados:**
- `facturacion_user` - acceso FULL a `facturacion_grupo_cp`, acceso READ a `zyscore`
- `admin_user` - acceso FULL a `administrador_de_empresas`, acceso READ a `facturacion_grupo_cp` y `zyscore`

#### Costos RDS

| Modelo de pago | Costo/hora | Costo/mes |
|----------------|------------|-----------|
| **On-Demand** | $0.036 | **~$26.28** |
| **Reserved 1 ano (sin pago anticipado)** | $0.023 | **~$16.79** |
| **Reserved 1 ano (pago total anticipado)** | $0.021 | **~$15.33** ($184 anual) |

**Almacenamiento gp3 (30 GB):** ~$3.45/mes
**Backup (estimado 10 GB adicionales):** ~$0.95/mes

---

### 3. Amazon ElastiCache (Redis)

| Parametro | Valor |
|-----------|-------|
| **Motor** | Redis 7.x |
| **Tipo de nodo** | `cache.t3.micro` |
| **vCPUs** | 2 |
| **RAM** | 0.5 GB |
| **Nodos** | 1 (sin cluster) |
| **Multi-AZ** | No |
| **Encryption in-transit** | Si |
| **Encryption at-rest** | Si |
| **Subnet group** | Private subnets |
| **Region** | `us-east-1` |

**Uso:**
- Cache de aplicacion (ambos proyectos)
- Sesiones de usuario (ambos proyectos)
- Cola de trabajos/queue (ambos proyectos)
- Broadcasting/WebSocket scaling (Reverb)

#### Costos ElastiCache

| Modelo de pago | Costo/hora | Costo/mes |
|----------------|------------|-----------|
| **On-Demand** | $0.017 | **~$12.41** |
| **Reserved 1 ano** | $0.011 | **~$8.03** |

---

### 4. Application Load Balancer (ALB)

| Parametro | Valor |
|-----------|-------|
| **Tipo** | Application Load Balancer |
| **Esquema** | Internet-facing |
| **Listeners** | HTTPS:443 (con certificado ACM) |
| **Target Groups** | 2 (uno por app) |
| **Health checks** | HTTP GET / cada 30s |
| **Region** | `us-east-1` |

**Reglas de enrutamiento:**
- `facturacion.tudominio.com` → Target Group Facturacion (puerto 8000)
- `admin.tudominio.com` → Target Group Administrador (puerto 8001)
- `facturacion.tudominio.com/app/*` → WebSocket proxy Reverb Facturacion (puerto 6001)
- `admin.tudominio.com/app/*` → WebSocket proxy Reverb Admin (puerto 6002)

#### Costos ALB

| Concepto | Costo/mes |
|----------|-----------|
| **Cargo fijo ALB** | **$16.43** |
| **LCU estimadas (200-500 usuarios)** | **~$5-8** |
| **Total estimado** | **~$22-24/mes** |

*LCU (Load Balancer Capacity Units): basado en nuevas conexiones, conexiones activas, bytes procesados y reglas evaluadas.*

---

### 5. Amazon S3 (Almacenamiento)

| Parametro | Valor |
|-----------|-------|
| **Bucket** | `omnni-s3` |
| **Clase de almacenamiento** | S3 Standard |
| **Region** | `us-east-1` |
| **Versionamiento** | Deshabilitado |
| **Acceso publico** | Habilitado (lectura publica via bucket policy) |
| **Cifrado** | SSE-S3 (server-side encryption) |
| **Lifecycle rules** | Ninguna (archivos permanentes) |

**Estructura de carpetas:**
```
omnni-s3/
  {company-slug}/
    logos/          → Logos de empresa
    logos/icon/     → Iconos de empresa
    products/       → Imagenes de productos
    clients/        → Fotos de clientes (futuro)
```

**Estimacion de uso:**
- Almacenamiento: ~10-50 GB (imagenes de productos + logos)
- Requests PUT: ~1,000/mes
- Requests GET: ~50,000/mes
- Transfer OUT: ~20 GB/mes

#### Costos S3

| Concepto | Costo/mes |
|----------|-----------|
| **Almacenamiento (10 GB)** | $0.23 |
| **Almacenamiento (50 GB)** | $1.15 |
| **PUT requests (1,000)** | $0.005 |
| **GET requests (50,000)** | $0.02 |
| **Transfer OUT (20 GB)** | $1.80 |
| **Total estimado** | **~$1-3/mes** |

---

### 6. Amazon CloudFront (CDN) - Opcional pero Recomendado

| Parametro | Valor |
|-----------|-------|
| **Distribucion** | Web |
| **Origen** | S3 bucket `omnni-s3` |
| **Price class** | Price Class 200 (Norte America, Europa, Asia) |
| **SSL** | Certificado ACM personalizado |
| **Compresion** | Gzip + Brotli habilitados |
| **Cache TTL** | 86400 (24 horas) para imagenes |
| **WAF** | No (para reducir costos) |

**Beneficio:** Reduce latencia para usuarios en Colombia/Latinoamerica y reduce costos de transfer S3.

#### Costos CloudFront

| Concepto | Costo/mes |
|----------|-----------|
| **Transfer OUT (50 GB)** | $4.25 |
| **Requests HTTPS (100,000)** | $0.10 |
| **Total estimado** | **~$4-5/mes** |

---

### 7. Amazon Route 53 (DNS)

| Parametro | Valor |
|-----------|-------|
| **Hosted zones** | 2 (una por dominio/subdominio) |
| **Tipo de registros** | A (alias a ALB), CNAME, MX |
| **Health checks** | 1 (para ALB) |

**Registros DNS necesarios:**
- `facturacion.tudominio.com` → A record alias → ALB
- `admin.tudominio.com` → A record alias → ALB
- `cdn.tudominio.com` → CNAME → CloudFront (opcional)

#### Costos Route 53

| Concepto | Costo/mes |
|----------|-----------|
| **Hosted zone (x2)** | $1.00 |
| **Queries (estimado 1M)** | $0.40 |
| **Health check (1)** | $0.50 |
| **Total estimado** | **~$1.90/mes** |

---

### 8. AWS Certificate Manager (ACM)

| Parametro | Valor |
|-----------|-------|
| **Certificados** | 1 (wildcard `*.tudominio.com`) |
| **Validacion** | DNS (via Route 53) |
| **Renovacion** | Automatica |

#### Costos ACM

| Concepto | Costo/mes |
|----------|-----------|
| **Certificados publicos** | **GRATIS** |

---

### 9. Amazon SES (Simple Email Service) - Opcional

> Actualmente se usa **Resend** para email. Si se quiere migrar a SES para reducir costos:

| Parametro | Valor |
|-----------|-------|
| **Tipo** | Production (fuera de sandbox) |
| **Region** | `us-east-1` |
| **Emails estimados** | ~5,000/mes |

#### Costos SES vs Resend

| Servicio | Costo/mes (5,000 emails) |
|----------|--------------------------|
| **AWS SES** | **~$0.50** ($0.10 por 1,000 emails) |
| **Resend (plan free)** | **$0** (hasta 3,000 emails/mes) |
| **Resend (plan Pro)** | **$20** (hasta 50,000 emails/mes) |

*Recomendacion: Mantener Resend si el volumen es bajo. Migrar a SES si supera 3,000 emails/mes.*

---

## Resumen de Costos Mensuales

### Escenario On-Demand (sin compromisos)

| Servicio | Especificacion | Costo/mes |
|----------|---------------|-----------|
| EC2 | t3.large (2 vCPU, 8GB RAM) | $60.74 |
| EBS | gp3, 30 GB | $2.40 |
| RDS PostgreSQL | db.t3.small (2 vCPU, 2GB RAM) | $26.28 |
| RDS Storage | gp3, 30 GB + backups | $4.40 |
| ElastiCache Redis | cache.t3.micro | $12.41 |
| ALB | Internet-facing + LCUs | $22.00 |
| S3 | ~10-50 GB + requests | $2.00 |
| CloudFront | 50 GB transfer | $4.50 |
| Route 53 | 2 hosted zones | $1.90 |
| ACM | SSL wildcard | $0.00 |
| **TOTAL ON-DEMAND** | | **~$136.63/mes** |

### Escenario Reserved Instance 1 ano (sin pago anticipado)

| Servicio | Ahorro | Costo/mes |
|----------|--------|-----------|
| EC2 RI | -37% | $38.33 |
| EBS | (sin cambio) | $2.40 |
| RDS RI | -36% | $16.79 |
| RDS Storage | (sin cambio) | $4.40 |
| ElastiCache RI | -35% | $8.03 |
| ALB | (sin descuento) | $22.00 |
| S3 | (sin descuento) | $2.00 |
| CloudFront | (sin descuento) | $4.50 |
| Route 53 | (sin descuento) | $1.90 |
| ACM | Gratis | $0.00 |
| **TOTAL RESERVED 1 ANO** | | **~$100.35/mes** |

### Escenario Reserved Instance 1 ano (pago total anticipado)

| Servicio | Pago anual | Equivalente/mes |
|----------|------------|-----------------|
| EC2 RI | $429 | $35.77 |
| RDS RI | $184 | $15.33 |
| ElastiCache RI | $88 | $7.33 |
| Subtotal RI | **$701/ano** | **$58.43/mes** |
| + ALB + S3 + CF + R53 + EBS | | $37.20/mes |
| **TOTAL** | | **~$95.63/mes** |

---

## Valores para la Calculadora AWS

Para ingresar en [calculator.aws](https://calculator.aws/):

### EC2
- Region: US East (N. Virginia)
- OS: Linux
- Instance type: t3.large
- Usage: 100% utilization (730 hours/month)
- EBS: gp3, 30 GB, 3000 IOPS, 125 MB/s
- Elastic IP: 1 (attached)

### RDS
- Region: US East (N. Virginia)
- Engine: PostgreSQL
- Instance type: db.t3.small
- Deployment: Single-AZ
- Storage: gp3, 30 GB
- Backup: 7 days retention, ~10 GB additional
- No Performance Insights (free tier)
- No proxy

### ElastiCache
- Region: US East (N. Virginia)
- Engine: Redis
- Node type: cache.t3.micro
- Number of nodes: 1
- No Multi-AZ

### ALB
- Region: US East (N. Virginia)
- Number of ALBs: 1
- Processed bytes: ~30 GB/month
- Average new connections: ~100/second
- Average active connections: ~500
- Average rule evaluations: 4 per request

### S3
- Region: US East (N. Virginia)
- Storage class: S3 Standard
- Storage: 10-50 GB
- PUT requests: 1,000/month
- GET requests: 50,000/month
- Data transfer OUT: 20 GB/month

### CloudFront
- Data transfer out: 50 GB/month
- HTTPS requests: 100,000/month
- Price class: Price Class 200

### Route 53
- Hosted zones: 2
- Standard queries: 1,000,000/month
- Health checks: 1

---

## Estrategias de Ahorro Adicionales

### 1. Savings Plans (alternativa a Reserved Instances)
- **Compute Savings Plan 1 ano:** Hasta 20% de descuento en EC2
- Mas flexible que RI (aplica a cualquier instancia en la familia)

### 2. Escalar Bajo Demanda
- Empezar con `t3.medium` (4GB RAM) si el trafico inicial es menor a 200 usuarios
- Escalar a `t3.large` cuando sea necesario (cambio de instancia en ~5 min)

### 3. RDS - Escalar Storage
- Empezar con 20 GB y habilitar auto-scaling hasta 100 GB
- Solo pagas por lo que usas

### 4. Spot Instances (NO recomendado para produccion)
- Las Spot Instances pueden ser interrumpidas sin previo aviso
- No usar para aplicaciones de produccion con usuarios activos

### 5. Free Tier (primer ano)
- EC2: 750 horas/mes de t2.micro o t3.micro (no suficiente para produccion)
- RDS: 750 horas/mes de db.t3.micro (limitado pero util para desarrollo)
- S3: 5 GB almacenamiento + 20,000 GET + 2,000 PUT
- CloudFront: 1 TB transfer/mes (12 meses)

### 6. Eliminar CloudFront Inicialmente
- Si el presupuesto es ajustado, CloudFront es opcional
- Se puede agregar despues cuando el trafico crezca
- Ahorro: ~$4-5/mes

---

## Escalamiento Futuro

Si el sistema crece mas alla de 500 usuarios concurrentes:

| Cambio | Cuando | Costo adicional |
|--------|--------|-----------------|
| EC2 t3.large → t3.xlarge | CPU > 70% sostenido | +$60/mes |
| RDS db.t3.small → db.t3.medium | DB queries lentas | +$26/mes |
| ElastiCache t3.micro → t3.small | Cache evictions altas | +$12/mes |
| Agregar segundo EC2 + ALB | Alta disponibilidad | +$63/mes |
| RDS Multi-AZ | Failover automatico | +$26/mes |
| Separar Reverb a EC2 propio | WebSocket dedicado | +$30/mes |
