import { useState, useCallback } from 'react';
import { Upload, FileText, User, Building2, Mail, Phone, MapPin, CreditCard, Eye, EyeOff } from 'lucide-react';

interface CompanyData {
    name: string;
    email: string;
    phone: string;
    address: string;
    tax_id: string;
    city: string;
    department: string;
    admin_name: string;
    admin_email: string;
    admin_password: string;
    admin_password_confirmation: string;
}

interface StepCompanyInfoProps {
    data: CompanyData;
    onChange: (data: CompanyData) => void;
    onParseRut: (file: File) => Promise<void>;
    errors: Record<string, string>;
    isParsingRut: boolean;
}

export function StepCompanyInfo({ data, onChange, onParseRut, errors, isParsingRut }: StepCompanyInfoProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [rutFileName, setRutFileName] = useState('');

    const update = useCallback(
        (field: keyof CompanyData, value: string) => {
            onChange({ ...data, [field]: value });
        },
        [data, onChange]
    );

    const handleRutUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setRutFileName(file.name);
            await onParseRut(file);
        }
    };

    const handleRutDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            setRutFileName(file.name);
            await onParseRut(file);
        }
    };

    return (
        <div className="space-y-6">
            {/* RUT Upload */}
            <div>
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
                    <FileText size={18} className="text-blue-600" />
                    Cargar RUT (opcional)
                </h3>
                <div
                    onDrop={handleRutDrop}
                    onDragOver={(e) => e.preventDefault()}
                    className="flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 transition-colors hover:border-blue-400 hover:bg-blue-50/50"
                >
                    <Upload size={28} className="text-slate-400" />
                    <div className="text-center">
                        <label className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
                            Selecciona un PDF de RUT
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleRutUpload}
                                className="hidden"
                            />
                        </label>
                        <p className="mt-1 text-xs text-slate-500">o arrastra y suelta aquí</p>
                    </div>
                    {rutFileName && (
                        <p className="text-xs text-slate-500">
                            {isParsingRut ? 'Procesando...' : `Archivo: ${rutFileName}`}
                        </p>
                    )}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                    Al subir tu RUT, los datos de la empresa se llenarán automáticamente
                </p>
            </div>

            {/* Separator */}
            <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-500">O ingresa manualmente</span>
                <div className="h-px flex-1 bg-slate-200" />
            </div>

            {/* Company info */}
            <div>
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
                    <Building2 size={18} className="text-blue-600" />
                    Datos de la Empresa
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-sm text-slate-700">Nombre de la empresa *</label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => update('name', e.target.value)}
                            placeholder="Mi Empresa S.A.S"
                            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm text-slate-700">NIT</label>
                        <input
                            type="text"
                            value={data.tax_id}
                            onChange={(e) => update('tax_id', e.target.value)}
                            placeholder="900123456-7"
                            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                        {errors.tax_id && <p className="mt-1 text-xs text-red-600">{errors.tax_id}</p>}
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm text-slate-700">Correo de la empresa</label>
                        <input
                            type="email"
                            value={data.email}
                            onChange={(e) => update('email', e.target.value)}
                            placeholder="contacto@miempresa.com"
                            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm text-slate-700">Teléfono</label>
                        <input
                            type="tel"
                            value={data.phone}
                            onChange={(e) => update('phone', e.target.value)}
                            placeholder="3001234567"
                            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm text-slate-700">Dirección</label>
                        <input
                            type="text"
                            value={data.address}
                            onChange={(e) => update('address', e.target.value)}
                            placeholder="Calle 123 #45-67"
                            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm text-slate-700">Ciudad</label>
                        <input
                            type="text"
                            value={data.city}
                            onChange={(e) => update('city', e.target.value)}
                            placeholder="Bogotá"
                            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm text-slate-700">Departamento</label>
                        <input
                            type="text"
                            value={data.department}
                            onChange={(e) => update('department', e.target.value)}
                            placeholder="Cundinamarca"
                            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>
                </div>
            </div>

            {/* Admin credentials */}
            <div>
                <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
                    <User size={18} className="text-blue-600" />
                    Cuenta de Administrador
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-sm text-slate-700">Nombre completo *</label>
                        <input
                            type="text"
                            value={data.admin_name}
                            onChange={(e) => update('admin_name', e.target.value)}
                            placeholder="Juan Pérez"
                            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                        {errors.admin_name && <p className="mt-1 text-xs text-red-600">{errors.admin_name}</p>}
                    </div>
                    <div className="sm:col-span-2">
                        <label className="mb-1.5 block text-sm text-slate-700">Correo electrónico *</label>
                        <input
                            type="email"
                            value={data.admin_email}
                            onChange={(e) => update('admin_email', e.target.value)}
                            placeholder="admin@miempresa.com"
                            className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                        {errors.admin_email && <p className="mt-1 text-xs text-red-600">{errors.admin_email}</p>}
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm text-slate-700">Contraseña *</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={data.admin_password}
                                onChange={(e) => update('admin_password', e.target.value)}
                                placeholder="Mínimo 8 caracteres"
                                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {errors.admin_password && <p className="mt-1 text-xs text-red-600">{errors.admin_password}</p>}
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm text-slate-700">Confirmar contraseña *</label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={data.admin_password_confirmation}
                                onChange={(e) => update('admin_password_confirmation', e.target.value)}
                                placeholder="Repite la contraseña"
                                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 pr-10 text-sm text-slate-900 placeholder-slate-400 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                            >
                                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Honeypot - hidden from users */}
            <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className="absolute left-[-9999px] opacity-0"
            />
        </div>
    );
}
