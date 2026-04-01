import { useState, useEffect, useMemo, useCallback } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "@/components/ui/spinner";
import { rolesApi, permissionsApi } from "@/lib/api";
import type { RoleWithPermissions } from "@/lib/api";
import type { Permission, SharedData } from "@/types";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Shield,
  Info,
  Key,
  Users,
  Loader2,
  Pencil,
  Save,
  X,
  Search,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Building2,
  Hash,
  FileText,
  Tag,
} from "lucide-react";

const ROLE_COLORS: Record<string, { bg: string; icon: string; border: string }> = {
  "super-admin": { bg: "bg-red-500/10", icon: "text-red-600", border: "border-red-200" },
  "admin": { bg: "bg-indigo-500/10", icon: "text-indigo-600", border: "border-indigo-200" },
  "employee": { bg: "bg-emerald-500/10", icon: "text-emerald-600", border: "border-emerald-200" },
  "cashier": { bg: "bg-amber-500/10", icon: "text-amber-600", border: "border-amber-200" },
  "warehouse": { bg: "bg-cyan-500/10", icon: "text-cyan-600", border: "border-cyan-200" },
  "client": { bg: "bg-violet-500/10", icon: "text-violet-600", border: "border-violet-200" },
  "technician": { bg: "bg-orange-500/10", icon: "text-orange-600", border: "border-orange-200" },
};

const DEFAULT_ROLE_COLOR = { bg: "bg-primary/10", icon: "text-primary", border: "border-primary/20" };

const SYSTEM_ROLE_SLUGS = ["super-admin", "employee", "client", "technician"];

// Permission groups that require a superpower to be enabled
const SUPERPOWER_PERMISSION_GROUPS: Record<string, string> = {
  "service-orders": "service_orders_enabled",
};

function getRoleColor(slug: string) {
  return ROLE_COLORS[slug] || DEFAULT_ROLE_COLOR;
}

const tabs = [
  { id: "info", label: "Información", icon: Info },
  { id: "permissions", label: "Permisos", icon: Key },
  { id: "users", label: "Usuarios", icon: Users },
];

