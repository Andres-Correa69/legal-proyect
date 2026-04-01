import { Head, usePage } from "@inertiajs/react";
import { useEffect, useState } from "react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import { Building2, MapPin, ChevronDown, ChevronRight, Search } from "lucide-react";
import { companiesApi, branchesApi, type Company, type Branch } from "@/lib/api";
import { isSuperAdmin } from "@/lib/permissions";
import type { User } from "@/types";

export default function SubscriptionsIndex() {
  const { props } = usePage<{ auth: { user: User } }>();
  const user = props.auth?.user;

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCompanies, setExpandedCompanies] = useState<Set<number>>(new Set());
  const [togglingCompany, setTogglingCompany] = useState<number | null>(null);
  const [togglingBranch, setTogglingBranch] = useState<number | null>(null);

  useEffect(() => {
    if (!isSuperAdmin(user)) {
      window.location.href = '/admin/dashboard';
      return;
    }
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const data = await companiesApi.getAll();
      setCompanies(data);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCompany = async (company: Company) => {
    setTogglingCompany(company.id);
    try {
      const updated = await companiesApi.toggleActive(company.id);
      setCompanies(prev =>
        prev.map(c => c.id === company.id ? { ...c, is_active: updated.is_active, branches: updated.branches } : c)
      );
    } catch (error) {
      console.error('Error toggling company:', error);
    } finally {
      setTogglingCompany(null);
    }
  };

  const handleToggleBranch = async (branch: Branch, companyId: number) => {
    setTogglingBranch(branch.id);
    try {
      const updated = await branchesApi.toggleActive(branch.id);
      setCompanies(prev =>
        prev.map(c => {
          if (c.id !== companyId) return c;
          return {
            ...c,
            branches: c.branches?.map(b =>
              b.id === branch.id ? { ...b, is_active: updated.is_active } : b
            ),
          };
        })
      );
    } catch (error) {
      console.error('Error toggling branch:', error);
    } finally {
      setTogglingBranch(null);
    }
  };

  const toggleExpanded = (companyId: number) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
      } else {
        next.add(companyId);
      }
      return next;
    });
  };

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout title="Suscripciones">
      <Head title="Suscripciones" />

      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gestion de Suscripciones</h2>
          <p className="text-muted-foreground">
            Activa o desactiva empresas y sus sedes
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="flex-1 max-w-sm relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Companies List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : filteredCompanies.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No se encontraron empresas' : 'No hay empresas registradas'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredCompanies.map((company) => {
              const isExpanded = expandedCompanies.has(company.id);
              const branchCount = company.branches?.length ?? 0;

              return (
                <Card key={company.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{company.name}</CardTitle>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {company.email && <span>{company.email}</span>}
                            {branchCount > 0 && (
                              <span>{branchCount} sede(s)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={company.is_active ? 'default' : 'destructive'}>
                          {company.is_active ? 'Activa' : 'Inactiva'}
                        </Badge>
                        <div className="flex items-center gap-2">
                          {togglingCompany === company.id && (
                            <Spinner className="h-4 w-4" />
                          )}
                          <Switch
                            checked={company.is_active}
                            onCheckedChange={() => handleToggleCompany(company)}
                            disabled={togglingCompany === company.id}
                          />
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  {branchCount > 0 && (
                    <CardContent className="pt-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpanded(company.id)}
                        className="text-muted-foreground hover:text-foreground -ml-2"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 mr-1" />
                        ) : (
                          <ChevronRight className="h-4 w-4 mr-1" />
                        )}
                        {branchCount} sede(s)
                      </Button>

                      {isExpanded && (
                        <div className="mt-3 space-y-2 pl-2">
                          {company.branches?.map((branch) => (
                            <div
                              key={branch.id}
                              className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50"
                            >
                              <div className="flex items-center gap-3">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{branch.name}</p>
                                  {branch.code && (
                                    <p className="text-xs text-muted-foreground">Codigo: {branch.code}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge
                                  variant={branch.is_active ? 'outline' : 'destructive'}
                                  className="text-xs"
                                >
                                  {branch.is_active ? 'Activa' : 'Inactiva'}
                                </Badge>
                                <div className="flex items-center gap-2">
                                  {togglingBranch === branch.id && (
                                    <Spinner className="h-3 w-3" />
                                  )}
                                  <Switch
                                    checked={branch.is_active}
                                    onCheckedChange={() => handleToggleBranch(branch, company.id)}
                                    disabled={togglingBranch === branch.id}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
