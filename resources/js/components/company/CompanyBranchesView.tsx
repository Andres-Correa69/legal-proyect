import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { router } from "@inertiajs/react";
import {
  MapPin,
  Search,
  Phone,
  Mail,
  Globe,
  Shield,
  Building2,
  ExternalLink,
  FileText,
  Upload,
  Trash2,
  Loader2,
  Eye,
  Hash,
} from "lucide-react";
import { companiesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Company, Branch } from "@/types";

interface Props {
  company: Company;
}

export function CompanyBranchesView({ company }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [rutUploading, setRutUploading] = useState<number | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const { toast } = useToast();
  const branches = company.branches || [];

  const filteredBranches = useMemo(() => {
    if (!searchTerm) return branches;
    const term = searchTerm.toLowerCase();
    return branches.filter(
      (b) =>
        b.name.toLowerCase().includes(term) ||
        b.code?.toLowerCase().includes(term) ||
        b.city?.toLowerCase().includes(term) ||
        b.email?.toLowerCase().includes(term)
    );
  }, [branches, searchTerm]);

  const activeBranches = branches.filter((b) => b.is_active).length;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Stats + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {branches.length} sucursale{branches.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            {activeBranches} activas
          </Badge>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar sucursal..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Branch List */}
      {filteredBranches.length === 0 ? (
        <Card className="p-8">
          <p className="text-center text-muted-foreground">
            {searchTerm ? "No se encontraron sucursales con ese criterio" : "Esta empresa no tiene sucursales registradas"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBranches.map((branch) => (
            <div
              key={branch.id}
              className="border-2 border-border rounded-lg p-4 bg-card hover:bg-accent/5 transition-colors shadow-sm"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-sm">{branch.name}</h4>
                    {branch.is_main && (
                      <Badge className="bg-primary text-primary-foreground text-[10px] h-5">
                        PRINCIPAL
                      </Badge>
                    )}
                    <Badge
                      variant={branch.is_active ? "default" : "secondary"}
                      className={branch.is_active ? "bg-green-500/100 text-[10px] h-5" : "text-[10px] h-5"}
                    >
                      {branch.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                    {branch.electronic_invoicing_registered && (
                      <Badge variant="outline" className="text-[10px] h-5">
                        <Globe className="h-3 w-3 mr-1" />
                        FE
                      </Badge>
                    )}
                  </div>

                  {branch.code && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Código: {branch.code}
                    </p>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    {branch.address && (
                      <div>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Dirección
                        </p>
                        <p className="text-xs font-medium">{branch.address}</p>
                      </div>
                    )}
                    {branch.city && (
                      <div>
                        <p className="text-[10px] text-muted-foreground">Ciudad</p>
                        <p className="text-xs font-medium">
                          {branch.city}{branch.state ? `, ${branch.state}` : ""}
                        </p>
                      </div>
                    )}
                    {branch.phone && (
                      <div>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" /> Teléfono
                        </p>
                        <p className="text-xs font-medium">{branch.phone}</p>
                      </div>
                    )}
                    {branch.email && (
                      <div>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" /> Email
                        </p>
                        <p className="text-xs font-medium truncate">{branch.email}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" /> RUT
                      </p>
                      {branch.rut_url ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <a
                            href={branch.rut_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Ver RUT
                          </a>
                          <button
                            className="text-destructive hover:text-destructive/80"
                            title="Eliminar RUT"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!confirm("¿Eliminar el RUT de esta sede?")) return;
                              try {
                                await companiesApi.deleteBranchRut(branch.id);
                                branch.rut_url = null;
                                toast({ title: "RUT eliminado" });
                                window.location.reload();
                              } catch { toast({ title: "Error al eliminar", variant: "destructive" }); }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="mt-0.5">
                          <label className="text-xs text-primary hover:underline cursor-pointer flex items-center gap-1">
                            {rutUploading === branch.id ? (
                              <><Loader2 className="h-3 w-3 animate-spin" /> Subiendo...</>
                            ) : (
                              <><Upload className="h-3 w-3" /> Subir RUT</>
                            )}
                            <input
                              type="file"
                              accept="application/pdf"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setRutUploading(branch.id);
                                try {
                                  await companiesApi.uploadBranchRut(branch.id, file);
                                  toast({ title: "RUT subido correctamente" });
                                  window.location.reload();
                                } catch { toast({ title: "Error al subir RUT", variant: "destructive" }); }
                                finally { setRutUploading(null); }
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 h-8"
                    onClick={() => setSelectedBranch(branch)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Ver
                  </Button>
                  <div className="hidden sm:block text-right">
                    <p className="text-[10px] text-muted-foreground">Creada</p>
                    <p className="text-xs font-medium">{formatDate(branch.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Branch Detail Modal */}
      <Dialog open={!!selectedBranch} onOpenChange={(open) => !open && setSelectedBranch(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {selectedBranch?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedBranch && (
            <div className="space-y-4">
              {/* Badges */}
              <div className="flex flex-wrap gap-1.5">
                {selectedBranch.is_main && (
                  <Badge className="bg-primary text-primary-foreground">Principal</Badge>
                )}
                <Badge variant={selectedBranch.is_active ? "default" : "secondary"} className={selectedBranch.is_active ? "bg-green-500/100" : ""}>
                  {selectedBranch.is_active ? "Activa" : "Inactiva"}
                </Badge>
                {selectedBranch.electronic_invoicing_registered && (
                  <Badge variant="outline"><Globe className="h-3 w-3 mr-1" />Facturación Electrónica</Badge>
                )}
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedBranch.code && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3" /> Código</p>
                    <p className="text-sm font-medium">{selectedBranch.code}</p>
                  </div>
                )}
                {selectedBranch.address && (
                  <div className="p-3 rounded-lg bg-muted/30 col-span-2">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Dirección</p>
                    <p className="text-sm font-medium">{selectedBranch.address}</p>
                  </div>
                )}
                {selectedBranch.city && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-[10px] text-muted-foreground">Ciudad</p>
                    <p className="text-sm font-medium">{selectedBranch.city}{selectedBranch.state ? `, ${selectedBranch.state}` : ""}</p>
                  </div>
                )}
                {selectedBranch.phone && (
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Teléfono</p>
                    <p className="text-sm font-medium">{selectedBranch.phone}</p>
                  </div>
                )}
                {selectedBranch.email && (
                  <div className="p-3 rounded-lg bg-muted/30 col-span-2">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</p>
                    <p className="text-sm font-medium">{selectedBranch.email}</p>
                  </div>
                )}
              </div>

              {/* RUT Section */}
              <div className="border-t pt-4">
                <p className="text-sm font-medium flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  RUT de la sede
                </p>
                {selectedBranch.rut_url ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                    <FileText className="h-8 w-8 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">RUT cargado</p>
                      <a href={selectedBranch.rut_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                        Ver PDF
                      </a>
                    </div>
                    <div className="flex gap-1">
                      <label className="cursor-pointer">
                        <Button variant="outline" size="sm" className="gap-1 pointer-events-none" disabled={rutUploading === selectedBranch.id}>
                          {rutUploading === selectedBranch.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                          Reemplazar
                        </Button>
                        <input type="file" accept="application/pdf" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !selectedBranch) return;
                          setRutUploading(selectedBranch.id);
                          try {
                            await companiesApi.uploadBranchRut(selectedBranch.id, file);
                            toast({ title: "RUT actualizado" });
                            window.location.reload();
                          } catch { toast({ title: "Error al subir", variant: "destructive" }); }
                          finally { setRutUploading(null); }
                        }} />
                      </label>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={async () => {
                        if (!selectedBranch || !confirm("¿Eliminar el RUT?")) return;
                        try {
                          await companiesApi.deleteBranchRut(selectedBranch.id);
                          setSelectedBranch({ ...selectedBranch, rut_url: null });
                          toast({ title: "RUT eliminado" });
                        } catch { toast({ title: "Error al eliminar", variant: "destructive" }); }
                      }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                    {rutUploading === selectedBranch.id ? (
                      <><Loader2 className="h-6 w-6 text-primary animate-spin" /><p className="text-sm text-muted-foreground">Subiendo...</p></>
                    ) : (
                      <><Upload className="h-6 w-6 text-muted-foreground" /><p className="text-sm text-muted-foreground">Click para subir el RUT (PDF)</p></>
                    )}
                    <input type="file" accept="application/pdf" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !selectedBranch) return;
                      setRutUploading(selectedBranch.id);
                      try {
                        await companiesApi.uploadBranchRut(selectedBranch.id, file);
                        toast({ title: "RUT subido correctamente" });
                        window.location.reload();
                      } catch { toast({ title: "Error al subir RUT", variant: "destructive" }); }
                      finally { setRutUploading(null); }
                    }} />
                  </label>
                )}
              </div>

              {/* Created date */}
              <div className="text-xs text-muted-foreground text-right border-t pt-3">
                Creada el {formatDate(selectedBranch.created_at)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
