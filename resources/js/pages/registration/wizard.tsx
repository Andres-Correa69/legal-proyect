import { useState, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, SkipForward, CheckCircle2 } from 'lucide-react';
import { StepCompanyInfo } from '@/components/registration/step-company-info';
import { StepPersonalize } from '@/components/registration/step-personalize';
import { StepProducts } from '@/components/registration/step-products';
import { StepDianConfig } from '@/components/registration/step-dian-config';
import { StepWhatsNext } from '@/components/registration/step-whats-next';
import { StepReview } from '@/components/registration/step-review';

const TOTAL_STEPS = 6;

const stepLabels = [
    'Datos de empresa',
    'Personalizar',
    'Productos',
    'DIAN',
    'Que te espera',
    'Revisión',
];

const skippableSteps = new Set([2, 3, 4, 5]);

// Generate a unique registration token for temp file uploads
function generateToken(): string {
    return crypto.randomUUID?.() ?? Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export default function RegistrationWizard() {
    const [currentStep, setCurrentStep] = useState(1);
    const [registrationToken] = useState(() => generateToken());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isParsingRut, setIsParsingRut] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [createdData, setCreatedData] = useState<{ company_name: string; admin_email: string } | null>(null);

    // Step 1: Company Info
    const [companyData, setCompanyData] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        tax_id: '',
        city: '',
        department: '',
        admin_name: '',
        admin_email: '',
        admin_password: '',
        admin_password_confirmation: '',
    });

    // Step 2: Logos
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoIconFile, setLogoIconFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState('');
    const [logoIconPreview, setLogoIconPreview] = useState('');
    const [tempLogoPaths, setTempLogoPaths] = useState({ logo: '', icon: '' });

    // Step 3: Products
    const [products, setProducts] = useState<Array<{
        name: string;
        price: string;
        cost: string;
        sku: string;
        type: 'product' | 'service';
        description: string;
        tax_rate: string;
    }>>([]);

    // Step 4: DIAN Config
    const [dianConfig, setDianConfig] = useState({
        electronic_invoicing_token: '',
        ei_type_document_identification_id: '',
        ei_type_organization_id: '',
        ei_type_regime_id: '',
        ei_type_liability_id: '',
        ei_municipality_id: '',
        ei_business_name: '',
        ei_address: '',
        ei_phone: '',
        ei_email: '',
    });

    // Step 6: Terms
    const [acceptTerms, setAcceptTerms] = useState(false);

    const handleParseRut = useCallback(async (file: File) => {
        setIsParsingRut(true);
        try {
            const formData = new FormData();
            formData.append('rut_file', file);

            const csrfRes = await fetch('/sanctum/csrf-cookie', { method: 'GET', credentials: 'include' });
            const csrfToken = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];

            const res = await fetch('/api/registration/parse-rut', {
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
                const rut = data.data;
                setCompanyData((prev) => ({
                    ...prev,
                    name: rut.business_name || rut.trade_name || rut.name || prev.name,
                    tax_id: rut.tax_id || rut.nit || prev.tax_id,
                    email: rut.email || prev.email,
                    phone: rut.phone || prev.phone,
                    address: rut.address || prev.address,
                    city: rut.city || prev.city,
                    department: rut.department || prev.department,
                }));
            }
        } catch {
            // Silently handle - user can fill manually
        } finally {
            setIsParsingRut(false);
        }
    }, []);

    const validateStep1 = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!companyData.name.trim()) newErrors.name = 'El nombre es obligatorio';
        if (!companyData.admin_name.trim()) newErrors.admin_name = 'El nombre del administrador es obligatorio';
        if (!companyData.admin_email.trim()) newErrors.admin_email = 'El correo es obligatorio';
        if (!companyData.admin_password) newErrors.admin_password = 'La contraseña es obligatoria';
        else if (companyData.admin_password.length < 8) newErrors.admin_password = 'Mínimo 8 caracteres';
        if (companyData.admin_password !== companyData.admin_password_confirmation) {
            newErrors.admin_password = 'Las contraseñas no coinciden';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (currentStep === 1 && !validateStep1()) return;
        if (currentStep < TOTAL_STEPS) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePrev = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSkip = () => {
        if (skippableSteps.has(currentStep) && currentStep < TOTAL_STEPS) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleGoToStep = (step: number) => {
        setCurrentStep(step);
    };

    const uploadTempLogo = async (file: File, type: 'logo' | 'logo_icon'): Promise<string> => {
        const formData = new FormData();
        formData.append(type === 'logo' ? 'logo' : 'logo_icon', file);
        formData.append('registration_token', registrationToken);

        const csrfToken = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];
        const endpoint = type === 'logo' ? '/api/registration/upload-logo' : '/api/registration/upload-logo-icon';

        const res = await fetch(endpoint, {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                ...(csrfToken ? { 'X-XSRF-TOKEN': decodeURIComponent(csrfToken) } : {}),
            },
        });

        const data = await res.json();
        return data.data?.path ?? '';
    };

    const handleSubmit = async () => {
        if (!acceptTerms || isSubmitting) return;
        setIsSubmitting(true);

        try {
            // Upload logos if any
            let tempLogoPath = tempLogoPaths.logo;
            let tempLogoIconPath = tempLogoPaths.icon;

            if (logoFile && !tempLogoPath) {
                tempLogoPath = await uploadTempLogo(logoFile, 'logo');
            }
            if (logoIconFile && !tempLogoIconPath) {
                tempLogoIconPath = await uploadTempLogo(logoIconFile, 'logo_icon');
            }

            // Build products payload
            const validProducts = products
                .filter((p) => p.name.trim() && p.price)
                .map((p) => ({
                    name: p.name,
                    price: parseFloat(p.price) || 0,
                    cost: parseFloat(p.cost) || 0,
                    sku: p.sku || null,
                    type: p.type,
                    description: p.description || null,
                    tax_rate: parseFloat(p.tax_rate) || 0,
                }));

            // Build DIAN config payload
            const hasDian = Object.values(dianConfig).some((v) => v !== '');
            const dianPayload = hasDian
                ? Object.fromEntries(
                      Object.entries(dianConfig).filter(([, v]) => v !== '')
                  )
                : null;

            // CSRF
            await fetch('/sanctum/csrf-cookie', { method: 'GET', credentials: 'include' });
            const csrfToken = document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1];

            const res = await fetch('/api/registration/complete', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...(csrfToken ? { 'X-XSRF-TOKEN': decodeURIComponent(csrfToken) } : {}),
                },
                body: JSON.stringify({
                    name: companyData.name,
                    email: companyData.email || null,
                    phone: companyData.phone || null,
                    address: companyData.address || null,
                    tax_id: companyData.tax_id || null,
                    admin_name: companyData.admin_name,
                    admin_email: companyData.admin_email,
                    admin_password: companyData.admin_password,
                    admin_password_confirmation: companyData.admin_password_confirmation,
                    registration_token: registrationToken,
                    temp_logo_path: tempLogoPath || null,
                    temp_logo_icon_path: tempLogoIconPath || null,
                    products: validProducts.length > 0 ? validProducts : null,
                    dian_config: dianPayload,
                    website: '', // honeypot
                }),
            });

            const data = await res.json();

            if (data.success) {
                setSubmitSuccess(true);
                setCreatedData({
                    company_name: data.data?.company_name ?? companyData.name,
                    admin_email: data.data?.admin_email ?? companyData.admin_email,
                });
            } else {
                setErrors({ submit: data.message || 'Error al crear la empresa' });
            }
        } catch {
            setErrors({ submit: 'Error de conexión. Por favor, intenta de nuevo.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Success screen
    if (submitSuccess && createdData) {
        return (
            <>
                <Head title="Empresa creada - Legal Sistema" />
                <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/60 to-white px-4">
                    <div className="w-full max-w-md text-center">
                        <div className="rounded-xl border border-green-200 bg-white p-8 shadow-lg">
                            <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
                            <h2 className="text-2xl font-bold text-slate-900">¡Empresa creada!</h2>
                            <p className="mt-2 text-slate-600">Tu prueba gratuita de 30 días ha comenzado</p>

                            <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-left">
                                <p className="text-sm text-slate-500">Empresa:</p>
                                <p className="font-medium text-slate-900">{createdData.company_name}</p>
                                <p className="mt-2 text-sm text-slate-500">Email de acceso:</p>
                                <p className="font-medium text-slate-900">{createdData.admin_email}</p>
                            </div>

                            <a
                                href="/login"
                                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-all hover:bg-blue-700"
                            >
                                Iniciar Sesión
                                <ArrowRight size={18} />
                            </a>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Head title="Registra tu empresa - Legal Sistema" />

            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/60 to-white">
                {/* Grid pattern */}
                <div
                    className="pointer-events-none fixed inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(0,0,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.3) 1px, transparent 1px)`,
                        backgroundSize: '60px 60px',
                    }}
                />

                {/* Header + Progress bar sticky */}
                <div className="sticky top-0 z-40">
                    {/* Header */}
                    <div className="border-b border-slate-200/80 bg-white/70 backdrop-blur-2xl shadow-sm">
                        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
                            <a href="/" className="flex items-center">
                                <span className="text-xl font-bold text-slate-900">Legal Sistema</span>
                            </a>
                            <a href="/login" className="text-sm text-slate-500 hover:text-slate-900">
                                Ya tengo cuenta
                            </a>
                        </div>
                    </div>

                    {/* Progress bar */}
                    <div className="border-b border-slate-200/80 bg-white/50 backdrop-blur-2xl">
                        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between gap-2">
                            {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((step) => (
                                <div key={step} className="flex flex-1 items-center gap-2">
                                    <button
                                        onClick={() => step < currentStep && handleGoToStep(step)}
                                        disabled={step > currentStep}
                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                                            step === currentStep
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                                : step < currentStep
                                                  ? 'cursor-pointer bg-green-100 text-green-600 hover:bg-green-200'
                                                  : 'bg-slate-100 text-slate-400'
                                        }`}
                                    >
                                        {step < currentStep ? (
                                            <CheckCircle2 size={16} />
                                        ) : (
                                            step
                                        )}
                                    </button>
                                    <span className={`hidden text-xs lg:inline ${step === currentStep ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                                        {stepLabels[step - 1]}
                                    </span>
                                    {step < TOTAL_STEPS && (
                                        <div className={`h-px flex-1 ${step < currentStep ? 'bg-green-300' : 'bg-slate-200'}`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    </div>
                </div>

                {/* Main content */}
                <div className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6">
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                        {/* Step title */}
                        <div className="mb-6">
                            <p className="text-xs font-medium uppercase tracking-wider text-blue-600">
                                Paso {currentStep} de {TOTAL_STEPS}
                            </p>
                            <h2 className="mt-1 text-xl font-bold text-slate-900">
                                {stepLabels[currentStep - 1]}
                            </h2>
                        </div>

                        {/* Step content */}
                        {currentStep === 1 && (
                            <StepCompanyInfo
                                data={companyData}
                                onChange={setCompanyData}
                                onParseRut={handleParseRut}
                                errors={errors}
                                isParsingRut={isParsingRut}
                            />
                        )}
                        {currentStep === 2 && (
                            <StepPersonalize
                                logoFile={logoFile}
                                logoIconFile={logoIconFile}
                                logoPreview={logoPreview}
                                logoIconPreview={logoIconPreview}
                                onLogoChange={(file, preview) => { setLogoFile(file); setLogoPreview(preview); }}
                                onLogoIconChange={(file, preview) => { setLogoIconFile(file); setLogoIconPreview(preview); }}
                            />
                        )}
                        {currentStep === 3 && (
                            <StepProducts products={products} onChange={setProducts} />
                        )}
                        {currentStep === 4 && (
                            <StepDianConfig data={dianConfig} onChange={setDianConfig} />
                        )}
                        {currentStep === 5 && <StepWhatsNext />}
                        {currentStep === 6 && (
                            <StepReview
                                companyData={companyData}
                                hasLogo={!!logoFile}
                                hasLogoIcon={!!logoIconFile}
                                productsCount={products.filter((p) => p.name.trim()).length}
                                hasDianConfig={Object.values(dianConfig).some((v) => v !== '')}
                                acceptTerms={acceptTerms}
                                onAcceptTermsChange={setAcceptTerms}
                                onGoToStep={handleGoToStep}
                                onSubmit={handleSubmit}
                                isSubmitting={isSubmitting}
                            />
                        )}

                        {/* Error message */}
                        {errors.submit && (
                            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                                <p className="text-sm text-red-600">{errors.submit}</p>
                            </div>
                        )}

                        {/* Navigation */}
                        {currentStep < 6 && (
                            <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
                                <button
                                    type="button"
                                    onClick={handlePrev}
                                    disabled={currentStep === 1}
                                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-slate-500 transition-colors hover:text-slate-900 disabled:invisible"
                                >
                                    <ArrowLeft size={16} /> Anterior
                                </button>

                                <div className="flex items-center gap-3">
                                    {skippableSteps.has(currentStep) && (
                                        <button
                                            type="button"
                                            onClick={handleSkip}
                                            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
                                        >
                                            <SkipForward size={14} /> Omitir
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleNext}
                                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-all hover:bg-blue-700"
                                    >
                                        Siguiente <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
