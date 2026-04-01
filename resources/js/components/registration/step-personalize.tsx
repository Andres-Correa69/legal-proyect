import { useState, useCallback } from 'react';
import { Upload, ImageIcon, ToggleLeft, ToggleRight, X } from 'lucide-react';
import { removeBackground, createPreviewUrl, blobToFile } from '@/lib/background-removal';

interface StepPersonalizeProps {
    logoFile: File | null;
    logoIconFile: File | null;
    logoPreview: string;
    logoIconPreview: string;
    onLogoChange: (file: File | null, preview: string) => void;
    onLogoIconChange: (file: File | null, preview: string) => void;
}

export function StepPersonalize({
    logoFile,
    logoIconFile,
    logoPreview,
    logoIconPreview,
    onLogoChange,
    onLogoIconChange,
}: StepPersonalizeProps) {
    const [removeBgLogo, setRemoveBgLogo] = useState(true);
    const [removeBgIcon, setRemoveBgIcon] = useState(true);
    const [processingLogo, setProcessingLogo] = useState(false);
    const [processingIcon, setProcessingIcon] = useState(false);
    const [originalLogoPreview, setOriginalLogoPreview] = useState('');
    const [originalIconPreview, setOriginalIconPreview] = useState('');

    const processImage = useCallback(async (file: File, shouldRemoveBg: boolean): Promise<{ processedFile: File; preview: string }> => {
        if (shouldRemoveBg) {
            try {
                const processedBlob = await removeBackground(file);
                const processedFile = blobToFile(processedBlob, file.name.replace(/\.\w+$/, '.png'));
                const preview = createPreviewUrl(processedBlob);
                return { processedFile, preview };
            } catch {
                // Fallback to original
                const preview = URL.createObjectURL(file);
                return { processedFile: file, preview };
            }
        }
        const preview = URL.createObjectURL(file);
        return { processedFile: file, preview };
    }, []);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setOriginalLogoPreview(URL.createObjectURL(file));
        setProcessingLogo(true);
        try {
            const result = await processImage(file, removeBgLogo);
            onLogoChange(result.processedFile, result.preview);
        } finally {
            setProcessingLogo(false);
        }
    };

    const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setOriginalIconPreview(URL.createObjectURL(file));
        setProcessingIcon(true);
        try {
            const result = await processImage(file, removeBgIcon);
            onLogoIconChange(result.processedFile, result.preview);
        } finally {
            setProcessingIcon(false);
        }
    };

    const clearLogo = () => {
        onLogoChange(null, '');
        setOriginalLogoPreview('');
    };

    const clearIcon = () => {
        onLogoIconChange(null, '');
        setOriginalIconPreview('');
    };

    return (
        <div className="space-y-8">
            {/* Logo horizontal */}
            <div>
                <h3 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-900">
                    <ImageIcon size={18} className="text-blue-600" />
                    Logo Horizontal
                </h3>
                <p className="mb-3 text-xs text-slate-500">
                    El logo principal de tu empresa (recomendado: 400x120 px)
                </p>

                {/* Remove bg toggle */}
                <button
                    type="button"
                    onClick={() => setRemoveBgLogo(!removeBgLogo)}
                    className="mb-3 flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-slate-900"
                >
                    {removeBgLogo ? (
                        <ToggleRight size={20} className="text-blue-600" />
                    ) : (
                        <ToggleLeft size={20} className="text-slate-400" />
                    )}
                    Remover fondo automáticamente
                </button>

                {logoPreview ? (
                    <div className="space-y-3">
                        <div className="flex gap-4">
                            {originalLogoPreview && removeBgLogo && (
                                <div className="flex-1">
                                    <p className="mb-1 text-xs text-slate-500">Original</p>
                                    <div className="flex h-24 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-2">
                                        <img src={originalLogoPreview} alt="Original" className="max-h-full max-w-full object-contain" />
                                    </div>
                                </div>
                            )}
                            <div className="flex-1">
                                <p className="mb-1 text-xs text-slate-500">{removeBgLogo ? 'Sin fondo' : 'Vista previa'}</p>
                                <div className="flex h-24 items-center justify-center rounded-lg border border-slate-200 p-2" style={{ backgroundImage: 'repeating-conic-gradient(#e2e8f0 0% 25%, #f8fafc 0% 50%)', backgroundSize: '16px 16px' }}>
                                    <img src={logoPreview} alt="Logo" className="max-h-full max-w-full object-contain" />
                                </div>
                            </div>
                        </div>
                        <button onClick={clearLogo} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600">
                            <X size={14} /> Quitar logo
                        </button>
                    </div>
                ) : (
                    <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 transition-colors hover:border-blue-400 hover:bg-blue-50/50">
                        <Upload size={24} className="text-slate-400" />
                        <span className="text-sm text-blue-600">{processingLogo ? 'Procesando...' : 'Seleccionar imagen'}</span>
                        <span className="text-xs text-slate-500">PNG, JPG o SVG. Max 5MB</span>
                        <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={processingLogo} />
                    </label>
                )}
            </div>

            {/* Logo icon */}
            <div>
                <h3 className="mb-1 flex items-center gap-2 text-base font-semibold text-slate-900">
                    <ImageIcon size={18} className="text-blue-600" />
                    Ícono / Logo Cuadrado
                </h3>
                <p className="mb-3 text-xs text-slate-500">
                    Versión cuadrada para favicon y espacios pequeños (recomendado: 120x120 px)
                </p>

                <button
                    type="button"
                    onClick={() => setRemoveBgIcon(!removeBgIcon)}
                    className="mb-3 flex items-center gap-2 text-sm text-slate-600 transition-colors hover:text-slate-900"
                >
                    {removeBgIcon ? (
                        <ToggleRight size={20} className="text-blue-600" />
                    ) : (
                        <ToggleLeft size={20} className="text-slate-400" />
                    )}
                    Remover fondo automáticamente
                </button>

                {logoIconPreview ? (
                    <div className="space-y-3">
                        <div className="flex gap-4">
                            {originalIconPreview && removeBgIcon && (
                                <div>
                                    <p className="mb-1 text-xs text-slate-500">Original</p>
                                    <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-2">
                                        <img src={originalIconPreview} alt="Original" className="max-h-full max-w-full object-contain" />
                                    </div>
                                </div>
                            )}
                            <div>
                                <p className="mb-1 text-xs text-slate-500">{removeBgIcon ? 'Sin fondo' : 'Vista previa'}</p>
                                <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-slate-200 p-2" style={{ backgroundImage: 'repeating-conic-gradient(#e2e8f0 0% 25%, #f8fafc 0% 50%)', backgroundSize: '16px 16px' }}>
                                    <img src={logoIconPreview} alt="Ícono" className="max-h-full max-w-full object-contain" />
                                </div>
                            </div>
                        </div>
                        <button onClick={clearIcon} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600">
                            <X size={14} /> Quitar ícono
                        </button>
                    </div>
                ) : (
                    <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 p-6 transition-colors hover:border-blue-400 hover:bg-blue-50/50">
                        <Upload size={24} className="text-slate-400" />
                        <span className="text-sm text-blue-600">{processingIcon ? 'Procesando...' : 'Seleccionar imagen'}</span>
                        <span className="text-xs text-slate-500">PNG, JPG o SVG. Max 5MB</span>
                        <input type="file" accept="image/*" onChange={handleIconUpload} className="hidden" disabled={processingIcon} />
                    </label>
                )}
            </div>
        </div>
    );
}
