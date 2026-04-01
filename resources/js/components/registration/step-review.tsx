import { CheckCircle2, Edit3, Building2, ImageIcon, Package, FileText, Sparkles } from 'lucide-react';

interface StepReviewProps {
    companyData: {
        name: string;
        email: string;
        phone: string;
        address: string;
        tax_id: string;
        city: string;
        department: string;
        admin_name: string;
        admin_email: string;
    };
    hasLogo: boolean;
    hasLogoIcon: boolean;
    productsCount: number;
    hasDianConfig: boolean;
    acceptTerms: boolean;
    onAcceptTermsChange: (value: boolean) => void;
    onGoToStep: (step: number) => void;
    onSubmit: () => void;
    isSubmitting: boolean;
}

export function StepReview({
    companyData,
    hasLogo,
    hasLogoIcon,
    productsCount,
    hasDianConfig,
    acceptTerms,
    onAcceptTermsChange,
    onGoToStep,
    onSubmit,
    isSubmitting,
}: StepReviewProps) {
    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-xl font-bold text-slate-900">Revisa tus datos</h3>
                <p className="mt-1 text-sm text-slate-500">
                    Verifica que todo esté correcto antes de crear tu empresa
                </p>
            </div>

            {/* Company info */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <div className="mb-3 flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Building2 size={16} className="text-blue-600" />
                        Datos de la Empresa
                    </h4>
                    <button
                        type="button"
                        onClick={() => onGoToStep(1)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    >
                        <Edit3 size={12} /> Editar
                    </button>
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                        <span className="text-slate-500">Nombre: </span>
                        <span className="text-slate-900">{companyData.name || '—'}</span>
                    </div>
                    <div>
                        <span className="text-slate-500">NIT: </span>
                        <span className="text-slate-900">{companyData.tax_id || '—'}</span>
                    </div>
                    <div>
                        <span className="text-slate-500">Email: </span>
                        <span className="text-slate-900">{companyData.email || '—'}</span>
                    </div>
                    <div>
                        <span className="text-slate-500">Teléfono: </span>
                        <span className="text-slate-900">{companyData.phone || '—'}</span>
                    </div>
                    <div className="sm:col-span-2">
                        <span className="text-slate-500">Dirección: </span>
                        <span className="text-slate-900">
                            {[companyData.address, companyData.city, companyData.department].filter(Boolean).join(', ') || '—'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Admin info */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <div className="mb-3 flex items-center justify-between">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <CheckCircle2 size={16} className="text-green-500" />
                        Cuenta de Administrador
                    </h4>
                    <button
                        type="button"
                        onClick={() => onGoToStep(1)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    >
                        <Edit3 size={12} /> Editar
                    </button>
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                        <span className="text-slate-500">Nombre: </span>
                        <span className="text-slate-900">{companyData.admin_name || '—'}</span>
                    </div>
                    <div>
                        <span className="text-slate-500">Email: </span>
                        <span className="text-slate-900">{companyData.admin_email || '—'}</span>
                    </div>
                    <div>
                        <span className="text-slate-500">Contraseña: </span>
                        <span className="text-slate-900">••••••••</span>
                    </div>
                </div>
            </div>

            {/* Optional steps summary */}
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-1 flex items-center justify-between">
                        <ImageIcon size={16} className={hasLogo || hasLogoIcon ? 'text-green-500' : 'text-slate-400'} />
                        <button type="button" onClick={() => onGoToStep(2)} className="text-xs text-blue-600 hover:text-blue-700">
                            <Edit3 size={12} />
                        </button>
                    </div>
                    <p className="text-xs text-slate-700">Logos</p>
                    <p className="text-xs text-slate-500">
                        {hasLogo && hasLogoIcon ? 'Ambos logos' : hasLogo ? 'Logo horizontal' : hasLogoIcon ? 'Ícono' : 'No configurado'}
                    </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-1 flex items-center justify-between">
                        <Package size={16} className={productsCount > 0 ? 'text-green-500' : 'text-slate-400'} />
                        <button type="button" onClick={() => onGoToStep(3)} className="text-xs text-blue-600 hover:text-blue-700">
                            <Edit3 size={12} />
                        </button>
                    </div>
                    <p className="text-xs text-slate-700">Productos</p>
                    <p className="text-xs text-slate-500">
                        {productsCount > 0 ? `${productsCount} producto(s)` : 'No configurado'}
                    </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-1 flex items-center justify-between">
                        <FileText size={16} className={hasDianConfig ? 'text-green-500' : 'text-slate-400'} />
                        <button type="button" onClick={() => onGoToStep(4)} className="text-xs text-blue-600 hover:text-blue-700">
                            <Edit3 size={12} />
                        </button>
                    </div>
                    <p className="text-xs text-slate-700">DIAN</p>
                    <p className="text-xs text-slate-500">
                        {hasDianConfig ? 'Configurado' : 'No configurado'}
                    </p>
                </div>
            </div>

            {/* Terms */}
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => onAcceptTermsChange(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500/50"
                />
                <span className="text-sm text-slate-600">
                    Acepto los términos y condiciones de uso de Legal Sistema y la política de privacidad.
                    Entiendo que esta es una prueba gratuita de 30 días.
                </span>
            </label>

            {/* Submit button */}
            <button
                type="button"
                onClick={onSubmit}
                disabled={!acceptTerms || isSubmitting}
                className="group flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
                {isSubmitting ? (
                    <>
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Creando tu empresa...
                    </>
                ) : (
                    <>
                        <Sparkles size={18} />
                        Crear mi empresa y comenzar prueba gratis
                    </>
                )}
            </button>
        </div>
    );
}
