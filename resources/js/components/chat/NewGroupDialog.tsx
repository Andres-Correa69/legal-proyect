import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { Users } from "lucide-react";
import type { ChatContact } from "@/types";

interface NewGroupDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contacts: ChatContact[];
    onCreateGroup: (name: string, participantIds: number[], description?: string) => Promise<void>;
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export function NewGroupDialog({ open, onOpenChange, contacts, onCreateGroup }: NewGroupDialogProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    const toggleContact = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    const handleCreate = async () => {
        if (!name.trim() || selectedIds.length === 0) return;
        setIsCreating(true);
        try {
            await onCreateGroup(name.trim(), selectedIds, description.trim() || undefined);
            setName("");
            setDescription("");
            setSelectedIds([]);
            onOpenChange(false);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-[hsl(var(--billing-primary))]" />
                        Crear grupo
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="group-name">Nombre del grupo</Label>
                        <Input
                            id="group-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Equipo de ventas"
                            disabled={isCreating}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="group-desc">Descripcion (opcional)</Label>
                        <Input
                            id="group-desc"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descripcion del grupo"
                            disabled={isCreating}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Participantes ({selectedIds.length} seleccionados)</Label>
                        <div className="max-h-48 overflow-y-auto border rounded-lg">
                            {contacts.map((contact) => (
                                <label
                                    key={contact.id}
                                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                                >
                                    <Checkbox
                                        checked={selectedIds.includes(contact.id)}
                                        onCheckedChange={() => toggleContact(contact.id)}
                                        disabled={isCreating}
                                    />
                                    <Avatar className="h-7 w-7 shrink-0">
                                        <AvatarImage src={contact.avatar_url || ""} />
                                        <AvatarFallback className="text-[10px] bg-muted">
                                            {getInitials(contact.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm truncate">{contact.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {contact.roles?.[0]?.name || "Usuario"}
                                        </p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreate}
                            disabled={!name.trim() || selectedIds.length === 0 || isCreating}
                        >
                            {isCreating ? <Spinner className="mr-2 h-4 w-4" /> : null}
                            Crear grupo
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
