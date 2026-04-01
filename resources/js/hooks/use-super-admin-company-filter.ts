import { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { isSuperAdmin } from '@/lib/permissions';
import { companiesApi } from '@/lib/api';
import type { Company, SharedData } from '@/types';

export interface SuperAdminCompanyFilterState {
    /** Whether the current user is a super admin */
    isSuperAdmin: boolean;
    /** List of available companies */
    companies: Company[];
    /** Whether companies are still loading */
    loadingCompanies: boolean;
    /** Currently selected company ID (as string for Select compatibility) */
    selectedCompanyId: string;
    /** Update selected company ID */
    setSelectedCompanyId: (id: string) => void;
    /** Whether the user has applied the filter */
    isFiltered: boolean;
    /** Apply the filter — sets isFiltered to true */
    handleFilter: () => void;
    /** Clear the filter — resets selection and sets isFiltered to false */
    handleClear: () => void;
    /** Whether the page should load data: true for normal users, true for super admin only when filtered */
    shouldLoadData: boolean;
    /** The company_id to pass to API calls (number or undefined) */
    companyIdParam: number | undefined;
}

export function useSuperAdminCompanyFilter(): SuperAdminCompanyFilterState {
    const { auth } = usePage<SharedData>().props;
    const user = auth?.user || null;
    const userIsSuperAdmin = isSuperAdmin(user);

    const [companies, setCompanies] = useState<Company[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(false);
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [isFiltered, setIsFiltered] = useState(false);

    // Load companies list for super admin
    useEffect(() => {
        if (!userIsSuperAdmin) return;
        setLoadingCompanies(true);
        companiesApi.getAll()
            .then(setCompanies)
            .catch((err) => console.error('Error loading companies for filter:', err))
            .finally(() => setLoadingCompanies(false));
    }, [userIsSuperAdmin]);

    const handleFilter = () => {
        if (selectedCompanyId) {
            setIsFiltered(true);
        }
    };

    const handleClear = () => {
        setSelectedCompanyId('');
        setIsFiltered(false);
    };

    const shouldLoadData = userIsSuperAdmin ? isFiltered : true;
    const companyIdParam = isFiltered && selectedCompanyId ? Number(selectedCompanyId) : undefined;

    return {
        isSuperAdmin: userIsSuperAdmin,
        companies,
        loadingCompanies,
        selectedCompanyId,
        setSelectedCompanyId,
        isFiltered,
        handleFilter,
        handleClear,
        shouldLoadData,
        companyIdParam,
    };
}
