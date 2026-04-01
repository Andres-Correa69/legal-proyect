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

class SupplierTemplate implements WithMultipleSheets
{
    public function sheets(): array
    {
        return [
            new SupplierDataSheet(),
            new SupplierInstructionsSheet(),
        ];
    }
}

class SupplierDataSheet implements FromArray, WithStyles, WithTitle, ShouldAutoSize
{
    public function array(): array
    {
        return [
            ['nombre*', 'nit', 'tipo_documento', 'email', 'telefono', 'direccion', 'nombre_contacto', 'terminos_pago'],
            ['Distribuidora ABC S.A.S', '900123456-7', 'NIT', 'ventas@abc.com', '6041234567', 'Calle 80 #50-30, Medellín', 'Carlos García', '30 días'],
            ['Importaciones XYZ', '800987654-1', 'NIT', 'info@xyz.co', '6012345678', 'Av 68 #22-15, Bogotá', 'Laura Martínez', '60 días'],
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
            'A1:H3' => [
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E5E7EB']]],
            ],
        ];
    }

    public function title(): string
    {
        return 'Proveedores';
    }
}

class SupplierInstructionsSheet implements FromArray, WithStyles, WithTitle, ShouldAutoSize
{
    public function array(): array
    {
        return [
            ['INSTRUCCIONES PARA IMPORTACIÓN DE PROVEEDORES'],
            [''],
            ['CAMPOS OBLIGATORIOS'],
            ['Campo', 'Descripción', 'Ejemplo'],
            ['nombre*', 'Razón social o nombre del proveedor', 'Distribuidora ABC S.A.S'],
            [''],
            ['CAMPOS OPCIONALES'],
            ['Campo', 'Descripción', 'Valores válidos'],
            ['nit', 'NIT o número de identificación tributaria', '900123456-7'],
            ['tipo_documento', 'Tipo de documento', 'NIT, CC, CE'],
            ['email', 'Correo electrónico', 'ventas@abc.com'],
            ['telefono', 'Teléfono de contacto', '6041234567'],
            ['direccion', 'Dirección física', 'Calle 80 #50-30'],
            ['nombre_contacto', 'Persona de contacto', 'Carlos García'],
            ['terminos_pago', 'Condiciones de pago', '30 días, 60 días, contado'],
            [''],
            ['NOTAS IMPORTANTES'],
            ['- La fila 2 y 3 de la hoja "Proveedores" son ejemplos. Elimínelas antes de importar.'],
            ['- Si el NIT ya existe, el registro se puede omitir o actualizar según la opción elegida.'],
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true, 'size' => 14, 'color' => ['rgb' => 'FFFFFF']], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4F46E5']]],
            3 => ['font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => 'FFFFFF']], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '059669']]],
            4 => ['font' => ['bold' => true], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E5E7EB']]],
            7 => ['font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => 'FFFFFF']], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '2563EB']]],
            8 => ['font' => ['bold' => true], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E5E7EB']]],
            17 => ['font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => 'FFFFFF']], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'DC2626']]],
        ];
    }

    public function title(): string
    {
        return 'Instrucciones';
    }
}
