<?php

namespace App\Services;

use Smalot\PdfParser\Parser;
use Illuminate\Http\UploadedFile;

class RutParserService
{
    /**
     * Parse a RUT PDF and extract structured data.
     */
    public function parse(UploadedFile $file): array
    {
        $parser = new Parser();
        $pdf = $parser->parseFile($file->getRealPath());
        $text = $pdf->getText();

        if (empty(trim($text))) {
            throw new \RuntimeException('No se pudo leer el contenido del PDF. Es posible que sea un documento escaneado.');
        }

        return $this->extractFields($text);
    }

    protected function extractFields(string $text): array
    {
        // Normalize whitespace but preserve line breaks
        $lines = array_map('trim', explode("\n", $text));
        $raw = implode("\n", array_filter($lines, fn($l) => $l !== ''));

        $data = [
            'nit' => null,
            'dv' => null,
            'tax_id' => null,
            'name' => null,
            'business_name' => null,
            'trade_name' => null,
            'first_surname' => null,
            'second_surname' => null,
            'first_name' => null,
            'other_names' => null,
            'taxpayer_type' => null,
            'document_type' => null,
            'document_number' => null,
            'address' => null,
            'department' => null,
            'city' => null,
            'country' => null,
            'email' => null,
            'phone' => null,
            'phone2' => null,
            'postal_code' => null,
            'economic_activities' => [],
            'tax_responsibilities' => [],
            'sectional_direction' => null,
            'form_number' => null,
        ];

        // Form number (Número de formulario)
        if (preg_match('/(\d{12,15})/', $raw, $m)) {
            $data['form_number'] = $m[1];
        }

        // NIT - look for the pattern after form number, typically a 10-digit number
        // The NIT appears near "Número de Identificación Tributaria"
        $this->extractNit($raw, $data);

        // Names - look for pattern after personal info labels
        $this->extractNames($raw, $data);

        // Build company name
        if ($data['business_name']) {
            $data['name'] = $data['business_name'];
        } else {
            $parts = array_filter([
                $data['first_name'],
                $data['other_names'],
                $data['first_surname'],
                $data['second_surname'],
            ]);
            $data['name'] = implode(' ', $parts);
        }

        // Build tax_id with DV
        if ($data['nit']) {
            $data['tax_id'] = $data['dv'] ? "{$data['nit']}-{$data['dv']}" : $data['nit'];
        }

        // Location
        $this->extractLocation($raw, $data);

        // Email
        if (preg_match('/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/', $raw, $m)) {
            $data['email'] = strtolower($m[1]);
        }

        // Phones - look for 10-digit numbers starting with 3 (Colombian mobile)
        if (preg_match_all('/\b(3\d{9})\b/', $raw, $m)) {
            $data['phone'] = $m[1][0] ?? null;
            $data['phone2'] = $m[1][1] ?? null;
        }

        // Taxpayer type
        if (preg_match('/Persona natural/i', $raw)) {
            $data['taxpayer_type'] = 'Persona Natural';
        } elseif (preg_match('/Persona jur[ií]dica/i', $raw)) {
            $data['taxpayer_type'] = 'Persona Jurídica';
        }

        // Document type
        if (preg_match('/[Cc][eé]dula de [Cc]iudadan/ui', $raw)) {
            $data['document_type'] = 'CC';
        } elseif (preg_match('/[Cc][eé]dula de [Ee]xtranjer/ui', $raw)) {
            $data['document_type'] = 'CE';
        } elseif (preg_match('/[Tt]arjeta de [Ii]dentidad/ui', $raw)) {
            $data['document_type'] = 'TI';
        } elseif (preg_match('/[Pp]asaporte/ui', $raw)) {
            $data['document_type'] = 'PA';
        }

        // Document number - typically same as NIT for natural persons
        if ($data['nit'] && $data['taxpayer_type'] === 'Persona Natural') {
            $data['document_number'] = $data['nit'];
        }

        // Economic activities - CIIU codes (4-digit patterns after activity labels)
        $this->extractEconomicActivities($raw, $data);

        // Tax responsibilities
        $this->extractTaxResponsibilities($raw, $data);

        return $data;
    }

