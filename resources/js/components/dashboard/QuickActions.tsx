import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Receipt,
  FileText,
  ArrowDownRight,
  ArrowUpRight,
  Users,
  Package,
  Calculator,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { router } from "@inertiajs/react";
import { cn } from "@/lib/utils";

interface QuickAction {
  label: string;
  icon: LucideIcon;
  path: string;
  primary?: boolean;
  variant: "primary" | "destructive" | "success" | "info" | "warning" | "muted";
}

const variantStyles = {
  primary: "text-primary",
  destructive: "text-destructive",
  success: "text-success",
  info: "text-info",
  warning: "text-warning",
  muted: "text-muted-foreground",
};

const actions: QuickAction[] = [
  {
    label: "Nueva Factura",
    icon: Receipt,
    path: "/admin/sell",
    primary: true,
    variant: "primary",
  },
  {
    label: "Nueva Cotización",
    icon: FileText,
    path: "/admin/sell",
    variant: "info",
  },
  {
    label: "Nota Crédito",
    icon: ArrowDownRight,
    path: "/admin/sales",
    variant: "destructive",
  },
  {
    label: "Nota Débito",
    icon: ArrowUpRight,
    path: "/admin/sales",
    variant: "success",
  },
  {
    label: "Nuevo Cliente",
    icon: Users,
    path: "/admin/clients/create",
    variant: "primary",
  },
  {
    label: "Nuevo Producto",
    icon: Package,
    path: "/admin/products/create",
    variant: "warning",
  },
  {
    label: "Abrir Caja",
    icon: Wallet,
    path: "/admin/cash-registers",
    variant: "info",
  },
  {
    label: "Calculadora IVA",
    icon: Calculator,
    path: "/admin/tools/calculator",
    variant: "warning",
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Acciones Rápidas</CardTitle>
        <CardDescription>Crea documentos y accede a funciones comunes</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.primary ? "default" : "outline"}
              className={cn(
                "h-auto py-3 flex-col gap-2",
                !action.primary && "hover:bg-muted/50"
              )}
              onClick={() => router.visit(action.path)}
            >
              <action.icon className={cn("h-5 w-5", !action.primary && variantStyles[action.variant])} />
              <span className="text-xs font-medium">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
