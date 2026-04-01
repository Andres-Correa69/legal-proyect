import { useState, useEffect } from 'react';
import { FileText, Key } from 'lucide-react';

interface DianConfigData {
    electronic_invoicing_token: string;
    ei_type_document_identification_id: string;
    ei_type_organization_id: string;
    ei_type_regime_id: string;
    ei_type_liability_id: string;
    ei_municipality_id: string;
    ei_business_name: string;
    ei_address: string;
    ei_phone: string;
    ei_email: string;
}

interface StepDianConfigProps {
    data: DianConfigData;
    onChange: (data: DianConfigData) => void;
}

interface CatalogItem {
    id: number;
    name: string;
    code?: string;
}

interface Catalogs {
    type_document_identifications?: CatalogItem[];
    type_organizations?: CatalogItem[];
    type_regimes?: CatalogItem[];
    type_liabilities?: CatalogItem[];
    municipalities?: CatalogItem[];
}

export function StepDianConfig({ data, onChange }: StepDianConfigProps) {
    const [catalogs, setCatalogs] = useState<Catalogs>({});
    const [loadingCatalogs, setLoadingCatalogs] = useState(true);

    useEffect(() => {
        fetch('/api/electronic-invoicing/catalogs')
            .then((res) => res.json())
            .then((res) => {
                setCatalogs(res.data ?? res ?? {});
            })
            .catch(() => {})
            .finally(() => setLoadingCatalogs(false));
    }, []);

    const update = (field: keyof DianConfigData, value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
                    <Key size={18} className="text-blue-600" />
                    Token de Facturación Electrónica
                </h3>
                <input
                    type="text"
                    value={data.electronic_invoicing_token}
                    onChange={(e) => update('electronic_invoicing_token', e.target.value)}
                    placeholder="Token proporcionado por el proveedor DIAN"
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
                <p className="mt-1 text-xs text-slate-500">
                    Si no tienes token aún, puedes configurar esto después desde el panel
                </p>
            </div>

            <div>
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
                    <FileText size={18} className="text-blue-600" />
                    Datos Tributarios
                </h3>

                {loadingCatalogs ? (
                    <p className="text-sm text-slate-500">Cargando catálogos DIAN...</p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-sm text-slate-700">Tipo de documento</label>
                            <select
                                value={data.ei_type_document_identification_id}
                                onChange={(e) => update('ei_type_document_identification_id', e.target.value)}
                                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                            >
                                <option value="">Seleccionar...</option>
                                {catalogs.type_document_identifications?.map((item) => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm text-slate-700">Tipo de organización</label>
                            <select
                                value={data.ei_type_organization_id}
                                onChange={(e) => update('ei_type_organization_id', e.target.value)}
                                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                            >
                                <option value="">Seleccionar...</option>
                                {catalogs.type_organizations?.map((item) => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm text-slate-700">Tipo de régimen</label>
                            <select
                                value={data.ei_type_regime_id}
                                onChange={(e) => update('ei_type_regime_id', e.target.value)}
                                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                            >
                                <option value="">Seleccionar...</option>
                                {catalogs.type_regimes?.map((item) => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm text-slate-700">Tipo de responsabilidad</label>
                            <select
                                value={data.ei_type_liability_id}
                                onChange={(e) => update('ei_type_liability_id', e.target.value)}
                                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                            >
                                <option value="">Seleccionar...</option>
                                {catalogs.type_liabilities?.map((item) => (
                                    <option key={item.id} value={item.id}>{item.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="mb-1.5 block text-sm text-slate-700">Razón social DIAN</label>
                            <input
                                type="text"
                                value={data.ei_business_name}
                                onChange={(e) => update('ei_business_name', e.target.value)}
                                placeholder="Razón social como aparece en la DIAN"
                                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm text-slate-700">Dirección DIAN</label>
                            <input
                                type="text"
                                value={data.ei_address}
                                onChange={(e) => update('ei_address', e.target.value)}
                                placeholder="Dirección registrada en DIAN"
                                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm text-slate-700">Teléfono DIAN</label>
                            <input
                                type="tel"
                                value={data.ei_phone}
                                onChange={(e) => update('ei_phone', e.target.value)}
                                placeholder="Teléfono registrado"
                                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm text-slate-700">Email DIAN</label>
                            <input
                                type="email"
                                value={data.ei_email}
                                onChange={(e) => update('ei_email', e.target.value)}
                                placeholder="correo@dian.com"
                                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
