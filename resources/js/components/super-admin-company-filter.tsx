import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Building2, Filter, RotateCcw, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SuperAdminCompanyFilterState } from "@/hooks/use-super-admin-company-filter";

type FilterProps = Pick<
    SuperAdminCompanyFilterState,
    'companies' | 'loadingCompanies' | 'selectedCompanyId' | 'setSelectedCompanyId' | 'isFiltered' | 'handleFilter' | 'handleClear'
>;

export function SuperAdminCompanyFilter({
    companies,
    loadingCompanies,
    selectedCompanyId,
    setSelectedCompanyId,
    isFiltered,
    handleFilter,
    handleClear,
}: FilterProps) {
    const [open, setOpen] = useState(false);
    const selectedCompany = companies.find(c => String(c.id) === selectedCompanyId);

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex flex-wrap gap-3 items-end">
                    <div className="w-full sm:w-[320px]">
                        <label className="text-sm font-medium text-muted-foreground mb-1 block">
                            Empresa
                        </label>
                        {loadingCompanies ? (
                            <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-background">
                                <Spinner size="sm" />
                                <span className="text-sm text-muted-foreground">Cargando empresas...</span>
                            </div>
                        ) : (
                            <Popover open={open} onOpenChange={setOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={open}
                                        className="w-full justify-between font-normal bg-background h-10"
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span className="truncate">
                                                {selectedCompany ? selectedCompany.name : "Selecciona una empresa"}
                                            </span>
                                        </div>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[320px] p-0 bg-card z-50" align="start">
                                    <Command>
                                        <CommandInput placeholder="Buscar empresa..." />
                                        <CommandList>
                                            <CommandEmpty>No se encontraron empresas</CommandEmpty>
                                            <CommandGroup>
                                                {companies.map((c) => (
                                                    <CommandItem
                                                        key={c.id}
                                                        value={c.name}
                                                        onSelect={() => {
                                                            setSelectedCompanyId(String(c.id));
                                                            setOpen(false);
                                                        }}
                                                    >
                                                        <Check className={cn("mr-2 h-4 w-4", selectedCompanyId === String(c.id) ? "opacity-100" : "opacity-0")} />
                                                        <span className="truncate">{c.name}</span>
                                                        {!c.is_active && (
                                                            <span className="ml-auto text-xs text-muted-foreground">Inactiva</span>
                                                        )}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={handleFilter}
                            size="sm"
                            disabled={!selectedCompanyId}
                        >
                            <Filter className="h-4 w-4 mr-1" />
                            Filtrar
                        </Button>
                        {isFiltered && (
                            <Button onClick={handleClear} size="sm" variant="outline">
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Limpiar
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function SuperAdminEmptyState() {
    return (
        <Card>
            <CardContent className="pt-6">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                        <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                        Selecciona una empresa
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                        Usa el filtro de arriba para seleccionar una empresa y ver sus datos
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
