import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { router } from "@inertiajs/react";
import {
  Search,
  Eye,
  Phone,
  Mail,
  Users,
  Shield,
  Building2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { usersApi } from "@/lib/api";
import type { User } from "@/types";

interface Props {
  companyId: number;
}

const ROLE_COLORS: Record<string, string> = {
  "super-admin": "bg-red-500/100",
  admin: "bg-purple-600",
  employee: "bg-blue-500/100",
  cashier: "bg-amber-500/100",
  warehouse: "bg-teal-600",
};

const ITEMS_PER_PAGE = 10;

export function CompanyUsersView({ companyId }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    loadUsers();
  }, [companyId]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await usersApi.getAll();
      // Filter users by company_id client-side since the API might not support company_id filter
      const companyUsers = allUsers.filter((u) => u.company_id === companyId);
      setUsers(companyUsers);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const term = searchTerm.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.document_id?.toLowerCase().includes(term) ||
        u.phone?.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const activeUsers = users.filter((u) => u.is_active).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner className="mr-2" />
        <p className="text-muted-foreground">Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats + Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {users.length} usuario{users.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            {activeUsers} activos
          </Badge>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* User List */}
      {paginatedUsers.length === 0 ? (
        <Card className="p-8">
          <p className="text-center text-muted-foreground">
            {searchTerm ? "No se encontraron usuarios con ese criterio" : "Esta empresa no tiene usuarios registrados"}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {paginatedUsers.map((user) => (
            <div
              key={user.id}
              className="border-2 border-border rounded-lg p-3 sm:p-4 bg-card hover:bg-accent/5 transition-colors shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                {/* Avatar */}
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>

                {/* User Info */}
                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => router.visit(`/admin/users/${user.id}`)}
                    className="text-primary hover:text-primary/80 hover:underline font-semibold text-sm truncate block text-left"
                  >
                    {user.name}
                  </button>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge
                      variant={user.is_active ? "default" : "secondary"}
                      className={user.is_active ? "bg-green-500/100 text-[10px]" : "text-[10px]"}
                    >
                      {user.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                    {user.roles?.map((role) => (
                      <Badge
                        key={role.id}
                        variant="default"
                        className={`${ROLE_COLORS[role.slug] || "bg-muted/500"} text-white text-[10px]`}
                      >
                        {role.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Contact - desktop only */}
                <div className="hidden lg:block flex-shrink-0 w-40">
                  <p className="text-xs text-muted-foreground">Contacto</p>
                  {user.phone && (
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {user.phone}
                    </p>
                  )}
                  {user.document_id && (
                    <p className="text-xs text-muted-foreground mt-0.5">Doc: {user.document_id}</p>
                  )}
                </div>

                {/* Branch - desktop only */}
                <div className="hidden xl:block flex-shrink-0 w-32">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> Sucursal
                  </p>
                  <p className="text-sm font-medium truncate">{user.branch?.name || "Sin asignar"}</p>
                </div>

                {/* Actions */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.visit(`/admin/users/${user.id}`)}
                  className="h-9 px-3 gap-1 flex-shrink-0"
                >
                  <Eye className="h-4 w-4" />
                  <span className="hidden sm:inline">Ver</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {filteredUsers.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredUsers.length)} de{" "}
            {filteredUsers.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              {safePage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="gap-1"
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