    protected function extractNit(string $text, array &$data): void
    {
        // Pattern: NIT is typically a 9-10 digit number
        // Look for it after the form number line
        // The text has pattern like: form_number \n NIT_with_possible_DV
        // Example: "141192355787\n    10049157666" where last digit could be DV

        // First try: look for a clear NIT pattern (9-10 digits followed by a single digit DV)
        if (preg_match('/\b(\d{8,10})\s*[-–]?\s*(\d)\b/', $text, $m)) {
            // Check if this looks like a NIT-DV pair
            $candidate = $m[1];
            $dv = $m[2];
            if (strlen($candidate) >= 8 && strlen($candidate) <= 10) {
                $data['nit'] = $candidate;
                $data['dv'] = $dv;
                return;
            }
        }

        // Second try: NIT embedded - look for a 10+ digit number where last digit is DV
        // In the sample: "10049157666" = NIT 1004915766 + DV 6
        if (preg_match('/\b(\d{10,11})\b/', $text, $m)) {
            $full = $m[1];
            // Skip if it looks like a form number (12+ digits)
            if (strlen($full) <= 11) {
                $data['nit'] = substr($full, 0, -1);
                $data['dv'] = substr($full, -1);
                return;
            }
        }
    }

    protected function extractNames(string $text, array &$data): void
    {
        // Look for "Razón social" followed by a company name
        // Pattern in text: "35. Razón social\n{NAME}"
        if (preg_match('/35\.\s*Raz[oó]n social\s*\n([A-ZÁÉÍÓÚÑ\s&.,\-]+)/u', $text, $m)) {
            $name = trim($m[1]);
            if ($name && !preg_match('/^\d/', $name) && strlen($name) > 2) {
                $data['business_name'] = mb_convert_case($name, MB_CASE_TITLE, 'UTF-8');
            }
        }

        // For natural persons, names appear as uppercase blocks after location data
        // Pattern: SURNAME1 \t SURNAME2 \t FIRSTNAME \t OTHERNAME
        // In the sample: "ZULETA\tTOBON\tBRIAN\t"
        $nameLines = [];
        $lines = explode("\n", $text);
        foreach ($lines as $i => $line) {
            // Look for lines with tab-separated uppercase names (typical RUT pattern)
            if (preg_match('/^([A-ZÁÉÍÓÚÑ]{2,})\t+([A-ZÁÉÍÓÚÑ]*)\t+([A-ZÁÉÍÓÚÑ]{2,})/u', trim($line), $m)) {
                $data['first_surname'] = mb_convert_case(trim($m[1]), MB_CASE_TITLE, 'UTF-8');
                $data['second_surname'] = mb_convert_case(trim($m[2]), MB_CASE_TITLE, 'UTF-8');
                $data['first_name'] = mb_convert_case(trim($m[3]), MB_CASE_TITLE, 'UTF-8');
                break;
            }
        }

        // If tab pattern didn't work, try looking for uppercase name blocks after address
        if (!$data['first_surname']) {
            // Look for consecutive uppercase words that look like names
            if (preg_match('/([A-ZÁÉÍÓÚÑ]{2,})\s+([A-ZÁÉÍÓÚÑ]{2,})\s+([A-ZÁÉÍÓÚÑ]{2,})(?:\s+([A-ZÁÉÍÓÚÑ]{2,}))?/u', $text, $m)) {
                // Verify this isn't a label or address
                $candidate = $m[0];
                if (!preg_match('/COLOMBIA|DIAN|TRIBUTARIO|REGISTRO|IDENTIFICACIÓN|CLASIFICACIÓN|UBICACIÓN|RESPONSABILIDADES|IMPORTANTE/ui', $candidate)) {
                    $data['first_surname'] = mb_convert_case(trim($m[1]), MB_CASE_TITLE, 'UTF-8');
                    $data['second_surname'] = mb_convert_case(trim($m[2]), MB_CASE_TITLE, 'UTF-8');
                    $data['first_name'] = mb_convert_case(trim($m[3]), MB_CASE_TITLE, 'UTF-8');
                    $data['other_names'] = isset($m[4]) ? mb_convert_case(trim($m[4]), MB_CASE_TITLE, 'UTF-8') : null;
                }
            }
        }
    }