export default function RoleShow({ roleId }: { roleId: number }) {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const userIsSuperAdmin = isSuperAdmin(user);
  const canManage = hasPermission("roles.manage", user);
  const { toast } = useToast();

  const [role, setRole] = useState<RoleWithPermissions | null>(null);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");

  // Info tab - edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saving, setSaving] = useState(false);

  // Permissions tab
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [permissionSearch, setPermissionSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [savingPermissions, setSavingPermissions] = useState(false);

  const isSystemRole = useMemo(() => {
    if (!role) return false;
    return SYSTEM_ROLE_SLUGS.includes(role.slug);
  }, [role]);

  const roleColor = useMemo(() => {
    if (!role) return DEFAULT_ROLE_COLOR;
    return getRoleColor(role.slug);
  }, [role]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [roleData, permissionsData] = await Promise.all([
        rolesApi.getById(roleId),
        permissionsApi.getAll(),
      ]);
      setRole(roleData);
      setAllPermissions(permissionsData);
      setSelectedPermissions(roleData.permissions?.map((p) => p.id) || []);
    } catch (err) {
      console.error("Error loading role data:", err);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del rol.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Group permissions by their group field, filtering out superpower groups if not enabled
  const companySettings = (user.company?.settings ?? {}) as Record<string, any>;

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Permission[]> = {};
    for (const perm of allPermissions) {
      const group = perm.group || "General";

      // Check if this group requires a superpower
      const requiredSetting = SUPERPOWER_PERMISSION_GROUPS[group];
      if (requiredSetting && !userIsSuperAdmin && companySettings[requiredSetting] !== true) {
        continue; // Skip permissions for superpowers not enabled
      }

      if (!groups[group]) groups[group] = [];
      groups[group].push(perm);
    }
    return groups;
  }, [allPermissions, companySettings, userIsSuperAdmin]);

  // Filtered grouped permissions based on search
  const filteredGroupedPermissions = useMemo(() => {
    if (!permissionSearch.trim()) return groupedPermissions;
    const search = permissionSearch.toLowerCase();
    const filtered: Record<string, Permission[]> = {};
    for (const [group, perms] of Object.entries(groupedPermissions)) {
      const matchingPerms = perms.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.slug.toLowerCase().includes(search) ||
          (p.description && p.description.toLowerCase().includes(search))
      );
      if (matchingPerms.length > 0) {
        filtered[group] = matchingPerms;
      }
    }
    return filtered;
  }, [groupedPermissions, permissionSearch]);

  const permissionGroupsCount = useMemo(
    () => Object.keys(groupedPermissions).length,
    [groupedPermissions]
  );

  const totalPermissionsCount = useMemo(
    () => role?.permissions?.length || 0,
    [role]
  );

  const usersCount = useMemo(() => {
    return (role as any)?.users_count ?? 0;
  }, [role]);

  // Edit handlers
  const handleStartEdit = useCallback(() => {
    if (!role) return;
    setEditName(role.name);
    setEditDescription(role.description || "");
    setIsEditing(true);
  }, [role]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditName("");
    setEditDescription("");
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!role) return;
    setSaving(true);
    try {
      const updated = await rolesApi.update(role.id, {
        name: editName,
        description: editDescription || undefined,
      });
      setRole(updated);
      setIsEditing(false);
      toast({
        title: "Rol actualizado",
        description: "La información del rol se guardó correctamente.",
      });
    } catch (err: any) {
      console.error("Error updating role:", err);
      toast({
        title: "Error",
        description: err.message || "No se pudo actualizar el rol.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [role, editName, editDescription]);

  // Permission handlers
  const togglePermission = useCallback((permId: number) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  }, []);

  const toggleGroup = useCallback((groupName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  }, []);

  const toggleAllInGroup = useCallback(
    (groupPerms: Permission[]) => {
      const groupIds = groupPerms.map((p) => p.id);
      const allSelected = groupIds.every((id) => selectedPermissions.includes(id));
      if (allSelected) {
        setSelectedPermissions((prev) => prev.filter((id) => !groupIds.includes(id)));
      } else {
        setSelectedPermissions((prev) => {
          const newSet = new Set(prev);
          groupIds.forEach((id) => newSet.add(id));
          return Array.from(newSet);
        });
      }
    },
    [selectedPermissions]
  );

  const handleSavePermissions = useCallback(async () => {
    if (!role) return;
    setSavingPermissions(true);
    try {
      const updated = await rolesApi.assignPermissions(role.id, selectedPermissions);
      setRole(updated);
      toast({
        title: "Permisos actualizados",
        description: "Los permisos del rol se guardaron correctamente.",
      });
    } catch (err: any) {
      console.error("Error saving permissions:", err);
      toast({
        title: "Error",
        description: err.message || "No se pudieron guardar los permisos.",
        variant: "destructive",
      });
    } finally {
      setSavingPermissions(false);
    }
  }, [role, selectedPermissions]);

  const hasPermissionChanges = useMemo(() => {
    if (!role?.permissions) return false;
    const currentIds = new Set(role.permissions.map((p) => p.id));
    const selectedIds = new Set(selectedPermissions);
    if (currentIds.size !== selectedIds.size) return true;
    for (const id of currentIds) {
      if (!selectedIds.has(id)) return true;
    }
    return false;
  }, [role, selectedPermissions]);

  // Expand all groups on initial load or search
  useEffect(() => {
    if (permissionSearch.trim()) {
      setExpandedGroups(new Set(Object.keys(filteredGroupedPermissions)));
    }
  }, [permissionSearch, filteredGroupedPermissions]);

  if (loading) {
    return (
      <AppLayout>
        <Head title="Rol" />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="text-sm">Cargando datos del rol...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!role) {
    return (
      <AppLayout>
        <Head title="Rol no encontrado" />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-semibold mb-2">Rol no encontrado</p>
            <Button
              variant="outline"
              onClick={() => router.visit("/admin/roles")}
            >
              Volver a roles
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Head title={role.name} />
      <div className="-mx-2 sm:-mx-4 lg:-mx-6 -mt-4 sm:-mt-6 min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border sticky top-14 z-10">
          <div className="max-w-[1400px] mx-auto px-4">
            {/* Row 1: Back + Icon + Name/Badges */}
            <div className="flex items-center gap-3 py-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0"
                onClick={() => router.visit("/admin/roles")}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>

              <div
                className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${roleColor.bg} border ${roleColor.border}`}
              >
                <Shield className={`h-5 w-5 ${roleColor.icon}`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-sm sm:text-base font-bold text-foreground truncate">
                    {role.name}
                  </h1>
                  <Badge
                    variant="outline"
                    className={`text-[10px] h-5 flex-shrink-0 ${
                      isSystemRole
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                        : "border-blue-300 bg-blue-50 text-blue-700"
                    }`}
                  >
                    {isSystemRole ? "Sistema" : "Personalizado"}
                  </Badge>
                  <Badge
                    variant="default"
                    className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] text-[10px] h-5 flex-shrink-0"
                  >
                    Activo
                  </Badge>
                </div>
                {role.slug && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {role.slug}
                  </p>
                )}
              </div>
            </div>

            {/* Row 2: Metrics bar */}
            <div className="flex items-center border-t border-border/50 -mx-4 px-4 overflow-x-auto hide-scrollbar">
              <div className="flex items-center gap-0 py-2 flex-shrink-0">
                <div className="flex items-center gap-1.5 pr-5">
                  <Key className="h-3.5 w-3.5 text-primary" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">
                      Permisos
                    </p>
                    <p className="text-sm font-bold">{totalPermissionsCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-5 border-l border-border">
                  <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">
                      Grupos
                    </p>
                    <p className="text-sm font-bold">{permissionGroupsCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-5 border-l border-border">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] text-muted-foreground leading-none">
                      Usuarios
                    </p>
                    <p className="text-sm font-bold">{usersCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs row - segmented style */}
          <div className="max-w-[1400px] mx-auto px-4 py-2 border-t border-border/50">
            <nav className="flex items-center bg-muted/30 rounded-lg p-1 overflow-x-auto hide-scrollbar">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium whitespace-nowrap rounded-md transition-all flex-1
                      ${
                        isActive
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Tab Content */}
        <div className="max-w-[1400px] mx-auto px-3 sm:px-4 py-4">
          {activeTab === "info" && (
            <InfoTab
              role={role}
              isSystemRole={isSystemRole}
              roleColor={roleColor}
              canManage={canManage}
              isEditing={isEditing}
              editName={editName}
              editDescription={editDescription}
              saving={saving}
              onEditNameChange={setEditName}
              onEditDescriptionChange={setEditDescription}
              onStartEdit={handleStartEdit}
              onCancelEdit={handleCancelEdit}
              onSaveEdit={handleSaveEdit}
            />
          )}
          {activeTab === "permissions" && (
            <PermissionsTab
              role={role}
              isSystemRole={isSystemRole}
              canManage={canManage}
              filteredGroupedPermissions={filteredGroupedPermissions}
              selectedPermissions={selectedPermissions}
              permissionSearch={permissionSearch}
              expandedGroups={expandedGroups}
              savingPermissions={savingPermissions}
              hasChanges={hasPermissionChanges}
              onSearchChange={setPermissionSearch}
              onTogglePermission={togglePermission}
              onToggleGroup={toggleGroup}
              onToggleAllInGroup={toggleAllInGroup}
              onSave={handleSavePermissions}
            />
          )}
          {activeTab === "users" && <UsersTab role={role} />}
        </div>
      </div>
    </AppLayout>
  );
}

// ── Info Tab ──────────────────────────────────────────────────────────────────

interface InfoTabProps {
  role: RoleWithPermissions;
  isSystemRole: boolean;
  roleColor: { bg: string; icon: string; border: string };
  canManage: boolean;
  isEditing: boolean;
  editName: string;
  editDescription: string;
  saving: boolean;
  onEditNameChange: (value: string) => void;
  onEditDescriptionChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
}

function InfoTab({
  role,
  isSystemRole,
  roleColor,
  canManage,
  isEditing,
  editName,
  editDescription,
  saving,
  onEditNameChange,
  onEditDescriptionChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
}: InfoTabProps) {
  return (
    <div className="grid gap-4 max-w-2xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base font-semibold">
            Información del rol
          </CardTitle>
          {canManage && !isSystemRole && !isEditing && (
            <Button variant="outline" size="sm" onClick={onStartEdit}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              Editar
            </Button>
          )}
          {isEditing && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onCancelEdit}
                disabled={saving}
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Cancelar
              </Button>
              <Button size="sm" onClick={onSaveEdit} disabled={saving}>
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                )}
                Guardar
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nombre</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => onEditNameChange(e.target.value)}
                  placeholder="Nombre del rol"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Descripción</Label>
                <Input
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => onEditDescriptionChange(e.target.value)}
                  placeholder="Descripción del rol (opcional)"
                />
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className={`h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0 ${roleColor.bg}`}>
                  <Tag className={`h-4 w-4 ${roleColor.icon}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Nombre</p>
                  <p className="text-sm font-medium">{role.name}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0 bg-muted/50">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Slug</p>
                  <p className="text-sm font-mono">{role.slug}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0 bg-muted/50">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Descripción</p>
                  <p className="text-sm">
                    {role.description || "Sin descripción"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0 bg-muted/50">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Tipo</p>
                  <Badge
                    variant="outline"
                    className={`mt-0.5 ${
                      isSystemRole
                        ? "border-amber-300 bg-amber-50 text-amber-700"
                        : "border-blue-300 bg-blue-50 text-blue-700"
                    }`}
                  >
                    {isSystemRole ? "Rol del sistema" : "Rol personalizado"}
                  </Badge>
                </div>
              </div>

              {role.company && (
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-md flex items-center justify-center flex-shrink-0 bg-muted/50">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Empresa</p>
                    <p className="text-sm font-medium">{role.company.name}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Permissions Tab ──────────────────────────────────────────────────────────

interface PermissionsTabProps {
  role: RoleWithPermissions;
  isSystemRole: boolean;
  canManage: boolean;
  filteredGroupedPermissions: Record<string, Permission[]>;
  selectedPermissions: number[];
  permissionSearch: string;
  expandedGroups: Set<string>;
  savingPermissions: boolean;
  hasChanges: boolean;
  onSearchChange: (value: string) => void;
  onTogglePermission: (permId: number) => void;
  onToggleGroup: (group: string) => void;
  onToggleAllInGroup: (perms: Permission[]) => void;
  onSave: () => void;
}

function PermissionsTab({
  role,
  isSystemRole,
  canManage,
  filteredGroupedPermissions,
  selectedPermissions,
  permissionSearch,
  expandedGroups,
  savingPermissions,
  hasChanges,
  onSearchChange,
  onTogglePermission,
  onToggleGroup,
  onToggleAllInGroup,
  onSave,
}: PermissionsTabProps) {
  const readOnly = isSystemRole || !canManage;
  const rolePermissionIds = useMemo(
    () => new Set(role.permissions?.map((p) => p.id) || []),
    [role]
  );

  const groupEntries = Object.entries(filteredGroupedPermissions).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <div className="space-y-4">
      {/* Search + Save bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={permissionSearch}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar permisos..."
            className="pl-9"
          />
        </div>
        {!readOnly && (
          <Button
            onClick={onSave}
            disabled={savingPermissions || !hasChanges}
            size="sm"
          >
            {savingPermissions ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5 mr-1.5" />
            )}
            Guardar permisos
          </Button>
        )}
      </div>

      {isSystemRole && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <Shield className="h-4 w-4 flex-shrink-0" />
          <span>
            Este es un rol del sistema. Los permisos se muestran como solo
            lectura.
          </span>
        </div>
      )}

      {/* Permission groups */}
      <div className="space-y-2">
        {groupEntries.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No se encontraron permisos.</p>
          </div>
        )}

        {groupEntries.map(([group, perms]) => {
          const isExpanded = expandedGroups.has(group);
          const selectedInGroup = perms.filter((p) =>
            selectedPermissions.includes(p.id)
          ).length;
          const allSelectedInGroup = selectedInGroup === perms.length;

          return (
            <Card key={group}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onToggleGroup(group)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleGroup(group); } }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors rounded-lg cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-semibold capitalize">
                    {group}
                  </span>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {selectedInGroup}/{perms.length}
                  </Badge>
                </div>
                {!readOnly && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleAllInGroup(perms);
                    }}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Checkbox
                      checked={allSelectedInGroup}
                      className="h-3.5 w-3.5"
                      tabIndex={-1}
                    />
                    <span>Todos</span>
                  </div>
                )}
              </div>

              {isExpanded && (
                <CardContent className="pt-0 pb-3 px-4">
                  <div className="border-t border-border/50 pt-3 space-y-2">
                    {readOnly ? (
                      <div className="flex flex-wrap gap-1.5">
                        {perms.map((perm) => {
                          const isAssigned = rolePermissionIds.has(perm.id);
                          return (
                            <Badge
                              key={perm.id}
                              variant={isAssigned ? "default" : "outline"}
                              className={`text-xs ${
                                isAssigned
                                  ? ""
                                  : "text-muted-foreground opacity-50"
                              }`}
                            >
                              {isAssigned && (
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                              )}
                              {perm.name}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      perms.map((perm) => (
                        <label
                          key={perm.id}
                          className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/30 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={selectedPermissions.includes(perm.id)}
                            onCheckedChange={() => onTogglePermission(perm.id)}
                            className="mt-0.5"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-none">
                              {perm.name}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {perm.slug}
                              {perm.description && ` — ${perm.description}`}
                            </p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Users Tab ────────────────────────────────────────────────────────────────

interface UsersTabProps {
  role: RoleWithPermissions;
}

function UsersTab({ role }: UsersTabProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const data = await rolesApi.getById(role.id);
        setUsers((data as any).users || []);
      } catch (err) {
        console.error("Error loading role users:", err);
        toast({
          title: "Error",
          description: "No se pudieron cargar los usuarios del rol.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, [role.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">No hay usuarios con este rol</p>
        <p className="text-xs mt-1">
          Los usuarios asignados a este rol aparecerán aquí.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="h-12 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Nombre
                </th>
                <th className="h-12 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Email
                </th>
                <th className="h-12 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Sucursal
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr
                  key={u.id}
                  className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                  onClick={() => router.visit(`/admin/users/${u.id}`)}
                >
                  <td className="p-4 text-sm font-medium">{u.name}</td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {u.email}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {u.branch?.name || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
