import { useState, memo, useCallback, useEffect } from "react";
import { Link, usePage, router } from "@inertiajs/react";
import { cn } from "@/lib/utils";
import { ChevronDown, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CollapsedMenuItemWithSubmenu } from "./CollapsedMenuItemWithSubmenu";
import { hasPermission, isSuperAdmin } from "@/lib/permissions";
import type { User } from "@/types";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
  createPath?: string;
  extraIcon?: React.ElementType;
  extraIconClass?: string;
  showWhen?: (user: User | null | undefined) => boolean;
  children?: NavItem[];
}

interface AppSidebarProps {
  isExpanded: boolean;
  onClose: () => void;
  onExpandRequest?: (name: string) => void;
  autoExpandSection?: string | null;
  navigation: NavItem[];
  user?: User;
  isMobile?: boolean;
}

export const AppSidebar = memo(({
  isExpanded = true,
  onClose,
  onExpandRequest,
  autoExpandSection,
  navigation,
  user,
  isMobile = false,
}: AppSidebarProps) => {
  const page = usePage();
  const url = (page as unknown as { url: string }).url;
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const getActiveSectionIndex = useCallback(() => {
    return navigation.findIndex(item => {
      if (url.startsWith(item.href)) return true;
      return item.children?.some(child => url.startsWith(child.href));
    });
  }, [navigation, url]);

  const [expandedSections, setExpandedSections] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    const activeIndex = getActiveSectionIndex();
    if (activeIndex >= 0) initial.add(activeIndex);
    return initial;
  });

  useEffect(() => {
    if (autoExpandSection) {
      const sectionIndex = navigation.findIndex(item => item.name === autoExpandSection);
      if (sectionIndex >= 0) {
        setExpandedSections(prev => new Set(prev).add(sectionIndex));
      }
    }
  }, [autoExpandSection, navigation]);

  const toggleSection = useCallback((index: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }, []);

  const handleCreateClick = useCallback((e: React.MouseEvent, createPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    router.visit(createPath);
    onClose();
  }, [onClose]);

  const isItemActive = useCallback((href: string) => url === href || url.startsWith(href + '/'), [url]);

  const isSectionActive = useCallback((item: NavItem) => {
    if (url.startsWith(item.href)) return true;
    return item.children?.some(child => url.startsWith(child.href));
  }, [url]);

  const canAccessChild = (child: NavItem): boolean => {
    if (child.showWhen && !child.showWhen(user)) return false;
    if (!child.permission) return true;
    if (isSuperAdmin(user)) return true;
    return hasPermission(child.permission, user);
  };

  return (
    <aside
      className={cn(
        "bg-background border-r border-border transition-all duration-300 ease-out",
        "lg:fixed lg:top-0 lg:left-0 lg:z-30 lg:h-screen",
        "h-full w-64",
        isExpanded ? "lg:w-64" : "lg:w-16",
        isMobile ? "flex flex-col" : "hidden lg:flex lg:flex-col"
      )}
    >
      {/* Logo Header */}
      <div className={cn(
        "flex items-center h-14 border-b border-border box-border",
        isExpanded ? "px-4 justify-center" : "px-2 justify-center"
      )}>
        {isExpanded ? (
          <img
            src={user?.company?.logo_url || "/images/legal-sistema-logo.png"}
            alt={user?.company?.name || "Legal Sistema"}
            className="h-10 max-w-[200px] object-contain transition-all duration-200"
          />
        ) : (
          <img
            src={user?.company?.logo_icon_url || user?.company?.logo_url || "/images/legal-sistema-icon.png"}
            alt={user?.company?.name || "Legal Sistema"}
            className="h-7 w-7 object-contain rounded transition-all duration-200"
          />
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="h-full lg:h-[calc(100vh-3.5rem)]">
        <nav className={cn("space-y-1", isExpanded ? "p-3" : "p-2")}>
          {navigation.map((item, index) => {
            const isExpand = expandedSections.has(index);
            const hasChildren = item.children && item.children.length > 0;
            const isActive = isSectionActive(item);
            const Icon = item.icon;

            // Collapsed mode
            if (!isExpanded) {
              const filteredItem = item.children
                ? { ...item, children: item.children.filter(canAccessChild) }
                : item;
              if (filteredItem.children && filteredItem.children.length === 0) return null;
              return (
                <CollapsedMenuItemWithSubmenu
                  key={item.name}
                  item={filteredItem}
                  isActive={isActive ?? false}
                  onClose={onClose}
                  isItemActive={isItemActive}
                  onExpandRequest={onExpandRequest}
                />
              );
            }

            // Expanded mode - item without children
            if (!hasChildren) {
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150",
                    isActive
                      ? "bg-[hsl(var(--billing-primary))]/10 text-[hsl(var(--billing-primary))]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 stroke-[1.5] shrink-0" />
                  <span className="truncate">{item.name}</span>
                </Link>
              );
            }

            // Expanded mode - item with children
            const filteredChildren = item.children?.filter(canAccessChild) ?? [];
            if (filteredChildren.length === 0) return null;

            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleSection(index)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150",
                    isActive
                      ? "bg-[hsl(var(--billing-primary))]/10 text-[hsl(var(--billing-primary))]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 stroke-[1.5] shrink-0" />
                  <span className="flex-1 text-left truncate">{item.name}</span>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform duration-150 shrink-0",
                    isExpand && "-rotate-180"
                  )} />
                </button>

                <div className={cn(
                  "overflow-hidden transition-all duration-150 ease-out",
                  isExpand ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                )}>
                  <ul className="ml-5 pl-3 border-l border-border mt-1 space-y-0.5">
                    {filteredChildren.map((child) => {
                      const isItemHovered = hoveredItem === child.href;
                      const childActive = isItemActive(child.href);
                      return (
                        <li
                          key={child.href}
                          className="relative"
                          onMouseEnter={() => setHoveredItem(child.href)}
                          onMouseLeave={() => setHoveredItem(null)}
                        >
                          <div className={cn(
                            "flex items-center rounded-lg transition-colors duration-100",
                            childActive ? "bg-[hsl(var(--billing-primary))]/5" : isItemHovered ? "bg-muted" : ""
                          )}>
                            <Link
                              href={child.href}
                              onClick={onClose}
                              className={cn(
                                "flex-1 px-2 py-2 text-[13px] transition-colors",
                                childActive
                                  ? "text-[hsl(var(--billing-primary))] font-medium"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              {child.name}
                              {child.extraIcon && (() => { const EI = child.extraIcon!; return <EI className={cn("h-3.5 w-3.5 ml-1 inline-block", child.extraIconClass || "")} />; })()}
                            </Link>

                            {child.createPath && (
                              <button
                                onClick={(e) => handleCreateClick(e, child.createPath!)}
                                className={cn(
                                  "h-7 w-7 mr-1 flex items-center justify-center rounded-md transition-opacity duration-100",
                                  (isItemHovered || childActive)
                                    ? "opacity-100 bg-[hsl(var(--billing-primary))]/10 hover:bg-[hsl(var(--billing-primary))]/20"
                                    : "opacity-0"
                                )}
                              >
                                <Plus className="h-3.5 w-3.5 text-[hsl(var(--billing-primary))]" />
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
});

AppSidebar.displayName = "AppSidebar";
