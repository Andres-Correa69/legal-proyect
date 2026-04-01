import { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle, Users } from "lucide-react";
import { googleCalendarApi, type GoogleContact } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface GoogleContactsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onImported: () => void;
}

export function GoogleContactsDialog({ open, onOpenChange, onImported }: GoogleContactsDialogProps) {
    const { toast } = useToast();
    const [contacts, setContacts] = useState<GoogleContact[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);

    const fetchContacts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await googleCalendarApi.getContacts();
            setContacts(data);
            const notImported = new Set(data.filter(c => !c.imported).map(c => c.resource_name));
            setSelected(notImported);
        } catch (err: any) {
            toast({ title: "Error", description: err?.message || "No se pudieron cargar los contactos.", variant: "destructive" });
            onOpenChange(false);
        } finally {
            setLoading(false);
        }
    }, [toast, onOpenChange]);

    useEffect(() => {
        if (open) {
            setContacts([]);
            setSelected(new Set());
            fetchContacts();
        }
    }, [open, fetchContacts]);

    const toggle = (resourceName: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(resourceName) ? next.delete(resourceName) : next.add(resourceName);
            return next;
        });
    };

    const toggleAll = () => {
        const notImported = contacts.filter(c => !c.imported);
        if (selected.size === notImported.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(notImported.map(c => c.resource_name)));
        }
    };

    const handleImport = async () => {
        if (selected.size === 0) return;
        setImporting(true);
        try {
            const toImport = contacts.filter(c => selected.has(c.resource_name));
            const result = await googleCalendarApi.importContacts(toImport);
            toast({ title: "Contactos importados", description: `${result.imported} contactos agregados como clientes.` });
            onImported();
            onOpenChange(false);
        } catch (err: any) {
            toast({ title: "Error", description: err?.message || "No se pudieron importar los contactos.", variant: "destructive" });
        } finally {
            setImporting(false);
        }
    };

    const notImported = contacts.filter(c => !c.imported);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg bg-card">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <svg viewBox="0 0 48 48" className="h-5 w-5" fill="none">
                            <path fill="#4285F4" d="M46.14 24.5c0-1.57-.14-3.08-.41-4.54H24v8.59h12.43c-.54 2.9-2.17 5.36-4.62 7.01v5.83h7.48c4.37-4.03 6.85-9.96 6.85-16.89z"/>
                            <path fill="#34A853" d="M24 48c6.48 0 11.92-2.15 15.89-5.81l-7.48-5.83c-2.08 1.4-4.74 2.22-8.41 2.22-6.47 0-11.96-4.37-13.92-10.24H2.39v6.02C6.34 42.57 14.59 48 24 48z"/>
                            <path fill="#FBBC05" d="M10.08 28.34A14.6 14.6 0 0 1 9.32 24c0-1.5.26-2.95.76-4.34v-6.02H2.39A23.97 23.97 0 0 0 0 24c0 3.87.93 7.53 2.39 10.36l7.69-6.02z"/>
                            <path fill="#EA4335" d="M24 9.52c3.65 0 6.92 1.26 9.5 3.72l7.12-7.12C36.91 2.38 31.47 0 24 0 14.59 0 6.34 5.43 2.39 13.64l7.69 6.02C12.04 13.89 17.53 9.52 24 9.52z"/>
                        </svg>
                        Importar contactos de Google
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">Cargando contactos...</p>
                    </div>
                ) : contacts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                        <Users className="h-10 w-10" />
                        <p className="text-sm">No se encontraron contactos en tu cuenta de Google.</p>
                    </div>
                ) : (
                    <>
                        {notImported.length > 0 && (
                            <div className="flex items-center justify-between px-1 pb-1">
                                <button className="text-sm text-[#2463eb] hover:underline" onClick={toggleAll}>
                                    {selected.size === notImported.length ? "Deseleccionar todos" : "Seleccionar todos"}
                                </button>
                                <span className="text-xs text-muted-foreground">{selected.size} seleccionados</span>
                            </div>
                        )}

                        <div className="max-h-[400px] overflow-y-auto -mx-2 px-2 space-y-1">
                            {contacts.map(contact => (
                                <label
                                    key={contact.resource_name}
                                    className={`flex items-center gap-3 py-2.5 px-2 rounded-md cursor-pointer transition-colors ${
                                        contact.imported
                                            ? "opacity-50 cursor-default"
                                            : selected.has(contact.resource_name)
                                            ? "bg-blue-500/10"
                                            : "hover:bg-muted/50"
                                    }`}
                                >
                                    {contact.imported ? (
                                        <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                                    ) : (
                                        <Checkbox
                                            checked={selected.has(contact.resource_name)}
                                            onCheckedChange={() => toggle(contact.resource_name)}
                                        />
                                    )}
                                    {contact.photo ? (
                                        <img src={contact.photo} alt={contact.name} className="h-8 w-8 rounded-full object-cover shrink-0" />
                                    ) : (
                                        <div className="h-8 w-8 rounded-full bg-[#4285F4]/20 flex items-center justify-center shrink-0">
                                            <span className="text-xs font-semibold text-[#4285F4]">
                                                {contact.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{contact.name}</p>
                                        {contact.email && (
                                            <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                                        )}
                                    </div>
                                    {contact.phone && (
                                        <span className="text-xs text-muted-foreground shrink-0">{contact.phone}</span>
                                    )}
                                </label>
                            ))}
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1 gap-2 bg-[#2463eb] hover:bg-[#1d4fc4]"
                                onClick={handleImport}
                                disabled={importing || selected.size === 0}
                            >
                                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
                                Importar {selected.size > 0 ? `(${selected.size})` : ""}
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
