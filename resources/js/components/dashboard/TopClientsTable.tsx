import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { DashboardTopClient } from "@/lib/api";

const formatCurrency = (value: number) => {
  return `$ ${value.toLocaleString("es-CO")}`;
};

interface TopClientsTableProps {
  clients?: DashboardTopClient[];
}

export function TopClientsTable({ clients = [] }: TopClientsTableProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Mejores Clientes</CardTitle>
            <CardDescription>Por facturación total</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            Top {clients.length || 5}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {clients.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No hay datos de clientes disponibles
          </p>
        ) : (
          <div className="overflow-x-auto">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs font-medium text-muted-foreground border-b min-w-[500px]">
              <div className="col-span-5">Cliente</div>
              <div className="col-span-3 text-right">Facturado</div>
              <div className="col-span-2 text-center">Visitas</div>
              <div className="col-span-2 text-right">Última visita</div>
            </div>

            {/* Table Body */}
            <div className="divide-y min-w-[500px]">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="grid grid-cols-12 gap-4 px-3 py-4 items-center hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="col-span-5 flex items-center gap-3">
                    <Avatar className="h-10 w-10 bg-purple-500/15">
                      <AvatarFallback className="bg-purple-500/15 text-purple-700 text-sm font-medium">
                        {client.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{client.name}</p>
                      <p className="text-xs text-muted-foreground">{client.email}</p>
                    </div>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="font-semibold text-emerald-600 text-sm">
                      {formatCurrency(client.totalBilled)}
                    </span>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <Badge variant="secondary" className="bg-slate-700 text-white hover:bg-slate-700">
                      {client.visits}
                    </Badge>
                  </div>
                  <div className="col-span-2 text-right text-sm text-muted-foreground">
                    {client.lastVisit}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
