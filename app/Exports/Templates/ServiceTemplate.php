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

class ServiceTemplate implements WithMultipleSheets
{
    public function sheets(): array
    {
        return [
            new ServiceDataSheet(),
            new ServiceInstructionsSheet(),
        ];
    }
}

class ServiceDataSheet implements FromArray, WithStyles, WithTitle, ShouldAutoSize
{
    public function array(): array
    {
        return [
            ['nombre*', 'precio*', 'categoria', 'descripcion', 'duracion_estimada', 'unidad', 'precio_base'],
            ['Consultoría Empresarial', '150000', 'consultoria', 'Asesoría en gestión empresarial', '60', 'hora', '150000'],
            ['Instalación de Software', '80000', 'instalacion', 'Instalación y configuración', '120', 'servicio', '100000'],
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
            'A1:G3' => [
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E5E7EB']]],
            ],
        ];
    }

    public function title(): string
    {
        return 'Servicios';
    }
}

class ServiceInstructionsSheet implements FromArray, WithStyles, WithTitle, ShouldAutoSize
{
    public function array(): array
    {
        return [
            ['INSTRUCCIONES PARA IMPORTACIÓN DE SERVICIOS'],
            [''],
            ['CAMPOS OBLIGATORIOS'],
            ['Campo', 'Descripción', 'Ejemplo'],
            ['nombre*', 'Nombre del servicio', 'Consultoría Empresarial'],
            ['precio*', 'Precio del servicio (solo números)', '150000'],
            [''],
            ['CAMPOS OPCIONALES'],
            ['Campo', 'Descripción', 'Valores válidos'],
            ['categoria', 'Categoría del servicio', 'consultoria, capacitacion, instalacion, mantenimiento, soporte, otro'],
            ['descripcion', 'Descripción del servicio', 'Texto libre'],
            ['duracion_estimada', 'Duración en minutos', '60, 120, 480'],
            ['unidad', 'Unidad de cobro', 'servicio, hora, dia, sesion, proyecto, visita, unidad'],
            ['precio_base', 'Precio base antes de descuento', '200000'],
            [''],
            ['NOTAS IMPORTANTES'],
            ['- Las filas 2 y 3 de la hoja "Servicios" son ejemplos. Elimínelas antes de importar.'],
            ['- Los precios deben ser números sin signos de pesos ni puntos de miles.'],
            ['- La duración estimada se expresa en minutos.'],
            ['- Si no se especifica precio_base, se usará el mismo valor del precio.'],
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true, 'size' => 14, 'color' => ['rgb' => 'FFFFFF']], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4F46E5']]],
            3 => ['font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => 'FFFFFF']], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '059669']]],
            4 => ['font' => ['bold' => true], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E5E7EB']]],
            8 => ['font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => 'FFFFFF']], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '2563EB']]],
            9 => ['font' => ['bold' => true], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E5E7EB']]],
            16 => ['font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => 'FFFFFF']], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'DC2626']]],
        ];
    }

    public function title(): string
    {
        return 'Instrucciones';
    }
}
