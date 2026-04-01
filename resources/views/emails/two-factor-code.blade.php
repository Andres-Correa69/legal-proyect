<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Codigo de Verificacion</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 10px;
            padding: 40px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            width: 60px;
            height: 60px;
            background: #3b82f6;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            color: white;
            font-weight: bold;
            font-size: 24px;
        }
        .code-box {
            background: #f0f9ff;
            border: 2px dashed #3b82f6;
            border-radius: 10px;
            padding: 30px;
            text-align: center;
            margin: 30px 0;
        }
        .code {
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #1e40af;
        }
        .warning {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 5px 5px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 12px;
        }
        h1 {
            margin: 0;
            color: #1e40af;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">CP</div>
            <h1>LEGAL SISTEMA</h1>
            <p style="color: #666;">Sistema de Gestión Legal</p>
        </div>

        <p>Hola <strong>{{ $user->name }}</strong>,</p>

        @if($type === 'activation')
            <p>Has solicitado activar la autenticacion en 2 pasos para tu cuenta. Usa el siguiente codigo para completar la activacion:</p>
        @else
            <p>Hemos detectado un intento de inicio de sesion desde un nuevo dispositivo. Por tu seguridad, ingresa el siguiente codigo para verificar tu identidad:</p>
        @endif

        <div class="code-box">
            <p style="margin: 0 0 10px; color: #666;">Tu codigo de verificacion es:</p>
            <div class="code">{{ $code }}</div>
        </div>

        <div class="warning">
            <strong>Importante:</strong>
            <ul style="margin: 10px 0 0; padding-left: 20px;">
                <li>Este codigo expira en <strong>10 minutos</strong></li>
                <li>Si no solicitaste este codigo, ignora este mensaje</li>
                <li>Nunca compartas este codigo con nadie</li>
            </ul>
        </div>

        <div class="footer">
            <p>Este es un mensaje automatico, por favor no responda a este correo.</p>
            <p>&copy; {{ date('Y') }} LEGAL SISTEMA - Sistema de Gestión Legal</p>
        </div>
    </div>
</body>
</html>
