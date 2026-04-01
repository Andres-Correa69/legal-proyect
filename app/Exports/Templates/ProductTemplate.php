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

class ProductTemplate implements WithMultipleSheets
{
    protected array $categories;
    protected array $suppliers;
    protected array $locations;

    public function __construct(array $categories = [], array $suppliers = [], array $locations = [])
    {
        $this->categories = $categories;
        $this->suppliers = $suppliers;
        $this->locations = $locations;
    }

    public function sheets(): array
    {
        return [
            new ProductDataSheet(),
            new ProductInstructionsSheet($this->categories, $this->suppliers, $this->locations),
        ];
    }
}

class ProductDataSheet implements FromArray, WithStyles, WithTitle, ShouldAutoSize
{
    public function array(): array
    {
        return [
            [
                'nombre*', 'categoria*', 'precio_compra*', 'precio_venta*',
                'sku', 'codigo_barras', 'marca', 'descripcion',
                'stock_actual', 'stock_minimo', 'stock_maximo', 'impuesto',
                'unidad_medida', 'proveedor', 'es_rastreable',
            ],
            [
                'Aspirina 500mg x20', 'Medicamentos', '5000', '8500',
                '', '7702057066307', 'Bayer', 'Tabletas analgésicas',
                '100', '20', '500', '19',
                'unidad', 'Distribuidora ABC S.A.S', 'si',
            ],
            [
                'Acetaminofén 500mg', 'Medicamentos', '3000', '5500',
                '', '7702057066314', 'MK', '',
                '250', '50', '1000', '0',
                'caja', '', 'si',
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
            'A1:O3' => [
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E5E7EB']]],
            ],
        ];
    }

    public function title(): string
    {
        return 'Productos';
    }
}

class ProductInstructionsSheet implements FromArray, WithStyles, WithTitle, ShouldAutoSize
{
    protected array $categories;
    protected array $suppliers;
    protected array $locations;

    public function __construct(array $categories = [], array $suppliers = [], array $locations = [])
    {
        $this->categories = $categories;
        $this->suppliers = $suppliers;
        $this->locations = $locations;
    }

    public function array(): array
    {
        $rows = [
            ['INSTRUCCIONES PARA IMPORTACIÓN DE PRODUCTOS'],
            [''],
            ['CAMPOS OBLIGATORIOS'],
            ['Campo', 'Descripción', 'Ejemplo'],
            ['nombre*', 'Nombre del producto', 'Aspirina 500mg x20'],
            ['categoria*', 'Nombre exacto de la categoría (ver catálogo abajo)', 'Medicamentos'],
            ['precio_compra*', 'Precio de compra sin formato (solo números)', '5000'],
            ['precio_venta*', 'Precio de venta sin formato (solo números)', '8500'],
            [''],
            ['CAMPOS OPCIONALES'],
            ['Campo', 'Descripción', 'Valores válidos'],
            ['sku', 'Código interno (se genera automáticamente si se deja vacío)', 'PROD-00001'],
            ['codigo_barras', 'Código de barras del producto', '7702057066307'],
            ['marca', 'Marca del producto', 'Bayer'],
            ['descripcion', 'Descripción del producto', 'Texto libre'],
            ['stock_actual', 'Cantidad actual en inventario (default: 0)', '100'],
            ['stock_minimo', 'Stock mínimo antes de alerta (default: 0)', '20'],
            ['stock_maximo', 'Stock máximo sugerido', '500'],
            ['impuesto', 'Porcentaje de IVA (0, 5, 19)', '19'],
            ['unidad_medida', 'Unidad de medida', 'unidad, caja, paquete, botella, kg, litro'],
            ['proveedor', 'Nombre exacto del proveedor (ver catálogo abajo)', 'Distribuidora ABC'],
            ['es_rastreable', 'Si el producto maneja inventario', 'si, no (default: si)'],
            [''],
            ['CATÁLOGO DE CATEGORÍAS DISPONIBLES'],
        ];

        if (!empty($this->categories)) {
            $rows[] = ['ID', 'Nombre'];
            foreach ($this->categories as $cat) {
                $rows[] = [$cat['id'], $cat['name']];
            }
        } else {
            $rows[] = ['(Las categorías se cargarán de tu empresa al descargar la plantilla)'];
        }

        $rows[] = [''];
        $rows[] = ['CATÁLOGO DE PROVEEDORES DISPONIBLES'];
        if (!empty($this->suppliers)) {
            $rows[] = ['ID', 'Nombre'];
            foreach ($this->suppliers as $sup) {
                $rows[] = [$sup['id'], $sup['name']];
            }
        } else {
            $rows[] = ['(Los proveedores se cargarán de tu empresa al descargar la plantilla)'];
        }

        $rows[] = [''];
        $rows[] = ['NOTAS IMPORTANTES'];
        $rows[] = ['- Las filas 2 y 3 de la hoja "Productos" son ejemplos. Elimínelas antes de importar.'];
        $rows[] = ['- Los precios deben ser números sin signos de pesos ni puntos de miles.'];
        $rows[] = ['- La categoría debe coincidir exactamente con una existente (sin tildes ni mayúsculas importan).'];
        $rows[] = ['- Si el SKU o código de barras ya existe, se puede omitir o actualizar según la opción elegida.'];
        $rows[] = ['- El SKU se genera automáticamente si se deja vacío.'];

        return $rows;
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true, 'size' => 14, 'color' => ['rgb' => 'FFFFFF']], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4F46E5']]],
            3 => ['font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => 'FFFFFF']], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '059669']]],
            4 => ['font' => ['bold' => true], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E5E7EB']]],
            10 => ['font' => ['bold' => true, 'size' => 12, 'color' => ['rgb' => 'FFFFFF']], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '2563EB']]],
            11 => ['font' => ['bold' => true], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E5E7EB']]],
        ];
    }

    public function title(): string
    {
        return 'Instrucciones';
    }
}
