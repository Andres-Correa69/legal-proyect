import { useState, useCallback, useRef } from 'react';
import { Plus, Trash2, Package, Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProductDraft {
    name: string;
    price: string;
    cost: string;
    sku: string;
    type: 'product' | 'service';
    description: string;
    tax_rate: string;
}

interface StepProductsProps {
    products: ProductDraft[];
    onChange: (products: ProductDraft[]) => void;
}

const emptyProduct: ProductDraft = {
    name: '',
    price: '',
    cost: '',
    sku: '',
    type: 'product',
    description: '',
    tax_rate: '19',
};

export function StepProducts({ products, onChange }: StepProductsProps) {
    const [isImporting, setIsImporting] = useState(false);
    const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addProduct = useCallback(() => {
        onChange([...products, { ...emptyProduct }]);
    }, [products, onChange]);

    const removeProduct = useCallback(
        (index: number) => {
            onChange(products.filter((_, i) => i !== index));
        },
        [products, onChange]
    );

    const updateProduct = useCallback(
        (index: number, field: keyof ProductDraft, value: string) => {
            const updated = [...products];
            updated[index] = { ...updated[index], [field]: value };
            onChange(updated);
        },
        [products, onChange]
    );

    const handleDownloadTemplate = async () => {
        try {
            const response = await fetch('/api/registration/product-template', {
                credentials: 'include',
                headers: { 'Accept': 'application/octet-stream' },
            });
            if (!response.ok) throw new Error('Download failed');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'plantilla_productos_legal_sistema.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch {
            setImportMessage({ type: 'error', text: 'Error al descargar la plantilla.' });
        }
    };

    const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setImportMessage(null);

        try {
            await fetch('/sanctum/csrf-cookie', { method: 'GET', credentials: 'include' });
            const csrfToken = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];

            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/registration/import-products', {
                method: 'POST',
                body: formData,
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    ...(csrfToken ? { 'X-XSRF-TOKEN': decodeURIComponent(csrfToken) } : {}),
                },
            });

            const data = await res.json();

            if (data.success && data.data) {
                const imported: ProductDraft[] = data.data.map((p: Record<string, string>) => ({
                    name: p.name || '',
                    price: p.price || '0',
                    cost: p.cost || '0',
                    sku: p.sku || '',
                    type: (p.type === 'service' ? 'service' : 'product') as 'product' | 'service',
                    description: p.description || '',
                    tax_rate: p.tax_rate || '19',
                }));

                onChange([...products, ...imported]);
                setImportMessage({ type: 'success', text: `${imported.length} producto(s) importados exitosamente.` });
            } else {
                setImportMessage({ type: 'error', text: data.message || 'Error al procesar el archivo.' });
            }
        } catch {
            setImportMessage({ type: 'error', text: 'Error de conexión al importar.' });
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                    <Package size={18} className="text-blue-600" />
                    Productos y Servicios
                </h3>
                <button
                    type="button"
                    onClick={addProduct}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100"
                >
                    <Plus size={14} /> Agregar
                </button>
            </div>

            {/* Import from Excel */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                    <FileSpreadsheet size={16} className="text-green-600" />
                    <span className="text-sm font-medium text-slate-900">Importar desde archivo</span>
                </div>
                <p className="mb-3 text-xs text-slate-500">
                    Descarga la plantilla, llénala con tus productos y súbela para importarlos masivamente.
                </p>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                    >
                        <Download size={14} /> Descargar plantilla
                    </button>
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100">
                        <Upload size={14} /> {isImporting ? 'Importando...' : 'Importar archivo'}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv,.xlsx,.xls,.txt"
                            onChange={handleImportFile}
                            className="hidden"
                            disabled={isImporting}
                        />
                    </label>
                </div>

                {/* Import message */}
                {importMessage && (
                    <div className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                        importMessage.type === 'success'
                            ? 'border border-green-200 bg-green-50 text-green-700'
                            : 'border border-red-200 bg-red-50 text-red-700'
                    }`}>
                        {importMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                        {importMessage.text}
                    </div>
                )}
            </div>

            {/* Separator */}
            <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-500">O agrega manualmente</span>
                <div className="h-px flex-1 bg-slate-200" />
            </div>

            {products.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 py-10">
                    <Package size={36} className="text-slate-400" />
                    <p className="text-sm text-slate-500">No has agregado productos todavía</p>
                    <button
                        type="button"
                        onClick={addProduct}
                        className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                    >
                        <Plus size={14} /> Agregar primer producto
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {products.map((product, index) => (
                        <div
                            key={index}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                        >
                            <div className="mb-3 flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700">
                                    {product.type === 'service' ? 'Servicio' : 'Producto'} #{index + 1}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => removeProduct(index)}
                                    className="text-slate-400 hover:text-red-500"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="sm:col-span-2">
                                    <label className="mb-1 block text-xs text-slate-500">Nombre *</label>
                                    <input
                                        type="text"
                                        value={product.name}
                                        onChange={(e) => updateProduct(index, 'name', e.target.value)}
                                        placeholder="Nombre del producto o servicio"
                                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-slate-500">Precio de venta *</label>
                                    <input
                                        type="number"
                                        value={product.price}
                                        onChange={(e) => updateProduct(index, 'price', e.target.value)}
                                        placeholder="0"
                                        min="0"
                                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-slate-500">Costo</label>
                                    <input
                                        type="number"
                                        value={product.cost}
                                        onChange={(e) => updateProduct(index, 'cost', e.target.value)}
                                        placeholder="0"
                                        min="0"
                                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-slate-500">SKU</label>
                                    <input
                                        type="text"
                                        value={product.sku}
                                        onChange={(e) => updateProduct(index, 'sku', e.target.value)}
                                        placeholder="SKU-001"
                                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-slate-500">Tipo</label>
                                    <select
                                        value={product.type}
                                        onChange={(e) => updateProduct(index, 'type', e.target.value)}
                                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                                    >
                                        <option value="product">Producto</option>
                                        <option value="service">Servicio</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-slate-500">IVA (%)</label>
                                    <select
                                        value={product.tax_rate}
                                        onChange={(e) => updateProduct(index, 'tax_rate', e.target.value)}
                                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                                    >
                                        <option value="0">0% - Exento</option>
                                        <option value="5">5%</option>
                                        <option value="19">19%</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <p className="text-xs text-slate-500">
                Puedes agregar más productos después desde el panel de administración
            </p>
        </div>
    );
}
