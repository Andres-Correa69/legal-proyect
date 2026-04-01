<?php

namespace App\Exports\Templates;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithMultipleSheets;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class ClientTemplate implements WithMultipleSheets
{
    protected array $documentTypes;

    public function __construct(array $documentTypes = [])
    {
        $this->documentTypes = $documentTypes;
    }

    public function sheets(): array
    {
        return [
            new ClientDataSheet(),
            new ClientInstructionsSheet($this->documentTypes),
        ];
    }
}

class ClientDataSheet implements FromArray, WithStyles, WithTitle, ShouldAutoSize
{
    public function array(): array
    {
        return [
            [
                'nombre*', 'email*', 'tipo_documento', 'numero_documento',
                'telefono', 'whatsapp_pais', 'whatsapp_numero', 'direccion',
                'fecha_nacimiento', 'genero', 'pais', 'departamento',
                'ciudad', 'barrio', 'ocupacion', 'observaciones', 'etiquetas',
            ],
            [
                'Juan Pérez', 'juan@email.com', 'CC', '1234567890',
                '3001234567', '+57', '3001234567', 'Calle 123 #45-67',
                '1990-05-15', 'Masculino', 'Colombia', 'Antioquia',
                'Medellín', 'El Poblado', 'Ingeniero', 'Cliente VIP', 'vip,frecuente',
            ],
            [
                'María López', 'maria@email.com', 'CC', '9876543210',
                '3109876543', '+57', '3109876543', 'Carrera 50 #30-20',
                '1985-11-22', 'Femenino', 'Colombia', 'Cundinamarca',
                'Bogotá', 'Chapinero', 'Abogada', '', 'corporativo',
            ],
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4F46E5']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ],
            '2:3' => [
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'FEF3C7']],
                'font' => ['italic' => true, 'color' => ['rgb' => '92400E']],
            ],
            'A1:Q3' => [
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E5E7EB']]],
            ],
        ];
    }

    public function title(): string
    {
        return 'Clientes';
    }
}

class ClientInstructionsSheet implements FromArray, WithStyles, WithTitle, ShouldAutoSize
{
    protected array $documentTypes;

    public function __construct(array $documentTypes = [])
    {
        $this->documentTypes = $documentTypes;
    }

    public function array(): array
    {
        $rows = [
            ['INSTRUCCIONES PARA IMPORTACIÓN DE CLIENTES'],
            [''],
            ['CAMPOS OBLIGATORIOS'],
            ['Campo', 'Descripción', 'Ejemplo'],
            ['nombre*', 'Nombre completo del cliente', 'Juan Pérez'],
            ['email*', 'Correo electrónico (debe ser único)', 'juan@email.com'],
            [''],
            ['CAMPOS OPCIONALES'],
            ['Campo', 'Descripción', 'Valores válidos'],
            ['tipo_documento', 'Tipo de documento de identidad', implode(', ', $this->documentTypes ?: ['CC', 'CE', 'NIT', 'TI', 'PP', 'DIE'])],
            ['numero_documento', 'Número de documento', '1234567890'],
            ['telefono', 'Teléfono de contacto', '3001234567'],
            ['whatsapp_pais', 'Código de país WhatsApp', '+57'],
            ['whatsapp_numero', 'Número de WhatsApp', '3001234567'],
            ['direccion', 'Dirección física', 'Calle 123 #45-67'],
            ['fecha_nacimiento', 'Fecha en formato YYYY-MM-DD', '1990-05-15'],
            ['genero', 'Género del cliente', 'Masculino, Femenino, Otro'],
            ['pais', 'País de residencia', 'Colombia'],
            ['departamento', 'Departamento/Estado', 'Antioquia'],
            ['ciudad', 'Ciudad', 'Medellín'],
            ['barrio', 'Barrio/Localidad', 'El Poblado'],
            ['ocupacion', 'Ocupación o profesión', 'Ingeniero'],
            ['observaciones', 'Notas adicionales', 'Cliente VIP'],
            ['etiquetas', 'Etiquetas separadas por coma', 'vip,frecuente,corporativo'],
            [''],
            ['NOTAS IMPORTANTES'],
            ['- Las filas 2 y 3 de la hoja "Clientes" son ejemplos. Elimínelas antes de importar.'],
            ['- Si el email ya existe en el sistema, el registro se puede omitir o actualizar según la opción elegida.'],
            ['- El campo contraseña se genera automáticamente (cliente123) para nuevos clientes.'],
            ['- Las etiquetas se separan con coma sin espacios.'],
            ['- Las fechas deben estar en formato YYYY-MM-DD (ejemplo: 1990-05-15).'],
        ];

        return $rows;
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true, 'size' => 14, 'color' => ['rgb' => 'FFFFFF']], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4F46E5']]],
            3 => ['font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => 'FFFFFF']], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '059669']]],
            4 => ['font' => ['bold' => true], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E5E7EB']]],
            8 => ['font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => 'FFFFFF']], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '2563EB']]],
            9 => ['font' => ['bold' => true], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E5E7EB']]],
            26 => ['font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => 'FFFFFF']], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'DC2626']]],
        ];
    }

    public function title(): string
    {
        return 'Instrucciones';
    }
}
