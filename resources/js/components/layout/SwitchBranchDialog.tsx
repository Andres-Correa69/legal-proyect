import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { branchesApi, type Branch } from "@/lib/api";
import { Building2, MapPin } from "lucide-react";
import type { User } from "@/types";

interface SwitchBranchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User;
}

export function SwitchBranchDialog({ open, onOpenChange, user }: SwitchBranchDialogProps) {
  const { toast } = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedBranchId("");
      loadBranches();
    }
  }, [open]);

  const loadBranches = async () => {
    setLoading(true);
    try {
      const data = await branchesApi.getAll();
      setBranches(data.filter((b) => b.is_active));
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar las sedes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async () => {
    if (!selectedBranchId) return;
    setSwitching(true);
    try {
      const result = await branchesApi.switchBranch(Number(selectedBranchId));
      toast({ title: "Sede cambiada", description: result.message });
      onOpenChange(false);
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "No se pudo cambiar la sede",
        variant: "destructive",
      });
    } finally {
      setSwitching(false);
    }
  };

  const currentBranch = user?.branch;
  const availableBranches = branches.filter((b) => b.id !== user?.branch_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Cambiar sede</DialogTitle>
          <DialogDescription>Selecciona la sede a la que deseas cambiar</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Current branch */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Sede actual</p>
              <p className="text-sm font-medium truncate">
                {currentBranch?.name || "Sin sede asignada"}
              </p>
            </div>
            {currentBranch && (
              <Badge variant="outline" className="ml-auto shrink-0 text-xs">Activa</Badge>
            )}
          </div>

          {/* Branch selector */}
          {loading ? (
            <div className="flex justify-center py-6">
              <Spinner className="h-6 w-6" />
            </div>
          ) : availableBranches.length === 0 ? (
            <div className="text-center py-6">
              <MapPin className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No hay otras sedes disponibles</p>
            </div>
          ) : (
            <div>
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sede" />
                </SelectTrigger>
                <SelectContent className="bg-card z-50">
                  {availableBranches.map((branch) => (
                    <SelectItem key={branch.id} value={String(branch.id)}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={switching}>
              Cancelar
            </Button>
            <Button
              onClick={handleSwitch}
              disabled={!selectedBranchId || switching}
            >
              {switching && <Spinner className="mr-2 h-4 w-4" />}
              Cambiar sede
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
