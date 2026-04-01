# Setup PostgreSQL con Docker en Multipass VM - Legal Sistema

## Prerequisitos

- Multipass VM con Docker instalado
- Acceso SSH a la VM

## Crear Contenedor PostgreSQL

Ejecutar en la VM de Multipass:

```bash
docker run -d \
  --name legal-postgres \
  -e POSTGRES_DB=legal_sistema \
  -e POSTGRES_USER=legal \
  -e POSTGRES_PASSWORD=legal_secure_2026 \
  -p 5433:5432 \
  -v legal_pgdata:/var/lib/postgresql/data \
  --restart unless-stopped \
  postgres:16-alpine
```

### Parametros explicados:
- `--name legal-postgres`: Nombre del contenedor
- `POSTGRES_DB=legal_sistema`: Base de datos creada automaticamente
- `POSTGRES_USER=legal`: Usuario de la base de datos
- `POSTGRES_PASSWORD=legal_secure_2026`: Contrasena (cambiar en produccion)
- `-p 5433:5432`: Puerto 5433 en el host mapeado al 5432 del contenedor (para no chocar con Inttegra en 5432)
- `-v legal_pgdata:/var/lib/postgresql/data`: Volumen persistente para datos
- `--restart unless-stopped`: Se reinicia automaticamente si la VM reinicia

## Verificar que el Contenedor esta Corriendo

```bash
docker ps | grep legal-postgres
```

## Conectar desde la Aplicacion

### Obtener IP de la VM Multipass

```bash
multipass info <nombre-vm> | grep IPv4
```

### Configurar `.env`

```env
DB_CONNECTION=pgsql
DB_HOST=<ip-de-la-vm>
DB_PORT=5433
DB_DATABASE=legal_sistema
DB_USERNAME=legal
DB_PASSWORD=legal_secure_2026
```

### Ejecutar Migraciones

```bash
php artisan migrate
```

### Ejecutar Seeders

```bash
php artisan db:seed
```

## Comandos Utiles

```bash
# Ver logs del contenedor
docker logs legal-postgres

# Acceder a psql dentro del contenedor
docker exec -it legal-postgres psql -U legal -d legal_sistema

# Detener el contenedor
docker stop legal-postgres

# Iniciar el contenedor
docker start legal-postgres

# Ver tamano de la base de datos
docker exec -it legal-postgres psql -U legal -d legal_sistema -c "SELECT pg_size_pretty(pg_database_size('legal_sistema'));"

# Backup de la base de datos
docker exec legal-postgres pg_dump -U legal legal_sistema > backup_legal_$(date +%Y%m%d).sql

# Restaurar backup
docker exec -i legal-postgres psql -U legal legal_sistema < backup_legal.sql
```

## Nota sobre Puertos

Si ambos contenedores (Inttegra y Legal) corren en la misma VM:
- **Inttegra**: Puerto `5432`
- **Legal**: Puerto `5433`

Asegurate de usar el puerto correcto en cada `.env`.

## Troubleshooting

1. **No puedo conectar desde mi maquina local**: Verificar que el firewall de la VM permite conexiones en el puerto 5433
2. **El contenedor no inicia**: Verificar con `docker logs legal-postgres` si hay errores
3. **Error de permisos en el volumen**: Eliminar el volumen y recrear: `docker volume rm legal_pgdata`
4. **Puerto ocupado**: Si otro servicio usa el 5433, cambiar el mapeo y actualizar `.env`