    protected function extractLocation(string $text, array &$data): void
    {
        // Department - look for known Colombian departments
        $departments = [
            'Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bolívar', 'Boyacá',
            'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba',
            'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena',
            'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda',
            'San Andrés', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés',
            'Vichada', 'Bogotá',
        ];

        foreach ($departments as $dept) {
            if (stripos($text, $dept) !== false || stripos($text, str_replace('í', 'i', $dept)) !== false) {
                $data['department'] = $dept;
                break;
            }
        }

        // City - look for municipality after department code pattern
        // Pattern: "Departamento\tCODE\tCiudad\tCODE"
        $colombianCities = [
            'Armenia', 'Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena',
            'Bucaramanga', 'Pereira', 'Manizales', 'Santa Marta', 'Ibagué', 'Pasto',
            'Villavicencio', 'Neiva', 'Montería', 'Valledupar', 'Popayán', 'Sincelejo',
            'Tunja', 'Florencia', 'Riohacha', 'Quibdó', 'Yopal', 'Mocoa', 'Leticia',
            'Arauca', 'San José del Guaviare', 'Mitú', 'Puerto Carreño', 'Inírida',
            'Cúcuta', 'Sogamoso', 'Duitama', 'Zipaquirá', 'Facatativá', 'Girardot',
            'Envigado', 'Itagüí', 'Bello', 'Palmira', 'Buenaventura', 'Tuluá',
        ];

        foreach ($colombianCities as $city) {
            $pattern = '/\b' . preg_quote($city, '/') . '\b/iu';
            if (preg_match($pattern, $text)) {
                $data['city'] = $city;
                break;
            }
        }

        // Address - look for typical Colombian address patterns
        // CL = Calle, CR/KR = Carrera, TV = Transversal, DG = Diagonal, AV = Avenida
        if (preg_match('/((?:CL|CR|KR|TV|DG|AV|CALLE|CARRERA|TRANSVERSAL|DIAGONAL|AVENIDA)\s+\d+[^\n@]*)/iu', $text, $m)) {
            $address = trim($m[1]);
            // Clean: remove email-like text and trailing whitespace
            $address = preg_replace('/[a-zA-Z0-9._%+\-]+@.*/', '', $address);
            $address = preg_replace('/\s+/', ' ', trim($address));
            $data['address'] = $address;
        }

        // Country
        if (stripos($text, 'COLOMBIA') !== false) {
            $data['country'] = 'Colombia';
        }

        // Postal code - 6-digit number after "Código postal"
        if (preg_match('/\b(\d{6})\b/', $text, $m)) {
            $data['postal_code'] = $m[1];
        }

        // Sectional direction
        if (preg_match('/(?:Impuestos y Aduanas de|Dirección Seccional de)\s+([A-Za-záéíóúñÁÉÍÓÚÑ\s]+)/u', $text, $m)) {
            $data['sectional_direction'] = trim($m[1]);
        }
    }

    protected function extractEconomicActivities(string $text, array &$data): void
    {
        // Look for 4-digit CIIU codes that appear after activity section
        // They typically appear as "0012" or similar patterns after dates
        if (preg_match_all('/\b(\d{4})\b/', $text, $m)) {
            $codes = [];
            foreach ($m[1] as $code) {
                $codeInt = (int) $code;
                // CIIU codes are typically between 0111 and 9900
                // Skip years, form numbers, and other non-CIIU numbers
                if ($codeInt >= 100 && $codeInt <= 9900 && !in_array($code, ['2025', '2026', '2024', '2023'])) {
                    $codes[] = $code;
                }
            }
            // Typically the first 1-4 unique codes after the activity section
            $data['economic_activities'] = array_unique(array_slice($codes, 0, 4));
        }
    }

    protected function extractTaxResponsibilities(string $text, array &$data): void
    {
        // Known responsibility codes
        $responsibilityCodes = [
            'O-13' => 'Gran contribuyente',
            'O-15' => 'Autorretenedor',
            'O-23' => 'Agente de retención IVA',
            'O-47' => 'Régimen simple',
            'R-99-PN' => 'No responsable',
            'O-48' => 'Impuesto sobre la renta',
            'O-49' => 'No responsable IVA',
        ];

        // Look for responsibility code patterns
        foreach ($responsibilityCodes as $code => $label) {
            if (stripos($text, $code) !== false) {
                $data['tax_responsibilities'][] = [
                    'code' => $code,
                    'label' => $label,
                ];
            }
        }

        // Also look for 2-digit responsibility numbers (like "09", "49")
        if (preg_match_all('/\b(\d{2})\b/', $text, $m)) {
            $knownCodes = ['05', '07', '09', '11', '13', '14', '15', '23', '46', '47', '48', '49', '50', '51', '52'];
            foreach ($m[1] as $code) {
                if (in_array($code, $knownCodes) && !in_array($code, array_column($data['tax_responsibilities'], 'code'))) {
                    $data['tax_responsibilities'][] = [
                        'code' => $code,
                        'label' => "Responsabilidad $code",
                    ];
                }
            }
        }
    }
}
