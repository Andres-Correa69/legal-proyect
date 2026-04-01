# Configuracion de AWS S3 para Facturacion

## 1. Crear cuenta AWS y usuario IAM

1. Ir a [AWS Console](https://console.aws.amazon.com/)
2. Ir a **IAM** > **Users** > **Create user**
3. Nombre: `facturacion-app` (o el que prefieras)
4. Seleccionar **Attach policies directly**
5. Buscar y seleccionar `AmazonS3FullAccess`
6. Crear el usuario
7. Ir al usuario > **Security credentials** > **Create access key**
8. Seleccionar **Application running outside AWS**
9. Guardar el **Access Key ID** y **Secret Access Key**

## 2. Crear el bucket S3

1. Ir a **S3** > **Create bucket**
2. **Bucket name**: `omnni-s3`
3. **Region**: `us-east-1` (o la mas cercana, ej: `sa-east-1` para Sudamerica)
4. **Object Ownership**: ACLs disabled (recomendado)
5. **Block Public Access**: **Desmarcar** "Block all public access" y confirmar
6. Crear el bucket

## 3. Configurar la politica del bucket

1. Ir al bucket `omnni-s3` > **Permissions** > **Bucket policy**
2. Pegar la siguiente politica:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::omnni-s3/*"
        }
    ]
}
```

Esto permite que cualquiera pueda **leer** los archivos (necesario para mostrar logos e imagenes). Solo la aplicacion puede **subir** o **eliminar** archivos (via las credenciales IAM).

## 4. Politica IAM (opcional - si no usas AmazonS3FullAccess)

Si prefieres una politica mas restrictiva para el usuario IAM:

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

## 5. Variables de entorno

Agregar al archivo `.env`:

```
AWS_ACCESS_KEY_ID=tu-access-key-id
AWS_SECRET_ACCESS_KEY=tu-secret-access-key
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=omnni-s3
AWS_URL=https://omnni-s3.s3.us-east-1.amazonaws.com
AWS_USE_PATH_STYLE_ENDPOINT=false
```

**Nota**: Ajusta `AWS_DEFAULT_REGION` y `AWS_URL` si usaste otra region. El formato de URL es:
`https://{bucket}.s3.{region}.amazonaws.com`

## 6. Instalar dependencia y migrar

```bash
composer require league/flysystem-aws-s3-v3
php artisan migrate
```

## 7. Estructura de carpetas en S3

Los archivos se organizan automaticamente por empresa y modulo:

```
omnni-s3/
  {company-slug}/
    logos/          # Logos de empresa (subidos desde Configuracion General)
    products/       # Imagenes de productos (subidos desde crear/editar producto)
    clients/        # (futuro) Fotos de perfil de clientes
```

Cada empresa tiene su propia carpeta usando su `slug` como identificador.

## 8. Probar

1. Ir a **Configuracion General** (`/admin/settings/general`)
2. Click en "Subir logo" y seleccionar una imagen
3. El logo deberia aparecer en el sidebar
4. Ir a **Crear Producto** (`/admin/products/create/producto`)
5. En la seccion de imagen, click "Subir imagen"
6. Guardar el producto — la imagen se sube automaticamente

## 9. Verificar en S3

En la consola de AWS, ir al bucket `omnni-s3` y verificar que los archivos estan en la estructura correcta:
- `{slug-empresa}/logos/{uuid}.jpg`
- `{slug-empresa}/products/{uuid}.png`

## Troubleshooting

### Error "Access Denied" al subir
- Verificar que las credenciales IAM estan correctas en `.env`
- Verificar que el usuario IAM tiene permisos de S3

### Las imagenes no cargan (403)
- Verificar que la politica del bucket esta configurada correctamente
- Verificar que "Block Public Access" esta deshabilitado

### Error "The bucket does not allow ACLs"
- Es normal — no usamos ACLs. El servicio usa `Storage::disk('s3')->put()` sin especificar ACL
- Los archivos son publicos gracias a la politica del bucket, no a ACLs

### La region no coincide
- Asegurar que `AWS_DEFAULT_REGION` y la region en `AWS_URL` son la misma donde creaste el bucket
