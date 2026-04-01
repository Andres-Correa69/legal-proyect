import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { companiesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Company } from "@/types";
import {
  Wrench,
  Zap,
  Shield,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface Superpower {
  key: string;
  name: string;
  description: string;
  icon: typeof Wrench;
  color: string;
  bgColor: string;
  borderColor: string;
  features: string[];
}

const SUPERPOWERS: Superpower[] = [
  {
    key: "service_orders_enabled",
    name: "Ordenes de Servicio",
    description: "Gestiona ordenes de trabajo: reparaciones, mantenimiento, instalaciones y servicios tecnicos. Incluye seguimiento de estados, fotos antes/despues, asignacion de tecnicos y facturacion directa.",
    icon: Wrench,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-500/10",
    borderColor: "border-blue-200 dark:border-blue-500/20",
    features: [
      "Crear y gestionar ordenes de servicio",
      "Asignar tecnicos y prioridades",
      "Adjuntar fotos y diagnosticos",
      "Seguimiento de estados en tiempo real",
      "Convertir orden completada en factura",
      "Reportes y metricas de servicio",
    ],
  },
];

interface Props {
  company: Company;
  onUpdate: () => void;
}

export function CompanySuperpowersView({ company, onUpdate }: Props) {
  const { toast } = useToast();
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const isEnabled = (key: string): boolean => {
    return (company.settings as Record<string, any>)?.[key] === true;
  };

  const handleToggle = async (superpower: Superpower) => {
    const newValue = !isEnabled(superpower.key);
    setTogglingKey(superpower.key);
    try {
      await companiesApi.toggleSuperpower(company.id, superpower.key, newValue);
      toast({
        title: newValue ? "Superpoder activado" : "Superpoder desactivado",
        description: `${superpower.name} ha sido ${newValue ? "activado" : "desactivado"} para ${company.name}.`,
      });
      onUpdate();
    } catch {
      toast({
        title: "Error",
        description: "No se pudo actualizar el superpoder.",
        variant: "destructive",
      });
    } finally {
      setTogglingKey(null);
    }
  };

  const activeCount = SUPERPOWERS.filter((sp) => isEnabled(sp.key)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-violet-500/25">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Superpoderes</h2>
            <p className="text-sm text-muted-foreground">
              Modulos premium que amplian las capacidades de esta empresa
            </p>
          </div>
        </div>
        <Badge
          variant="secondary"
          className={activeCount > 0
            ? "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20"
            : ""
          }
        >
          {activeCount} de {SUPERPOWERS.length} activo{activeCount !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-muted/50 border border-border rounded-lg px-4 py-3">
        <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          Solo el <strong>Super Admin</strong> puede activar o desactivar superpoderes.
          Al activar un superpoder, los administradores de <strong>{company.name}</strong> podran
          asignar los permisos correspondientes a sus empleados desde la gestion de roles.
        </p>
      </div>

      {/* Superpowers list */}
      <div className="space-y-4">
        {SUPERPOWERS.map((sp) => {
          const Icon = sp.icon;
          const enabled = isEnabled(sp.key);
          const isToggling = togglingKey === sp.key;

          return (
            <Card
              key={sp.key}
              className={`transition-all duration-300 ${
                enabled
                  ? `${sp.borderColor} border-2 shadow-md`
                  : "border border-border"
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`p-3 rounded-xl shrink-0 ${sp.bgColor}`}>
                    <Icon className={`h-6 w-6 ${sp.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-bold text-foreground">{sp.name}</h3>
                      {enabled ? (
                        <Badge className="bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 text-[10px]">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactivo
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">{sp.description}</p>

                    {/* Features grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sp.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${enabled ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Toggle */}
                  <div className="shrink-0 flex flex-col items-center gap-1">
                    {isToggling ? (
                      <Spinner className="h-5 w-5" />
                    ) : (
                      <Switch
                        checked={enabled}
                        onCheckedChange={() => handleToggle(sp)}
                      />
                    )}
                    <span className="text-[10px] text-muted-foreground">
                      {enabled ? "Activado" : "Desactivado"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
