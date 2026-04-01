import { useState, memo } from "react";
import { Link, router } from "@inertiajs/react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { ChevronRight } from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  permission?: string;
  children?: NavItem[];
}

interface CollapsedMenuItemWithSubmenuProps {
  item: NavItem;
  isActive: boolean;
  onClose: () => void;
  isItemActive: (href: string) => boolean;
  onExpandRequest?: (name: string) => void;
}

export const CollapsedMenuItemWithSubmenu = memo(({
  item,
  isActive,
  onClose,
  isItemActive,
  onExpandRequest
}: CollapsedMenuItemWithSubmenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const Icon = item.icon;

  const handleClick = () => {
    if (hasChildren && onExpandRequest) {
      onExpandRequest(item.name);
    }
  };

  const handleNavigate = (href: string) => {
    router.visit(href);
    onClose();
  };

  // Billing primary color classes
  const activeColorClass = "bg-[hsl(var(--billing-primary))]/10 text-[hsl(var(--billing-primary))]";
  const hoverColorClass = "hover:text-[hsl(var(--billing-primary))]";

  if (!hasChildren) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-colors duration-150",
                isActive
                  ? activeColorClass
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 stroke-[1.5]" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium z-[100]">
            {item.name}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        onClick={handleClick}
        className={cn(
          "flex items-center justify-center h-10 w-10 mx-auto rounded-lg transition-colors duration-150 relative",
          isActive
            ? activeColorClass
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="h-5 w-5 stroke-[1.5]" />
        <ChevronRight className={cn(
          "absolute -right-0.5 top-1/2 -translate-y-1/2 h-3 w-3 opacity-40 transition-all duration-200",
          isOpen && "opacity-100 translate-x-0.5"
        )} />
      </button>

      {isOpen && hasChildren && (
        <>
          <div className="absolute left-full top-0 h-full w-2" />
          <div className="absolute left-full top-0 ml-2 z-[100] min-w-48 bg-popover border border-border rounded-lg shadow-lg py-2">
            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {item.name}
            </div>
            {item.children?.map((child) => {
              const ChildIcon = child.icon;
              return (
                <button
                  key={child.href}
                  onClick={() => handleNavigate(child.href)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors",
                    isItemActive(child.href)
                      ? `${activeColorClass} font-medium`
                      : `text-foreground hover:bg-muted ${hoverColorClass}`
                  )}
                >
                  <ChildIcon className="h-4 w-4 stroke-[1.5]" />
                  {child.name}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
});

CollapsedMenuItemWithSubmenu.displayName = "CollapsedMenuItemWithSubmenu";
