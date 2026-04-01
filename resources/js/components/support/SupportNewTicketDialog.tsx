import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Paperclip, X, FileText } from "lucide-react";

interface SupportNewTicketDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreateTicket: (subject: string, description: string, attachments?: File[]) => Promise<void>;
}

export function SupportNewTicketDialog({ open, onOpenChange, onCreateTicket }: SupportNewTicketDialogProps) {
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleCreate = async () => {
        if (!subject.trim() || !description.trim()) return;
        setIsCreating(true);
        try {
            await onCreateTicket(subject.trim(), description.trim(), attachments.length > 0 ? attachments : undefined);
            setSubject("");
            setDescription("");
            setAttachments([]);
            onOpenChange(false);
        } catch {
            // silently fail
        } finally {
            setIsCreating(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const remaining = 5 - attachments.length;
        const toAdd = files.slice(0, remaining);
        setAttachments((prev) => [...prev, ...toAdd]);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const removeAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) {
            setSubject("");
            setDescription("");
            setAttachments([]);
        }
        onOpenChange(isOpen);
    };

    const isImage = (file: File) => file.type.startsWith("image/");

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / 1048576).toFixed(1)} MB`;
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Nuevo ticket de soporte</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 overflow-hidden">
                    <div className="space-y-2">
                        <Label htmlFor="subject">Asunto</Label>
                        <Input
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Describe brevemente tu problema"
                            maxLength={255}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Descripcion</Label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe el problema con detalle..."
                            rows={4}
                            maxLength={5000}
                            className="w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                        />
                    </div>

                    {/* Attachments */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Adjuntos <span className="text-muted-foreground font-normal">(opcional, max 5)</span></Label>
                            {attachments.length < 5 && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1.5 text-xs"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Paperclip className="h-3.5 w-3.5" />
                                    Adjuntar archivo
                                </Button>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            multiple
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                            onChange={handleFileSelect}
                        />

                        {attachments.length > 0 && (
                            <div className="space-y-2">
                                {attachments.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-3 rounded-lg border bg-muted/30 p-2.5 overflow-hidden"
                                    >
                                        {isImage(file) ? (
                                            <div className="h-12 w-12 shrink-0 rounded-md overflow-hidden bg-muted">
                                                <img
                                                    src={URL.createObjectURL(file)}
                                                    alt={file.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted">
                                                <FileText className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0 overflow-hidden">
                                            <p className="text-sm font-medium truncate">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 shrink-0"
                                            onClick={() => removeAttachment(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => handleClose(false)} disabled={isCreating}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleCreate}
                        disabled={!subject.trim() || !description.trim() || isCreating}
                    >
                        {isCreating ? "Creando..." : "Crear ticket"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
