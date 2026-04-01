import { usePage } from '@inertiajs/react';
import type { Permission, Role, SharedData, User } from '@/types';

export function isSuperAdmin(user?: User | null): boolean {
    return user?.roles?.some((role: Role) => role.slug === 'super-admin') || false;
}

export function isAdmin(user?: User | null): boolean {
    return user?.roles?.some((role: Role) =>
        ['admin', 'super-admin'].includes(role.slug)
    ) || false;
}

export function hasRole(roleSlug: string, user?: User | null): boolean {
    if (!user?.roles) return false;
    return user.roles.some((role: Role) => role.slug === roleSlug);
}

export function hasAnyRole(roleSlugs: string[], user?: User | null): boolean {
    if (!user?.roles) return false;
    return roleSlugs.some(slug => hasRole(slug, user));
}

export function hasPermission(permissionSlug: string, user?: User | null): boolean {
    // Super Admin siempre tiene acceso
    if (isSuperAdmin(user)) return true;

    // Verificar permisos directos del usuario
    if (user?.permissions?.some((p: Permission) => p.slug === permissionSlug)) {
        return true;
    }

    // Verificar permisos a través de roles
    if (user?.roles) {
        for (const role of user.roles) {
            if (role.permissions?.some((p: Permission) => p.slug === permissionSlug)) {
                return true;
            }
        }
    }

    return false;
}

export function hasAnyPermission(permissionSlugs: string[], user?: User | null): boolean {
    if (isSuperAdmin(user)) return true;
    return permissionSlugs.some(slug => hasPermission(slug, user));
}

export function hasAllPermissions(permissionSlugs: string[], user?: User | null): boolean {
    if (isSuperAdmin(user)) return true;
    return permissionSlugs.every(slug => hasPermission(slug, user));
}

export function usePermissions() {
    const { auth } = usePage<SharedData>().props;
    const user = auth?.user || null;

    return {
        user,
        isSuperAdmin: isSuperAdmin(user),
        isAdmin: isAdmin(user),
        hasRole: (slug: string) => hasRole(slug, user),
        hasAnyRole: (slugs: string[]) => hasAnyRole(slugs, user),
        hasPermission: (slug: string) => hasPermission(slug, user),
        hasAnyPermission: (slugs: string[]) => hasAnyPermission(slugs, user),
        hasAllPermissions: (slugs: string[]) => hasAllPermissions(slugs, user),
    };
}
