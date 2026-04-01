import { Head, usePage, router } from "@inertiajs/react";
import { useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  UserCircle,
  KeyRound,
  Mail,
  Phone,
  Building2,
  Shield,
  Check,
} from "lucide-react";
import { profileApi } from "@/lib/api";
import type { User } from "@/types";

export default function ProfilePage() {
  const { props } = usePage<{ auth: { user: User } }>();
  const user = props.auth?.user;

  // Profile form
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [profileSuccess, setProfileSuccess] = useState("");

  // Password form
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    password: "",
    password_confirmation: "",
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileErrors({});
    setProfileSuccess("");
    try {
      await profileApi.update(profileData);
      setProfileSuccess("Perfil actualizado");
      router.reload({ only: ["auth"] });
      setTimeout(() => setProfileSuccess(""), 3000);
    } catch (error: unknown) {
      if (error && typeof error === "object" && "errors" in error) {
        const formatted: Record<string, string> = {};
        const errorObj = (error as { errors: Record<string, string | string[]> }).errors;
        Object.keys(errorObj).forEach((key) => {
          formatted[key] = Array.isArray(errorObj[key]) ? errorObj[key][0] : errorObj[key] as string;
        });
        setProfileErrors(formatted);
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordErrors({});
    setPasswordSuccess("");
    try {
      await profileApi.updatePassword(passwordData);
      setPasswordSuccess("Contraseña actualizada");
      setPasswordData({ current_password: "", password: "", password_confirmation: "" });
      setTimeout(() => setPasswordSuccess(""), 3000);
    } catch (error: unknown) {
      if (error && typeof error === "object" && "errors" in error) {
        const formatted: Record<string, string> = {};
        const errorObj = (error as { errors: Record<string, string | string[]> }).errors;
        Object.keys(errorObj).forEach((key) => {
          formatted[key] = Array.isArray(errorObj[key]) ? errorObj[key][0] : errorObj[key] as string;
        });
        setPasswordErrors(formatted);
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  const roleName = user?.roles?.[0]?.name || "Usuario";

  return (
    <AppLayout title="Mi Perfil">
      <Head title="Mi Perfil" />

      <div className="space-y-6">
        {/* Profile Header Card - full width */}
        <Card className="overflow-hidden">
          <div className="relative bg-gradient-to-br from-[hsl(var(--billing-primary))]/10 via-[hsl(var(--billing-primary))]/5 to-transparent px-6 pt-8 pb-6">
            <div className="flex items-center gap-5">
              <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                <AvatarImage src={user?.avatar_url || ""} />
                <AvatarFallback className="bg-[hsl(var(--billing-primary))]/15 text-[hsl(var(--billing-primary))] text-3xl font-bold">
                  {user ? getInitials(user.name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-xl font-bold text-foreground truncate">{user?.name}</h3>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{user?.email}</span>
                </div>
                {user?.phone && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{user.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="secondary" className="text-xs">
                    {roleName}
                  </Badge>
                  {user?.company && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Building2 className="h-3 w-3" />
                      {user.company.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2FA Status */}
          {user?.email_2fa_enabled && (
            <div className="px-6 pb-4 pt-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 dark:bg-green-950/20 border border-green-500/20 dark:border-green-900">
                <Shield className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-700 dark:text-green-200">Autenticación 2FA activa</p>
                  <p className="text-xs text-green-600 dark:text-green-400">Tu cuenta está protegida con verificación en dos pasos</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Two columns: Info left, Password right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Edit Form */}
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleProfileSubmit} className="space-y-5">
                <div className="flex items-center gap-2 mb-1">
                  <UserCircle className="h-5 w-5 text-muted-foreground" />
                  <h4 className="text-base font-semibold text-foreground">Información Personal</h4>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">Nombre</Label>
                    <Input
                      id="profile-name"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      disabled={profileLoading}
                    />
                    {profileErrors.name && <p className="text-sm text-destructive">{profileErrors.name}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile-email">Correo electrónico</Label>
                    <Input
                      id="profile-email"
                      type="email"
                      defaultValue={user?.email}
                      disabled
                      className="bg-muted/50"
                    />
                    <p className="text-xs text-muted-foreground">El correo no se puede cambiar</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profile-phone">Teléfono</Label>
                    <Input
                      id="profile-phone"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                      disabled={profileLoading}
                      placeholder="Ingresa tu teléfono"
                    />
                    {profileErrors.phone && <p className="text-sm text-destructive">{profileErrors.phone}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={profileLoading}>
                    {profileLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                    Guardar Cambios
                  </Button>
                  {profileSuccess && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      {profileSuccess}
                    </span>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Password Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-5">
                <KeyRound className="h-5 w-5 text-muted-foreground" />
                <h4 className="text-base font-semibold text-foreground">Cambiar Contraseña</h4>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Contraseña actual</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    disabled={passwordLoading}
                    placeholder="Ingresa tu contraseña actual"
                  />
                  {passwordErrors.current_password && (
                    <p className="text-sm text-destructive">{passwordErrors.current_password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">Nueva contraseña</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={passwordData.password}
                    onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                    disabled={passwordLoading}
                    placeholder="Mínimo 8 caracteres"
                  />
                  {passwordErrors.password && (
                    <p className="text-sm text-destructive">{passwordErrors.password}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwordData.password_confirmation}
                    onChange={(e) => setPasswordData({ ...passwordData, password_confirmation: e.target.value })}
                    disabled={passwordLoading}
                    placeholder="Repite la nueva contraseña"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Button type="submit" disabled={passwordLoading}>
                    {passwordLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                    Actualizar Contraseña
                  </Button>
                  {passwordSuccess && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <Check className="h-4 w-4" />
                      {passwordSuccess}
                    </span>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
