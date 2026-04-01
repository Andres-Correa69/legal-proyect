import type { ApiError, User, Company, ServiceOrder } from '@/types';
import echo from '@/echo';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

class ApiClient {
    private csrfInitialized = false;

    private getToken(): string | null {
        return localStorage.getItem('auth_token');
    }

    setToken(token: string): void {
        localStorage.setItem('auth_token', token);
    }

    clearToken(): void {
        localStorage.removeItem('auth_token');
        this.csrfInitialized = false; // Reset CSRF para el próximo login
    }

    private getCsrfToken(): string | null {
        const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        if (match) {
            return decodeURIComponent(match[1]);
        }
        return null;
    }

    async initCsrf(): Promise<void> {
        if (this.csrfInitialized) return;

        await fetch('/sanctum/csrf-cookie', {
            method: 'GET',
            credentials: 'include',
        });
        this.csrfInitialized = true;
    }

    async request<T>(
        endpoint: string,
        options: RequestInit = {},
        extractData = true
    ): Promise<T> {
        const token = this.getToken();
        const headers: Record<string, string> = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Add CSRF token for mutating requests
        const csrfToken = this.getCsrfToken();
        if (csrfToken) {
            headers['X-XSRF-TOKEN'] = csrfToken;
        }

        // Send WebSocket socket ID so Laravel ->toOthers() can exclude the sender
        const socketId = echo?.socketId();
        if (socketId) {
            headers['X-Socket-ID'] = socketId;
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                ...headers,
                ...options.headers,
            },
            credentials: 'include',
        });

        // Auto-retry on 419 CSRF token mismatch: refresh cookie and retry once
        if (response.status === 419 && !(options as any)._csrfRetried) {
            this.csrfInitialized = false;
            await this.initCsrf();
            return this.request<T>(endpoint, { ...options, _csrfRetried: true } as any, extractData);
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error: ApiError = {
                message: errorData.message || `HTTP error! status: ${response.status}`,
                errors: errorData.errors,
                errors_messages: errorData.errors_messages,
                request_payload: errorData.request_payload,
                status: response.status,
                subscription_expired: errorData.subscription_expired || false,
            };
            throw error;
        }

        // Handle 204 No Content responses (e.g., delete operations)
        if (response.status === 204 || response.headers.get('content-length') === '0') {
            return undefined as T;
        }

        const jsonData = await response.json();

        // If the response has the format {success: true, data: ...}, extract the data property
        if (extractData && jsonData && typeof jsonData === 'object' && 'success' in jsonData && 'data' in jsonData) {
            return jsonData.data as T;
        }

        return jsonData;
    }

    async requestRaw<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        return this.request<T>(endpoint, options, false);
    }

    async get<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET' });
    }

    async getRaw<T>(endpoint: string): Promise<T> {
        return this.requestRaw<T>(endpoint, { method: 'GET' });
    }

    async post<T>(endpoint: string, data?: unknown): Promise<T> {
        // Ensure CSRF is initialized before POST requests
        await this.initCsrf();
        return this.request<T>(endpoint, {
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async put<T>(endpoint: string, data?: unknown): Promise<T> {
        await this.initCsrf();
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async patch<T>(endpoint: string, data?: unknown): Promise<T> {
        await this.initCsrf();
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    async delete<T>(endpoint: string): Promise<T> {
        await this.initCsrf();
        return this.request<T>(endpoint, { method: 'DELETE' });
    }

    async postFile<T>(endpoint: string, formData: FormData): Promise<T> {
        await this.initCsrf();
        const token = this.getToken();
        const headers: Record<string, string> = {
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        const csrfToken = this.getCsrfToken();
        if (csrfToken) {
            headers['X-XSRF-TOKEN'] = csrfToken;
        }
        const socketId = echo?.socketId();
        if (socketId) {
            headers['X-Socket-ID'] = socketId;
        }
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: formData,
            credentials: 'include',
        });

        // Auto-retry on 419 CSRF token mismatch: refresh cookie and retry once
        if (response.status === 419 && !(formData as any)._csrfRetried) {
            (formData as any)._csrfRetried = true;
            this.csrfInitialized = false;
            await this.initCsrf();
            return this.postFile<T>(endpoint, formData);
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error: ApiError = {
                message: errorData.message || `HTTP error! status: ${response.status}`,
                errors: errorData.errors,
                errors_messages: errorData.errors_messages,
                request_payload: errorData.request_payload,
                status: response.status,
                subscription_expired: errorData.subscription_expired || false,
            };
            throw error;
        }
        const jsonData = await response.json();
        if (jsonData && typeof jsonData === 'object' && 'success' in jsonData && 'data' in jsonData) {
            return jsonData.data as T;
        }
        return jsonData;
    }
}

export const api = new ApiClient();

// Helper type for paginated responses from Laravel
interface PaginatedResponse<T> {
    data: T[];
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
}

// Helper to extract data from paginated response or return array directly
function extractData<T>(response: T[] | PaginatedResponse<T>): T[] {
    if (Array.isArray(response)) {
        return response;
    }
    if (response && typeof response === 'object' && 'data' in response) {
        return response.data || [];
    }
    return [];
}

// Auth API
export interface LoginRequest {
    email: string;
    password: string;
    remember?: boolean;
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
    user: User;
}

export interface TwoFactorLoginResponse {
    requires_2fa?: boolean;
    message?: string;
    access_token?: string;
    token_type?: string;
    user?: User;
}

export const authApi = {
    login: async (credentials: LoginRequest): Promise<LoginResponse | TwoFactorLoginResponse> => {
        const response = await api.post<LoginResponse | TwoFactorLoginResponse>('/auth/login', credentials);
        if ('access_token' in response && response.access_token) {
            api.setToken(response.access_token);
        }
        return response;
    },

    createSession: async (): Promise<void> => {
        await api.post('/auth/session');
    },

    logout: async (): Promise<void> => {
        try {
            await api.post('/auth/logout');
        } finally {
            api.clearToken();
        }
    },

    getUser: async (): Promise<User> => {
        return api.get<User>('/user');
    },
};

// Two-Factor Authentication API
export interface TwoFactorStatus {
    email_2fa_enabled: boolean;
    enabled_at: string | null;
    trusted_devices_count: number;
}

export interface TrustedDevice {
    id: number;
    device_name: string;
    browser: string;
    platform: string;
    ip_address: string;
    last_used_at: string;
    trusted_until: string | null;
}

export interface LoginWithTwoFactorRequest {
    email: string;
    password: string;
    code: string;
    remember?: boolean;
    trust_device?: boolean;
}

export const twoFactorApi = {
    // Status
    getStatus: async (): Promise<TwoFactorStatus> => {
        return api.get<TwoFactorStatus>('/2fa/status');
    },

    // Activation
    initiateActivation: async (): Promise<{ message: string }> => {
        return api.post<{ message: string }>('/2fa/initiate-activation');
    },

    confirmActivation: async (code: string): Promise<{ message: string }> => {
        return api.post<{ message: string }>('/2fa/confirm-activation', { code });
    },

    // Disable
    disable: async (password: string): Promise<{ message: string }> => {
        return api.post<{ message: string }>('/2fa/disable', { password });
    },

    // Trusted Devices
    getTrustedDevices: async (): Promise<TrustedDevice[]> => {
        return api.get<TrustedDevice[]>('/2fa/trusted-devices');
    },

    removeTrustedDevice: async (deviceId: number): Promise<{ message: string }> => {
        return api.delete<{ message: string }>(`/2fa/trusted-devices/${deviceId}`);
    },

    // Login with 2FA
    sendLoginCode: async (email: string): Promise<{ message: string }> => {
        return api.post<{ message: string }>('/2fa/send-login-code', { email });
    },

    verifyLogin: async (data: LoginWithTwoFactorRequest): Promise<LoginResponse> => {
        const response = await api.post<LoginResponse>('/2fa/verify-login', data);
        if (response.access_token) {
            api.setToken(response.access_token);
        }
        return response;
    },
};

// Dashboard API
export interface DashboardStats {
    sales_today: number;
    sales_today_count: number;
    monthly_income: number;
    accounts_receivable: number;
    accounts_receivable_count: number;
    accounts_payable: number;
    accounts_payable_count: number;
    monthly_expenses: number;
    monthly_expenses_count: number;
    collections_last_7_days: number;
    net_margin: number;
    net_profit: number;
    active_clients: number;
    new_clients_this_month: number;
}

export interface DashboardChartData {
    income_expense: { month: string; ingresos: number; gastos: number }[];
    cash_flow: { day: string; value: number }[];
}

export interface DashboardFinancialSummary {
    total_balance: number;
    accounts_receivable: number;
    accounts_payable: number;
    monthly_income: number;
    monthly_expenses: number;
    net_profit: number;
}

export interface DashboardTransaction {
    id: number;
    type: 'income' | 'expense';
    title: string;
    subtitle: string;
    amount: number;
    status: 'pending' | 'completed';
}

export interface DashboardTopClient {
    id: string;
    name: string;
    email: string;
    initials: string;
    totalBilled: number;
    visits: number;
    lastVisit: string;
}

export interface DashboardData {
    stats: DashboardStats;
    charts: DashboardChartData;
    financial_summary: DashboardFinancialSummary;
    recent_transactions: DashboardTransaction[];
    top_clients: DashboardTopClient[];
}

export const dashboardApi = {
    getStatistics: async (): Promise<DashboardData> => {
        return api.get<DashboardData>('/dashboard/statistics');
    },
};

// Types for API - Company imported from @/types
export type { Company } from '@/types';

export interface Branch {
    id: number;
    company_id: number;
    name: string;
    code?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    is_active: boolean;
    is_main?: boolean;
    rut_url?: string | null;
    company?: Company;
    created_at?: string;
    updated_at?: string;
}

export interface Permission {
    id: number;
    name: string;
    slug: string;
    description?: string;
    group?: string;
}

export interface Role {
    id: number;
    name: string;
    slug: string;
    description?: string;
    company_id?: number;
    company?: Company;
    permissions?: Permission[];
}

export type RoleWithPermissions = Role;

// Companies API
export const companiesApi = {
    getAll: async (): Promise<Company[]> => {
        const response = await api.get<Company[] | PaginatedResponse<Company>>('/companies');
        return extractData(response);
    },
    getById: async (id: number): Promise<Company> => {
        return api.get<Company>(`/companies/${id}`);
    },
    create: async (data: Partial<Company>): Promise<Company> => {
        return api.post<Company>('/companies', data);
    },
    update: async (id: number, data: Partial<Company>): Promise<Company> => {
        return api.put<Company>(`/companies/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/companies/${id}`);
    },
    toggleActive: async (id: number): Promise<Company> => {
        return api.patch<Company>(`/companies/${id}/toggle-active`);
    },
    toggleSuperpower: async (id: number, superpower: string, enabled: boolean): Promise<{ settings: Record<string, any> }> => {
        return api.post<{ settings: Record<string, any> }>(`/companies/${id}/toggle-superpower`, { superpower, enabled });
    },
    getSummary: async (id: number): Promise<CompanySummary> => {
        return api.get<CompanySummary>(`/companies/${id}/summary`);
    },
    getUsers: async (id: number): Promise<User[]> => {
        const response = await api.get<User[] | PaginatedResponse<User>>(`/users?company_id=${id}`);
        return extractData(response);
    },
    parseRut: async (file: File): Promise<RutParsedData> => {
        await api.initCsrf();
        const formData = new FormData();
        formData.append('rut_file', file);
        return api.postFile<RutParsedData>('/companies/parse-rut', formData);
    },
    createFromRut: async (file: File, data: Record<string, string>): Promise<Company> => {
        await api.initCsrf();
        const formData = new FormData();
        formData.append('rut_file', file);
        Object.entries(data).forEach(([key, value]) => {
            if (value) formData.append(key, value);
        });
        return api.postFile<Company>('/companies/create-from-rut', formData);
    },
    uploadBranchRut: async (branchId: number, file: File): Promise<any> => {
        await api.initCsrf();
        const formData = new FormData();
        formData.append('rut_file', file);
        return api.postFile<any>(`/branches/${branchId}/rut`, formData);
    },
    deleteBranchRut: async (branchId: number): Promise<void> => {
        return api.delete(`/branches/${branchId}/rut`);
    },
};

export interface RutParsedData {
    nit: string | null;
    dv: string | null;
    tax_id: string | null;
    name: string | null;
    business_name: string | null;
    trade_name: string | null;
    first_surname: string | null;
    second_surname: string | null;
    first_name: string | null;
    other_names: string | null;
    taxpayer_type: string | null;
    document_type: string | null;
    document_number: string | null;
    address: string | null;
    department: string | null;
    city: string | null;
    country: string | null;
    email: string | null;
    phone: string | null;
    phone2: string | null;
    postal_code: string | null;
    economic_activities: string[];
    tax_responsibilities: { code: string; label: string }[];
    sectional_direction: string | null;
    form_number: string | null;
}

export interface CompanySummary {
    branches_count: number;
    active_branches: number;
    users_count: number;
    active_users: number;
    products_count: number;
    sales_count: number;
    sales_total_year: number;
    recent_users: User[];
    recent_sales: Array<{
        id: number;
        invoice_number?: string;
        total: number;
        status: string;
        created_at: string;
    }>;
    created_at: string;
    is_franchise: boolean;
    has_electronic_invoicing: boolean;
}

// Branches API
export const branchesApi = {
    getAll: async (companyId?: number): Promise<Branch[]> => {
        const endpoint = companyId ? `/branches?company_id=${companyId}` : '/branches';
        const response = await api.get<Branch[] | PaginatedResponse<Branch>>(endpoint);
        return extractData(response);
    },
    getById: async (id: number): Promise<Branch> => {
        return api.get<Branch>(`/branches/${id}`);
    },
    create: async (data: Partial<Branch>): Promise<Branch> => {
        return api.post<Branch>('/branches', data);
    },
    update: async (id: number, data: Partial<Branch>): Promise<Branch> => {
        return api.put<Branch>(`/branches/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/branches/${id}`);
    },
    toggleActive: async (id: number): Promise<Branch> => {
        return api.patch<Branch>(`/branches/${id}/toggle-active`);
    },
    switchBranch: async (branchId: number): Promise<{ success: boolean; data: any; message: string }> => {
        return api.post('/branches/switch', { branch_id: branchId });
    },
};

// Users API
export const usersApi = {
    getAll: async (params?: { company_id?: number }): Promise<User[]> => {
        const query = params?.company_id ? `?company_id=${params.company_id}` : '';
        const response = await api.get<User[] | PaginatedResponse<User>>('/users' + query);
        return extractData(response);
    },
    getById: async (id: number): Promise<User> => {
        return api.get<User>(`/users/${id}`);
    },
    create: async (data: Partial<User> & { password?: string; role_ids?: number[] }): Promise<User> => {
        return api.post<User>('/users', data);
    },
    update: async (id: number, data: Partial<User> & { password?: string; role_ids?: number[] }): Promise<User> => {
        return api.put<User>(`/users/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/users/${id}`);
    },
    toggleStatus: async (id: number): Promise<User> => {
        return api.patch<User>(`/users/${id}/toggle-status`);
    },
    getSummary: async (id: number): Promise<UserSummary> => {
        return api.get<UserSummary>(`/users/${id}/summary`);
    },
    getCommissions: async (id: number, params?: { date_from?: string; date_to?: string; per_page?: number; page?: number }): Promise<PaginatedResponse<UserCommissionSale>> => {
        const queryParams = new URLSearchParams();
        if (params?.date_from) queryParams.append('date_from', params.date_from);
        if (params?.date_to) queryParams.append('date_to', params.date_to);
        if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
        if (params?.page) queryParams.append('page', params.page.toString());
        const qs = queryParams.toString();
        return api.get<PaginatedResponse<UserCommissionSale>>(`/users/${id}/commissions${qs ? '?' + qs : ''}`);
    },
    toggleCommissionPaid: async (userId: number, saleId: number): Promise<{ success: boolean; data: { id: number; commission_paid: boolean; commission_paid_at: string | null }; message: string }> => {
        return api.patch(`/users/${userId}/commissions/${saleId}/toggle-paid`);
    },
    getHistory: async (id: number, params?: { per_page?: number; page?: number }): Promise<PaginatedResponse<UserHistoryEvent>> => {
        const queryParams = new URLSearchParams();
        if (params?.per_page) queryParams.append('per_page', params.per_page.toString());
        if (params?.page) queryParams.append('page', params.page.toString());
        const qs = queryParams.toString();
        return api.get<PaginatedResponse<UserHistoryEvent>>(`/users/${id}/history${qs ? '?' + qs : ''}`);
    },
    uploadAvatar: async (id: number, file: File): Promise<{ avatar_url: string }> => {
        const formData = new FormData();
        formData.append('avatar', file);
        return api.postFile<{ avatar_url: string }>(`/users/${id}/avatar`, formData);
    },
    deleteAvatar: async (id: number): Promise<{ avatar_url: null }> => {
        return api.delete<{ avatar_url: null }>(`/users/${id}/avatar`);
    },
    uploadSignature: async (id: number, data: File | string): Promise<{ signature_url: string }> => {
        const formData = new FormData();
        if (typeof data === 'string') {
            formData.append('signature_base64', data);
        } else {
            formData.append('signature', data);
        }
        return api.postFile<{ signature_url: string }>(`/users/${id}/signature`, formData);
    },
    deleteSignature: async (id: number): Promise<{ signature_url: null }> => {
        return api.delete<{ signature_url: null }>(`/users/${id}/signature`);
    },
    bulkSalaryUpdate: async (updates: { user_id: number; salary: number }[]): Promise<{ updated_count: number }> => {
        return api.post('/users/bulk-salary-update', { updates });
    },
    getPayrollConfig: async (): Promise<any> => {
        return api.get('/users/payroll-config');
    },
};

export interface UserHistoryEvent {
    type: 'commission' | 'edit';
    icon: string;
    title: string;
    description: string;
    status: string;
    date: string;
    meta: Record<string, unknown>;
}

export interface UserSummary {
    salary_info: {
        salary: number | null;
        contract_type: string | null;
        admission_date: string | null;
        bank_name: string | null;
        account_type: string | null;
        account_number: string | null;
        eps_name: string | null;
        pension_fund_name: string | null;
        arl_name: string | null;
        compensation_fund_name: string | null;
        risk_level: number | null;
    };
    commission_summary: {
        total_commission: number;
        total_sales: number;
        sales_count: number;
        avg_percentage: number;
    };
    payroll_summary: {
        total_paid_year: number;
        payroll_count_year: number;
        last_payroll: {
            net_pay: number;
            period_year: number;
            period_month: number;
            payment_date: string | null;
        } | null;
    };
    sales_as_seller: {
        count: number;
        total: number;
    };
}

export interface UserCommissionSale {
    id: number;
    invoice_number: string;
    client_id: number;
    total_amount: number;
    commission_percentage: number;
    commission_amount: number;
    commission_paid: boolean;
    commission_paid_at: string | null;
    created_at: string;
    client?: { id: number; name: string; document_id?: string };
}

// Roles API
export const rolesApi = {
    getAll: async (params?: { company_id?: number }): Promise<RoleWithPermissions[]> => {
        const query = params?.company_id ? `?company_id=${params.company_id}` : '';
        const response = await api.get<RoleWithPermissions[] | PaginatedResponse<RoleWithPermissions>>('/roles' + query);
        return extractData(response);
    },
    getById: async (id: number): Promise<RoleWithPermissions> => {
        return api.get<RoleWithPermissions>(`/roles/${id}`);
    },
    create: async (data: Partial<Role>): Promise<RoleWithPermissions> => {
        return api.post<RoleWithPermissions>('/roles', data);
    },
    update: async (id: number, data: Partial<Role>): Promise<RoleWithPermissions> => {
        return api.put<RoleWithPermissions>(`/roles/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/roles/${id}`);
    },
    assignPermissions: async (id: number, permissionIds: number[]): Promise<RoleWithPermissions> => {
        return api.post<RoleWithPermissions>(`/roles/${id}/assign-permissions`, { permission_ids: permissionIds });
    },
};

// Permissions API
export const permissionsApi = {
    getAll: async (): Promise<Permission[]> => {
        const response = await api.get<Permission[] | PaginatedResponse<Permission>>('/permissions');
        return extractData(response);
    },
};

// Product Categories API
export interface ProductCategory {
    id: number;
    company_id: number;
    area_id?: number | null;
    name: string;
    slug: string;
    description?: string;
    is_active: boolean;
    company?: Company;
    area?: ProductArea;
    products_count?: number;
    created_at?: string;
    updated_at?: string;
}

export const productCategoriesApi = {
    getAll: async (params?: { company_id?: number }): Promise<ProductCategory[]> => {
        const query = params?.company_id ? `?company_id=${params.company_id}` : '';
        const response = await api.get<ProductCategory[] | PaginatedResponse<ProductCategory>>('/product-categories' + query);
        return extractData(response);
    },
    getById: async (id: number): Promise<ProductCategory> => {
        return api.get<ProductCategory>(`/product-categories/${id}`);
    },
    create: async (data: Partial<ProductCategory>): Promise<ProductCategory> => {
        return api.post<ProductCategory>('/product-categories', data);
    },
    update: async (id: number, data: Partial<ProductCategory>): Promise<ProductCategory> => {
        return api.put<ProductCategory>(`/product-categories/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/product-categories/${id}`);
    },
};

// Product Areas API
export interface ProductArea {
    id: number;
    company_id: number;
    name: string;
    slug: string;
    description?: string;
    is_active: boolean;
    company?: Company;
    products_count?: number;
    created_at?: string;
    updated_at?: string;
}

export const productAreasApi = {
    getAll: async (): Promise<ProductArea[]> => {
        const response = await api.get<ProductArea[] | PaginatedResponse<ProductArea>>('/product-areas');
        return extractData(response);
    },
    getById: async (id: number): Promise<ProductArea> => {
        return api.get<ProductArea>(`/product-areas/${id}`);
    },
    create: async (data: Partial<ProductArea>): Promise<ProductArea> => {
        return api.post<ProductArea>('/product-areas', data);
    },
    update: async (id: number, data: Partial<ProductArea>): Promise<ProductArea> => {
        return api.put<ProductArea>(`/product-areas/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/product-areas/${id}`);
    },
};

// Warehouses API
export interface Warehouse {
    id: number;
    company_id: number;
    branch_id: number;
    name: string;
    code?: string;
    address?: string;
    is_active: boolean;
    is_default: boolean;
    branch?: Branch;
    company?: Company;
    locations?: Location[];
    created_at?: string;
    updated_at?: string;
}

export const warehousesApi = {
    getAll: async (params?: { branch_id?: number; company_id?: number } | number): Promise<Warehouse[]> => {
        const queryParts: string[] = [];
        if (typeof params === 'number') {
            queryParts.push(`branch_id=${params}`);
        } else if (params) {
            if (params.branch_id) queryParts.push(`branch_id=${params.branch_id}`);
            if (params.company_id) queryParts.push(`company_id=${params.company_id}`);
        }
        const endpoint = queryParts.length > 0 ? `/warehouses?${queryParts.join('&')}` : '/warehouses';
        const response = await api.get<Warehouse[] | PaginatedResponse<Warehouse>>(endpoint);
        return extractData(response);
    },
    getById: async (id: number): Promise<Warehouse> => {
        return api.get<Warehouse>(`/warehouses/${id}`);
    },
    create: async (data: Partial<Warehouse>): Promise<Warehouse> => {
        return api.post<Warehouse>('/warehouses', data);
    },
    update: async (id: number, data: Partial<Warehouse>): Promise<Warehouse> => {
        return api.put<Warehouse>(`/warehouses/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/warehouses/${id}`);
    },
};

// Locations API
export type LocationType = 'zone' | 'aisle' | 'shelf' | 'bin';

export interface Location {
    id: number;
    warehouse_id: number;
    company_id: number;
    parent_id?: number | null;
    name: string;
    code?: string;
    type: LocationType;
    capacity?: number | null;
    used_capacity?: number;
    is_active: boolean;
    warehouse?: Warehouse;
    company?: Company;
    parent?: Location;
    children?: Location[];
    products?: Product[];
    products_count?: number;
    created_at?: string;
    updated_at?: string;
}

export const locationsApi = {
    getAll: async (params?: { warehouse_id?: number; company_id?: number } | number): Promise<Location[]> => {
        const queryParts: string[] = [];
        if (typeof params === 'number') {
            queryParts.push(`warehouse_id=${params}`);
        } else if (params) {
            if (params.warehouse_id) queryParts.push(`warehouse_id=${params.warehouse_id}`);
            if (params.company_id) queryParts.push(`company_id=${params.company_id}`);
        }
        const endpoint = queryParts.length > 0 ? `/locations?${queryParts.join('&')}` : '/locations';
        const response = await api.get<Location[] | PaginatedResponse<Location>>(endpoint);
        return extractData(response);
    },
    getById: async (id: number): Promise<Location> => {
        return api.get<Location>(`/locations/${id}`);
    },
    create: async (data: Partial<Location>): Promise<Location> => {
        return api.post<Location>('/locations', data);
    },
    update: async (id: number, data: Partial<Location>): Promise<Location> => {
        return api.put<Location>(`/locations/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/locations/${id}`);
    },
};

// Catalogs API
export interface Municipality {
    id: number;
    name: string;
    code: string;
}

export interface TypeDocumentIdentification {
    id: number;
    name: string;
    code: string;
}

export const municipalitiesApi = {
    getAll: async (): Promise<Municipality[]> => {
        return api.get<Municipality[]>('/municipalities');
    },
};

export const typeDocumentIdentificationsApi = {
    getAll: async (): Promise<TypeDocumentIdentification[]> => {
        return api.get<TypeDocumentIdentification[]>('/type-document-identifications');
    },
};

// Suppliers API
export interface Supplier {
    id: number;
    company_id: number;
    name: string;
    contact_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    tax_id?: string;
    document_type?: string;
    municipality_id?: number | null;
    is_active: boolean;
    company?: Company;
    municipality?: Municipality | null;
}

export const suppliersApi = {
    getAll: async (params?: { company_id?: number }): Promise<Supplier[]> => {
        const query = params?.company_id ? `?company_id=${params.company_id}` : '';
        const response = await api.get<Supplier[] | PaginatedResponse<Supplier>>('/suppliers' + query);
        return extractData(response);
    },
    getById: async (id: number): Promise<Supplier> => {
        const response = await api.get<{ success: boolean; data: Supplier } | Supplier>(`/suppliers/${id}`);
        return (response as any).data || response;
    },
    create: async (data: Partial<Supplier>): Promise<Supplier> => {
        return api.post<Supplier>('/suppliers', data);
    },
    update: async (id: number, data: Partial<Supplier>): Promise<Supplier> => {
        return api.put<Supplier>(`/suppliers/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/suppliers/${id}`);
    },
};

// Third Parties API
export interface ThirdParty {
    id: number;
    company_id: number;
    document_type?: string;
    document_id?: string;
    name: string;
    first_name?: string;
    last_name?: string;
    business_name?: string;
    legal_representative?: string;
    email?: string;
    phone?: string;
    whatsapp_country?: string;
    whatsapp_number?: string;
    address?: string;
    country_code?: string;
    country_name?: string;
    state_code?: string;
    state_name?: string;
    city_name?: string;
    neighborhood?: string;
    commune?: string;
    birth_date?: string;
    gender?: string;
    occupation?: string;
    payment_terms?: string;
    observations?: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export const thirdPartiesApi = {
    getAll: async (): Promise<ThirdParty[]> => {
        const response = await api.get<ThirdParty[] | PaginatedResponse<ThirdParty>>('/third-parties');
        return extractData(response);
    },
    getById: async (id: number): Promise<ThirdParty> => {
        const response = await api.get<{ success: boolean; data: ThirdParty }>(`/third-parties/${id}`);
        return (response as any).data ?? response;
    },
    create: async (data: Partial<ThirdParty>): Promise<ThirdParty> => {
        const response = await api.post<{ success: boolean; data: ThirdParty }>('/third-parties', data);
        return (response as any).data ?? response;
    },
    update: async (id: number, data: Partial<ThirdParty>): Promise<ThirdParty> => {
        const response = await api.put<{ success: boolean; data: ThirdParty }>(`/third-parties/${id}`, data);
        return (response as any).data ?? response;
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/third-parties/${id}`);
    },
};

// Products API
export interface Product {
    id: number;
    company_id: number;
    category_id?: number;
    area_id?: number | null;
    location_id?: number | null;
    supplier_id?: number | null;
    sku: string;
    barcode?: string | null;
    name: string;
    description?: string;
    brand?: string;
    purchase_price: number;
    sale_price: number;
    tax_rate?: number | null;
    average_cost: number;
    current_stock: number;
    min_stock: number;
    max_stock?: number | null;
    unit_of_measure: string;
    is_active: boolean;
    is_trackable: boolean;
    auto_purchase_enabled: boolean;
    image_url?: string;
    last_stock_update_at?: string;
    last_stock_update_by?: number;
    company?: Company;
    category?: ProductCategory;
    area?: ProductArea;
    location?: Location;
    supplier?: Supplier;
    created_at?: string;
    updated_at?: string;
}

export interface StockUpdateResponse {
    product: Product;
    stock_change: {
        before: number;
        after: number;
        difference: number;
        operation: 'add' | 'subtract' | 'set';
    };
    needs_restock: boolean;
}

export interface BulkPriceAdjustRequest {
    target_field: 'purchase_price' | 'sale_price';
    operation: 'increase' | 'decrease';
    adjustment_type: 'fixed' | 'percentage';
    value: number;
    filter_type: 'brand' | 'category_id' | 'unit_of_measure' | 'location_id' | 'supplier_id' | 'area_id' | 'all';
    filter_value?: string;
}

export interface BulkPriceAdjustResponse {
    message: string;
    updated_count: number;
}

export interface ProductFilterOptions {
    brands: string[];
    units: string[];
}

export const productsApi = {
    getAll: async (params?: { category_id?: number; low_stock?: boolean; search?: string; company_id?: number }): Promise<Product[]> => {
        let endpoint = '/products';
        const queryParams: string[] = [];
        if (params?.category_id) queryParams.push(`category_id=${params.category_id}`);
        if (params?.low_stock) queryParams.push('low_stock=true');
        if (params?.search) queryParams.push(`search=${encodeURIComponent(params.search)}`);
        if (params?.company_id) queryParams.push(`company_id=${params.company_id}`);
        if (queryParams.length > 0) endpoint += `?${queryParams.join('&')}`;
        const response = await api.get<Product[] | PaginatedResponse<Product>>(endpoint);
        return extractData(response);
    },
    getById: async (id: number): Promise<Product> => {
        return api.get<Product>(`/products/${id}`);
    },
    create: async (data: Partial<Product>): Promise<Product> => {
        return api.post<Product>('/products', data);
    },
    update: async (id: number, data: Partial<Product>): Promise<Product> => {
        return api.put<Product>(`/products/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/products/${id}`);
    },
    updateStock: async (id: number, data: { quantity: number; operation: 'add' | 'subtract' | 'set'; notes?: string }): Promise<StockUpdateResponse> => {
        return api.post<StockUpdateResponse>(`/products/${id}/update-stock`, data);
    },
    getLowStock: async (): Promise<Product[]> => {
        return api.get<Product[]>('/products/low-stock');
    },
    getFilterOptions: async (): Promise<ProductFilterOptions> => {
        return api.get<ProductFilterOptions>('/products/filter-options');
    },
    bulkPriceAdjust: async (data: BulkPriceAdjustRequest): Promise<BulkPriceAdjustResponse> => {
        return api.post<BulkPriceAdjustResponse>('/products/bulk-price-adjust', data);
    },
    getAnalytics: async (id: number): Promise<ProductAnalytics> => {
        return api.get<ProductAnalytics>(`/products/${id}/analytics`);
    },
    getNextSku: async (): Promise<string> => {
        const response = await api.get<{ sku: string }>('/products/next-sku');
        return response.sku;
    },
    uploadImage: async (id: number, file: File): Promise<Product> => {
        const formData = new FormData();
        formData.append('image', file);
        return api.postFile<Product>(`/products/${id}/image`, formData);
    },
    deleteImage: async (id: number): Promise<Product> => {
        return api.delete<Product>(`/products/${id}/image`);
    },
    getChangeLog: async (id: number): Promise<any[]> => {
        return api.get<any[]>(`/products/${id}/change-log`);
    },
};

export interface ProductAnalytics {
    sales_by_month: Array<{ mes: string; mesNum: string; ventas: number; ingresos: number }>;
    kpis: {
        total_ventas_30d: number;
        ingresos_30d: number;
        ganancia_30d: number;
        margen: number;
        cambio_ventas: number;
        rotacion_dias: number;
    };
    top_clients: Array<{ nombre: string; compras: number; total: number }>;
    movements: InventoryMovement[];
}

// Services API
export interface Service {
    id: number;
    company_id: number;
    branch_id?: number;
    name: string;
    slug: string;
    description?: string;
    category: string;
    price: number;
    base_price?: number;
    tax_rate?: number | null;
    estimated_duration?: number;
    unit: string;
    is_active: boolean;
    created_by_user_id?: number;
    last_price_change_at?: string;
    last_price_change_by?: number;
    company?: Company;
    branch?: Branch;
    created_by?: User;
    category_name?: string;
    unit_name?: string;
    formatted_duration?: string;
    discount_percentage?: number;
    service_products?: ServiceProduct[];
    created_at?: string;
    updated_at?: string;
}

export interface ServiceProduct {
    id: number;
    company_id: number;
    service_id: number;
    product_id: number;
    quantity: number;
    is_included: boolean;
    product?: Product;
    created_at?: string;
    updated_at?: string;
}

export interface ServiceFilters {
    branch_id?: number;
    category?: string;
    unit?: string;
    price_min?: number;
    price_max?: number;
    is_active?: boolean;
    search?: string;
    sort_by?: string;
    sort_direction?: 'asc' | 'desc';
    per_page?: number;
}

export interface ServiceCategories {
    [key: string]: string;
}

export interface ServiceUnits {
    [key: string]: string;
}

export const servicesApi = {
    getAll: async (filters?: ServiceFilters): Promise<Service[]> => {
        let endpoint = '/services';
        const queryParams: string[] = [];
        // Default a 100 items para mostrar todos los servicios
        queryParams.push(`per_page=${filters?.per_page ?? 100}`);
        if (filters?.branch_id) queryParams.push(`branch_id=${filters.branch_id}`);
        if (filters?.category) queryParams.push(`category=${encodeURIComponent(filters.category)}`);
        if (filters?.unit) queryParams.push(`unit=${encodeURIComponent(filters.unit)}`);
        if (filters?.price_min !== undefined) queryParams.push(`price_min=${filters.price_min}`);
        if (filters?.price_max !== undefined) queryParams.push(`price_max=${filters.price_max}`);
        if (filters?.is_active !== undefined) queryParams.push(`is_active=${filters.is_active}`);
        if (filters?.search) queryParams.push(`search=${encodeURIComponent(filters.search)}`);
        if (filters?.sort_by) queryParams.push(`sort_by=${filters.sort_by}`);
        if (filters?.sort_direction) queryParams.push(`sort_direction=${filters.sort_direction}`);
        endpoint += `?${queryParams.join('&')}`;
        const response = await api.get<Service[] | PaginatedResponse<Service>>(endpoint);
        return extractData(response);
    },
    getById: async (id: number): Promise<Service> => {
        return api.get<Service>(`/services/${id}`);
    },
    create: async (data: Partial<Service>): Promise<Service> => {
        return api.post<Service>('/services', data);
    },
    update: async (id: number, data: Partial<Service>): Promise<Service> => {
        return api.put<Service>(`/services/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/services/${id}`);
    },
    getCategories: async (): Promise<ServiceCategories> => {
        return api.get<ServiceCategories>('/services/categories');
    },
    getUnits: async (): Promise<ServiceUnits> => {
        return api.get<ServiceUnits>('/services/units');
    },
    syncProducts: async (serviceId: number, products: { product_id: number; quantity: number; is_included: boolean }[]): Promise<Service> => {
        return api.post<Service>(`/services/${serviceId}/sync-products`, { products });
    },
};

// ==================== QUOTES (PRESUPUESTOS) MODULE ====================

export type QuoteStatus = 'active' | 'accepted' | 'expired' | 'rejected';

export interface QuoteItem {
    id: number;
    quote_id: number;
    product_id?: number | null;
    service_id?: number | null;
    description: string;
    quantity: number;
    unit_price: number;
    discount_percentage: number;
    discount_amount: number;
    tax_rate?: number | null;
    tax_amount: number;
    subtotal: number;
    total: number;
    product?: Product;
    service?: Service;
}

export interface Quote {
    id: number;
    company_id: number;
    branch_id: number;
    client_id: number;
    seller_id?: number | null;
    quote_number: string;
    concept: string;
    notes?: string | null;
    status: QuoteStatus;
    quote_date: string;
    valid_until: string;
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
    converted_sale_id?: number | null;
    created_by_user_id: number;
    created_at: string;
    updated_at: string;
    client?: User;
    seller?: User;
    branch?: Branch;
    items?: QuoteItem[];
    created_by?: User;
}

export interface CreateQuoteData {
    client_id: number;
    seller_id?: number;
    concept: string;
    quote_date: string;
    valid_until: string;
    notes?: string;
    items: {
        product_id?: number | null;
        service_id?: number | null;
        description: string;
        quantity: number;
        unit_price: number;
        discount_percentage?: number;
        tax_rate?: number | null;
    }[];
}

export const quotesApi = {
    getByClient: async (clientId: number, params?: {
        status?: QuoteStatus | string;
        search?: string;
        date_from?: string;
        date_to?: string;
    }): Promise<Quote[]> => {
        let endpoint = `/quotes?client_id=${clientId}&per_page=100`;
        if (params?.status && params.status !== 'todos') endpoint += `&status=${params.status}`;
        if (params?.search) endpoint += `&search=${encodeURIComponent(params.search)}`;
        if (params?.date_from) endpoint += `&date_from=${params.date_from}`;
        if (params?.date_to) endpoint += `&date_to=${params.date_to}`;
        const response = await api.get<Quote[] | PaginatedResponse<Quote>>(endpoint);
        return extractData(response);
    },
    getById: async (id: number): Promise<Quote> => {
        return api.get<Quote>(`/quotes/${id}`);
    },
    create: async (data: CreateQuoteData): Promise<Quote> => {
        return api.post<Quote>('/quotes', data);
    },
    update: async (id: number, data: Partial<CreateQuoteData>): Promise<Quote> => {
        return api.put<Quote>(`/quotes/${id}`, data);
    },
    updateStatus: async (id: number, status: QuoteStatus): Promise<Quote> => {
        return api.patch<Quote>(`/quotes/${id}/status`, { status });
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/quotes/${id}`);
    },
};

// ==================== PRICE LISTS MODULE ====================

export interface PriceListItem {
    id: number;
    price_list_id: number;
    product_id?: number | null;
    service_id?: number | null;
    discount_percentage: number;
    custom_price?: number | null;
    product?: Product;
    service?: Service;
    created_at?: string;
    updated_at?: string;
}

export interface PriceList {
    id: number;
    company_id: number;
    name: string;
    description?: string | null;
    is_active: boolean;
    priority: number;
    items_count?: number;
    items?: PriceListItem[];
    created_at?: string;
    updated_at?: string;
}

export interface PriceListItemForSale {
    product_id?: number | null;
    service_id?: number | null;
    discount_percentage: number;
    custom_price?: number | null;
}

export const priceListsApi = {
    getAll: async (params?: { search?: string; is_active?: boolean }): Promise<PriceList[]> => {
        let endpoint = '/price-lists';
        const queryParams: string[] = [];
        if (params?.search) queryParams.push(`search=${encodeURIComponent(params.search)}`);
        if (params?.is_active !== undefined) queryParams.push(`is_active=${params.is_active}`);
        if (queryParams.length > 0) endpoint += `?${queryParams.join('&')}`;
        return api.get<PriceList[]>(endpoint);
    },
    getById: async (id: number): Promise<PriceList> => {
        return api.get<PriceList>(`/price-lists/${id}`);
    },
    create: async (data: { name: string; description?: string; is_active?: boolean; priority?: number }): Promise<PriceList> => {
        return api.post<PriceList>('/price-lists', data);
    },
    update: async (id: number, data: Partial<{ name: string; description?: string; is_active?: boolean; priority?: number }>): Promise<PriceList> => {
        return api.put<PriceList>(`/price-lists/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/price-lists/${id}`);
    },
    syncItems: async (priceListId: number, items: { product_id?: number | null; service_id?: number | null; discount_percentage: number; custom_price?: number | null }[]): Promise<PriceList> => {
        return api.post<PriceList>(`/price-lists/${priceListId}/sync-items`, { items });
    },
    getItemsForSale: async (priceListId: number, productIds?: number[], serviceIds?: number[]): Promise<PriceListItemForSale[]> => {
        let endpoint = `/price-lists/for-sale?price_list_id=${priceListId}`;
        if (productIds && productIds.length > 0) {
            productIds.forEach(id => { endpoint += `&product_ids[]=${id}`; });
        }
        if (serviceIds && serviceIds.length > 0) {
            serviceIds.forEach(id => { endpoint += `&service_ids[]=${id}`; });
        }
        return api.get<PriceListItemForSale[]>(endpoint);
    },
    getSales: async (priceListId: number, params?: { search?: string; status?: string; payment_status?: string; date_from?: string; date_to?: string }): Promise<any[]> => {
        const searchParams = new URLSearchParams();
        if (params?.search) searchParams.append('search', params.search);
        if (params?.status) searchParams.append('status', params.status);
        if (params?.payment_status) searchParams.append('payment_status', params.payment_status);
        if (params?.date_from) searchParams.append('date_from', params.date_from);
        if (params?.date_to) searchParams.append('date_to', params.date_to);
        const qs = searchParams.toString();
        return api.get<any[]>(`/price-lists/${priceListId}/sales${qs ? `?${qs}` : ''}`);
    },
};

// ==================== CASH & PAYMENT MODULE ====================

// Enums and Types
export type CashRegisterType = 'minor' | 'major' | 'bank';
export type SessionStatus = 'open' | 'closed';
export type PaymentType = 'income' | 'expense';
export type TransferStatus = 'pending' | 'completed' | 'cancelled';

// Payment Methods API
export interface PaymentMethod {
    id: number;
    company_id?: number;
    name: string;
    code: string;
    description?: string;
    is_active: boolean;
    is_default: boolean;
    requires_reference?: boolean;
    company?: Company;
    created_at?: string;
    updated_at?: string;
}

export const paymentMethodsApi = {
    getAll: async (params?: { company_id?: number }): Promise<PaymentMethod[]> => {
        const query = params?.company_id ? `?company_id=${params.company_id}` : '';
        const response = await api.get<PaymentMethod[] | PaginatedResponse<PaymentMethod>>('/payment-methods' + query);
        return extractData(response);
    },
    getById: async (id: number): Promise<PaymentMethod> => {
        return api.get<PaymentMethod>(`/payment-methods/${id}`);
    },
    create: async (data: Partial<PaymentMethod>): Promise<PaymentMethod> => {
        return api.post<PaymentMethod>('/payment-methods', data);
    },
    update: async (id: number, data: Partial<PaymentMethod>): Promise<PaymentMethod> => {
        return api.put<PaymentMethod>(`/payment-methods/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/payment-methods/${id}`);
    },
};

// Cash Registers API
export interface CashRegister {
    id: number;
    company_id: number;
    branch_id: number;
    payment_method_id?: number | null;
    name: string;
    code?: string;
    type: CashRegisterType;
    bank_name?: string;
    account_number?: string;
    account_type?: string;
    notes?: string;
    current_balance: number;
    opening_balance: number;
    is_active: boolean;
    description?: string;
    branch?: Branch;
    company?: Company;
    payment_method?: PaymentMethod;
    current_session?: CashRegisterSession;
    created_at?: string;
    updated_at?: string;
}

export const cashRegistersApi = {
    getAll: async (params?: { branch_id?: number; company_id?: number } | number): Promise<CashRegister[]> => {
        const queryParts: string[] = [];
        if (typeof params === 'number') {
            queryParts.push(`branch_id=${params}`);
        } else if (params) {
            if (params.branch_id) queryParts.push(`branch_id=${params.branch_id}`);
            if (params.company_id) queryParts.push(`company_id=${params.company_id}`);
        }
        const endpoint = queryParts.length > 0 ? `/cash-registers?${queryParts.join('&')}` : '/cash-registers';
        const response = await api.get<CashRegister[] | PaginatedResponse<CashRegister>>(endpoint);
        return extractData(response);
    },
    getById: async (id: number): Promise<CashRegister> => {
        return api.get<CashRegister>(`/cash-registers/${id}`);
    },
    create: async (data: Partial<CashRegister>): Promise<CashRegister> => {
        return api.post<CashRegister>('/cash-registers', data);
    },
    update: async (id: number, data: Partial<CashRegister>): Promise<CashRegister> => {
        return api.put<CashRegister>(`/cash-registers/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/cash-registers/${id}`);
    },
};

// Cash Register Sessions API
export interface CashRegisterSession {
    id: number;
    cash_register_id: number;
    user_id: number;
    session_number: string;
    status: SessionStatus;
    opening_balance: number;
    closing_balance?: number | null;
    expected_balance?: number | null;
    difference?: number | null;
    total_income?: number;
    total_expense?: number;
    opened_at: string;
    closed_at?: string | null;
    notes?: string;
    closing_notes?: string;
    cash_register?: CashRegister;
    user?: User;
    opened_by?: User;
    closed_by?: User;
    payments?: Payment[];
    transfers_sent?: CashRegisterTransfer[];
    transfers_received?: CashRegisterTransfer[];
    created_at?: string;
    updated_at?: string;
}

export interface OpenSessionData {
    cash_register_id: number;
    opening_balance: number;
    notes?: string;
}

export interface CloseSessionData {
    closing_balance: number;
    closing_notes?: string;
    transfer_to_major?: boolean;
    notes?: string;
}

export interface SessionSummary {
    session: CashRegisterSession;
    total_income: number;
    total_expense: number;
    expected_balance: number;
    actual_balance: number;
    difference: number;
    payments_by_method: Array<{
        payment_method_id: number;
        payment_method_name: string;
        count: number;
        total: number;
    }>;
    payments_by_type: {
        income: number;
        expense: number;
    };
}

export const cashSessionsApi = {
    getAll: async (params?: {
        cash_register_id?: number;
        status?: SessionStatus;
        user_id?: number;
        date_from?: string;
        date_to?: string;
    }): Promise<CashRegisterSession[]> => {
        let endpoint = '/cash-sessions';
        const queryParams: string[] = [];
        if (params?.cash_register_id) queryParams.push(`cash_register_id=${params.cash_register_id}`);
        if (params?.status) queryParams.push(`status=${params.status}`);
        if (params?.user_id) queryParams.push(`user_id=${params.user_id}`);
        if (params?.date_from) queryParams.push(`date_from=${params.date_from}`);
        if (params?.date_to) queryParams.push(`date_to=${params.date_to}`);
        if (queryParams.length > 0) endpoint += `?${queryParams.join('&')}`;
        const response = await api.get<CashRegisterSession[] | PaginatedResponse<CashRegisterSession>>(endpoint);
        return extractData(response);
    },
    getById: async (id: number): Promise<CashRegisterSession> => {
        return api.get<CashRegisterSession>(`/cash-sessions/${id}`);
    },
    open: async (data: { cash_register_id: number; opening_balance: number; notes?: string }): Promise<any> => {
        return api.post<any>(`/cash-registers/${data.cash_register_id}/open`, {
            opening_balance: data.opening_balance,
            notes: data.notes,
        });
    },
    close: async (sessionId: number, data: { closing_balance: number; notes?: string; transfer_to_cash_register_id?: number | null }): Promise<any> => {
        return api.post<any>(`/cash-sessions/${sessionId}/close`, data);
    },
    summary: async (sessionId: number): Promise<any> => {
        return api.get<any>(`/cash-sessions/${sessionId}/summary`);
    },
    current: async (cashRegisterId: number): Promise<any> => {
        return api.get<any>(`/cash-registers/${cashRegisterId}/current-session`);
    },
};

// Cash Register Transfers API
export interface CashRegisterTransfer {
    id: number;
    company_id: number;
    branch_id?: number | null;
    transfer_number: string;
    source_cash_register_id: number;
    destination_cash_register_id: number;
    amount: number;
    status: TransferStatus;
    notes?: string;
    cancellation_reason?: string;
    created_by_user_id: number;
    cancelled_by_user_id?: number | null;
    cancelled_at?: string | null;
    // Relationships - Laravel returns these in snake_case
    source_cash_register?: CashRegister;
    destination_cash_register?: CashRegister;
    created_by?: User;
    cancelled_by?: User;
    created_at: string;
    updated_at: string;
}

export interface CreateTransferData {
    source_cash_register_id: number;
    destination_cash_register_id: number;
    amount: number;
    notes?: string;
}

export const cashTransfersApi = {
    getAll: async (params?: {
        status?: TransferStatus | 'all';
        source_cash_register_id?: number | string;
        destination_cash_register_id?: number | string;
        date_from?: string;
        date_to?: string;
        search?: string;
        per_page?: number;
        page?: number;
        company_id?: number;
    }): Promise<{
        data: PaginatedResponse<CashRegisterTransfer>;
        summary: {
            total_amount: number;
            total_transfers: number;
            total_cancelled: number;
        };
    }> => {
        const queryParams = new URLSearchParams();
        if (params?.status) queryParams.append('status', params.status);
        if (params?.source_cash_register_id) queryParams.append('source_cash_register_id', String(params.source_cash_register_id));
        if (params?.destination_cash_register_id) queryParams.append('destination_cash_register_id', String(params.destination_cash_register_id));
        if (params?.date_from) queryParams.append('date_from', params.date_from);
        if (params?.date_to) queryParams.append('date_to', params.date_to);
        if (params?.search) queryParams.append('search', params.search);
        if (params?.per_page) queryParams.append('per_page', String(params.per_page));
        if (params?.page) queryParams.append('page', String(params.page));
        if (params?.company_id) queryParams.append('company_id', String(params.company_id));

        const endpoint = `/cash-transfers${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
        const response = await api.getRaw<{
            success: boolean;
            data: PaginatedResponse<CashRegisterTransfer>;
            summary: {
                total_amount: number;
                total_transfers: number;
                total_cancelled: number;
            };
        }>(endpoint);

        return {
            data: response.data,
            summary: response.summary,
        };
    },
    getById: async (id: number): Promise<CashRegisterTransfer> => {
        return api.get<CashRegisterTransfer>(`/cash-transfers/${id}`);
    },
    create: async (data: CreateTransferData): Promise<CashRegisterTransfer> => {
        return api.post<CashRegisterTransfer>('/cash-transfers', data);
    },
    cancel: async (id: number, reason: string): Promise<CashRegisterTransfer> => {
        return api.post<CashRegisterTransfer>(`/cash-transfers/${id}/cancel`, { reason });
    },
};

// Payments API
export interface Payment {
    id: number;
    company_id: number;
    branch_id?: number | null;
    cash_register_id?: number | null;
    cash_register_session_id?: number | null;
    payment_method_id: number;
    payment_number: string;
    type: PaymentType;
    amount: number;
    reference?: string | null;
    concept: string;
    accounting_account_id?: number | null;
    notes?: string;
    paid_at: string;
    created_by_user_id: number;
    cancelled_by_user_id?: number | null;
    cancelled_at?: string | null;
    cancellation_reason?: string;
    is_cancelled: boolean;
    related_type?: string | null;
    related_id?: number | null;
    supplier_id?: number | null;
    client_id?: number | null;
    payment_method?: PaymentMethod;
    cash_register?: CashRegister;
    accounting_account?: AccountingAccount;
    session?: CashRegisterSession;
    created_by?: User;
    cancelled_by?: User;
    supplier?: Supplier;
    client?: User;
    installments?: PaymentInstallment[];
    created_at?: string;
    updated_at?: string;
}

export interface PaymentInstallment {
    id: number;
    payment_id: number;
    installment_number: number;
    amount: number;
    due_date: string;
    paid_date?: string | null;
    status: 'pending' | 'paid' | 'overdue';
    notes?: string;
    payment?: Payment;
    created_at?: string;
    updated_at?: string;
}

export interface CreateIncomeData {
    sale_id: number;
    cash_register_id: number;
    payment_method_id: number;
    amount: number;
    reference?: string;
    notes?: string;
}

export interface CreateExpenseData {
    purchase_id: number;
    cash_register_id: number;
    payment_method_id: number;
    amount: number;
    notes?: string;
}

export interface CreateFreeExpenseData {
    concept: string;
    accounting_account_id: number;
    cash_register_id: number;
    payment_method_id: number;
    amount: number;
    notes?: string;
}

export interface SaleWithPendingBalance {
    id: number;
    invoice_number: string;
    client_name: string;
    client_id: number;
    total_amount: number;
    paid_amount: number;
    balance: number;
    payment_status: SalePaymentStatus;
    invoice_date: string;
    due_date?: string;
}

export interface PurchaseWithPendingBalance {
    id: number;
    purchase_number: string;
    supplier_name: string;
    supplier_id: number;
    total_amount: number;
    total_paid: number;
    balance_due: number;
    payment_status: PaymentStatus;
    created_at: string;
}

export interface PurchasePaymentSummary {
    purchase_id: number;
    purchase_number: string;
    supplier: Supplier;
    total_amount: number;
    paid_amount: number;
    pending_amount: number;
    payment_status: PaymentStatus;
    payments: Payment[];
}

export const paymentsApi = {
    getAll: async (params?: {
        type?: PaymentType;
        session_id?: number;
        cash_register_id?: number;
        payment_method_id?: number;
        date_from?: string;
        date_to?: string;
        is_cancelled?: boolean;
        company_id?: number;
    }): Promise<Payment[]> => {
        let endpoint = '/payments';
        const queryParams: string[] = [];
        if (params?.type) queryParams.push(`type=${params.type}`);
        if (params?.session_id) queryParams.push(`session_id=${params.session_id}`);
        if (params?.cash_register_id) queryParams.push(`cash_register_id=${params.cash_register_id}`);
        if (params?.payment_method_id) queryParams.push(`payment_method_id=${params.payment_method_id}`);
        if (params?.date_from) queryParams.push(`date_from=${params.date_from}`);
        if (params?.date_to) queryParams.push(`date_to=${params.date_to}`);
        if (params?.is_cancelled !== undefined) queryParams.push(`is_cancelled=${params.is_cancelled}`);
        if (params?.company_id) queryParams.push(`company_id=${params.company_id}`);
        if (queryParams.length > 0) endpoint += `?${queryParams.join('&')}`;
        const response = await api.get<Payment[] | PaginatedResponse<Payment>>(endpoint);
        return extractData(response);
    },
    getById: async (id: number): Promise<Payment> => {
        return api.get<Payment>(`/payments/${id}`);
    },
    createIncome: async (data: CreateIncomeData): Promise<{ payment: SalePayment; sale: Sale }> => {
        return api.post<{ payment: SalePayment; sale: Sale }>('/payments/income', data);
    },
    createExpense: async (data: CreateExpenseData): Promise<Payment> => {
        return api.post<Payment>('/payments/expense', data);
    },
    createFreeExpense: async (data: CreateFreeExpenseData): Promise<Payment> => {
        return api.post<Payment>('/payments/expense-free', data);
    },
    cancel: async (id: number, reason: string): Promise<Payment> => {
        return api.post<Payment>(`/payments/${id}/cancel`, { cancellation_reason: reason });
    },
    purchaseSummary: async (purchaseId: number): Promise<PurchasePaymentSummary> => {
        return api.get<PurchasePaymentSummary>(`/payments/purchase/${purchaseId}/summary`);
    },
    getSalesWithPendingBalance: async (): Promise<SaleWithPendingBalance[]> => {
        const response = await api.get<SaleWithPendingBalance[] | PaginatedResponse<SaleWithPendingBalance>>('/payments/sales-pending');
        return extractData(response);
    },
    getPurchasesWithPendingBalance: async (): Promise<PurchaseWithPendingBalance[]> => {
        const response = await api.get<PurchaseWithPendingBalance[] | PaginatedResponse<PurchaseWithPendingBalance>>('/payments/purchases-pending');
        return extractData(response);
    },
};

// Balance Inquiry API
export interface SupplierBalance {
    supplier_id: number;
    supplier_name: string;
    total_purchases: number;
    total_paid: number;
    total_pending: number;
    last_purchase_date?: string;
    last_payment_date?: string;
}

export interface SupplierBalanceDetail {
    supplier: Supplier;
    total_purchases: number;
    total_paid: number;
    total_pending: number;
    purchases: Array<{
        id: number;
        purchase_number: string;
        total_amount: number;
        paid_amount: number;
        pending_amount: number;
        status: InventoryPurchaseStatus;
        payment_status: PaymentStatus;
        created_at: string;
    }>;
    recent_payments: Payment[];
}

export interface BalanceSummary {
    total_suppliers: number;
    total_purchases_amount: number;
    total_paid_amount: number;
    total_pending_amount: number;
    suppliers_with_pending: number;
}

// Client Balance Types
export interface ClientBalance {
    client_id: number;
    client_name: string;
    document_type?: string;
    document_id?: string;
    email?: string;
    phone?: string;
    total_sales: number;
    total_paid: number;
    balance_due: number;
    sales_count: number;
    payment_status: string;
}

export interface ClientBalanceTotals {
    total_sales: number;
    total_paid: number;
    total_balance_due: number;
    clients_count: number;
    clients_with_debt: number;
}

export interface ClientBalanceResponse {
    clients: ClientBalance[];
    totals: ClientBalanceTotals;
}

export interface ClientSaleInfo {
    id: number;
    invoice_number: string;
    type: SaleType;
    type_label: string;
    date: string;
    due_date?: string;
    total_amount: number;
    paid_amount: number;
    balance: number;
    payment_status: SalePaymentStatus;
    payment_status_label: string;
    status: SaleStatus;
    branch?: string;
    seller?: string;
    items_count: number;
}

export interface ClientPaymentInfo {
    id: number;
    payment_date: string;
    amount: number;
    payment_method: string;
    reference?: string;
    notes?: string;
    invoice_number: string;
    sale_id: number;
}

export interface ClientBalanceDetailTotals {
    total_sales: number;
    total_paid: number;
    total_balance_due: number;
    sales_count: number;
    pending_sales: number;
    partial_sales: number;
    paid_sales: number;
}

export interface ClientBalanceDetail {
    client: {
        id: number;
        name: string;
        document_type?: string;
        document_id?: string;
        email?: string;
        phone?: string;
        address?: string;
    };
    sales: ClientSaleInfo[];
    payments: ClientPaymentInfo[];
    totals: ClientBalanceDetailTotals;
}

export interface RegisterSalePaymentData {
    sale_id: number;
    payment_method_id: number;
    amount: number;
    reference?: string;
    notes?: string;
}

export interface RegisterSalePaymentResponse {
    payment: {
        id: number;
        amount: number;
        payment_date: string;
        payment_method: string;
        reference?: string;
        notes?: string;
        invoice_number: string;
    };
    sale: {
        id: number;
        invoice_number: string;
        total_amount: number;
        paid_amount: number;
        balance: number;
        payment_status: SalePaymentStatus;
        payment_status_label: string;
    };
}

export const balanceInquiryApi = {
    suppliers: async (params?: {
        has_pending?: boolean;
        date_from?: string;
        date_to?: string;
    }): Promise<SupplierBalance[]> => {
        let endpoint = '/balances/suppliers';
        const queryParams: string[] = [];
        if (params?.has_pending !== undefined) queryParams.push(`has_pending=${params.has_pending}`);
        if (params?.date_from) queryParams.push(`date_from=${params.date_from}`);
        if (params?.date_to) queryParams.push(`date_to=${params.date_to}`);
        if (queryParams.length > 0) endpoint += `?${queryParams.join('&')}`;
        // api.get already extracts 'data' from {success: true, data: {...}}
        const response = await api.get<{ suppliers: SupplierBalance[]; totals: any }>(endpoint);
        if (response && response.suppliers) {
            return response.suppliers;
        }
        return [];
    },
    supplier: async (supplierId: number, params?: {
        date_from?: string;
        date_to?: string;
    }): Promise<SupplierBalanceDetail> => {
        let endpoint = `/balances/suppliers/${supplierId}`;
        const queryParams: string[] = [];
        if (params?.date_from) queryParams.push(`date_from=${params.date_from}`);
        if (params?.date_to) queryParams.push(`date_to=${params.date_to}`);
        if (queryParams.length > 0) endpoint += `?${queryParams.join('&')}`;
        // api.get already extracts 'data' from {success: true, data: {...}}
        const response = await api.get<{ supplier: any; purchases: any[]; payments: any[]; totals: any }>(endpoint);
        if (response && response.supplier) {
            return {
                supplier: response.supplier,
                total_purchases: response.totals?.total_purchases ?? 0,
                total_paid: response.totals?.total_paid ?? 0,
                total_pending: response.totals?.total_balance_due ?? 0,
                purchases: (response.purchases ?? []).map((p: any) => ({
                    ...p,
                    created_at: p.date ?? p.created_at ?? null,
                    pending_amount: p.balance_due ?? 0,
                    paid_amount: p.total_paid ?? 0,
                })),
                recent_payments: (response.payments ?? []).map((payment: any) => ({
                    ...payment,
                    paid_at: payment.payment_date ?? payment.paid_at ?? null,
                    concept: payment.purchase_number ?? payment.concept ?? 'Pago a proveedor',
                    payment_method: payment.payment_method ? { name: payment.payment_method } : null,
                })),
            };
        }
        throw new Error('Error al obtener datos del proveedor');
    },
    clients: async (params?: {
        search?: string;
        payment_status?: string;
        date_from?: string;
        date_to?: string;
    }): Promise<ClientBalanceResponse> => {
        let endpoint = '/balances/clients';
        const queryParams: string[] = [];
        if (params?.search) queryParams.push(`search=${encodeURIComponent(params.search)}`);
        if (params?.payment_status) queryParams.push(`payment_status=${params.payment_status}`);
        if (params?.date_from) queryParams.push(`date_from=${params.date_from}`);
        if (params?.date_to) queryParams.push(`date_to=${params.date_to}`);
        if (queryParams.length > 0) endpoint += `?${queryParams.join('&')}`;
        // api.get already extracts 'data' from {success: true, data: {...}}
        const response = await api.get<{ clients: ClientBalance[]; totals: ClientBalanceTotals }>(endpoint);
        if (response && response.clients) {
            return {
                clients: response.clients ?? [],
                totals: response.totals ?? {
                    total_sales: 0,
                    total_paid: 0,
                    total_balance_due: 0,
                    clients_count: 0,
                    clients_with_debt: 0,
                },
            };
        }
        return { clients: [], totals: { total_sales: 0, total_paid: 0, total_balance_due: 0, clients_count: 0, clients_with_debt: 0 } };
    },
    client: async (clientId: number, params?: {
        payment_status?: string;
        date_from?: string;
        date_to?: string;
    }): Promise<ClientBalanceDetail> => {
        let endpoint = `/balances/clients/${clientId}`;
        const queryParams: string[] = [];
        if (params?.payment_status) queryParams.push(`payment_status=${params.payment_status}`);
        if (params?.date_from) queryParams.push(`date_from=${params.date_from}`);
        if (params?.date_to) queryParams.push(`date_to=${params.date_to}`);
        if (queryParams.length > 0) endpoint += `?${queryParams.join('&')}`;
        // api.get already extracts 'data' from {success: true, data: {...}}
        const response = await api.get<ClientBalanceDetail>(endpoint);
        if (response && response.client) {
            return response;
        }
        throw new Error('Error al obtener datos del cliente');
    },
    registerSalePayment: async (data: RegisterSalePaymentData): Promise<RegisterSalePaymentResponse> => {
        return api.post<RegisterSalePaymentResponse>('/balances/sales/payment', data);
    },
    exportClients: async (params: {
        format: 'pdf' | 'excel';
        search?: string;
        payment_status?: string;
        date_from?: string;
        date_to?: string;
    }): Promise<Blob> => {
        const token = localStorage.getItem('auth_token');
        const csrfMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : undefined;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': params.format === 'pdf'
                ? 'application/pdf'
                : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'X-Requested-With': 'XMLHttpRequest',
        };

        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (csrfToken) headers['X-XSRF-TOKEN'] = csrfToken;

        const response = await fetch(`${API_BASE_URL}/balances/clients/export`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            try {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            } catch {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        }
        return response.blob();
    },
    exportSuppliers: async (params: {
        format: 'pdf' | 'excel';
        has_pending?: string;
    }): Promise<Blob> => {
        const token = localStorage.getItem('auth_token');
        const csrfMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : undefined;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': params.format === 'pdf'
                ? 'application/pdf'
                : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'X-Requested-With': 'XMLHttpRequest',
        };

        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (csrfToken) headers['X-XSRF-TOKEN'] = csrfToken;

        const response = await fetch(`${API_BASE_URL}/balances/suppliers/export`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            try {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            } catch {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        }
        return response.blob();
    },
    exportClientBalanceUrl: (clientId: number): string => {
        return `${API_BASE_URL}/balances/clients/${clientId}/export`;
    },
    summary: async (params?: {
        date_from?: string;
        date_to?: string;
    }): Promise<BalanceSummary> => {
        let endpoint = '/balances/summary';
        const queryParams: string[] = [];
        if (params?.date_from) queryParams.push(`date_from=${params.date_from}`);
        if (params?.date_to) queryParams.push(`date_to=${params.date_to}`);
        if (queryParams.length > 0) endpoint += `?${queryParams.join('&')}`;
        // api.get already extracts 'data' from {success: true, data: {...}}
        const response = await api.get<{ supplier_summary: any; by_payment_status: any[]; top_debtors: any[] }>(endpoint);
        if (response && response.supplier_summary) {
            // Mapear los nombres de campos del backend a los del frontend
            return {
                total_suppliers: response.supplier_summary?.total_suppliers ?? 0,
                total_purchases_amount: response.supplier_summary?.total_amount ?? 0,
                total_paid_amount: response.supplier_summary?.total_paid ?? 0,
                total_pending_amount: response.supplier_summary?.balance_due ?? 0,
                suppliers_with_pending: response.top_debtors?.length ?? 0,
            };
        }
        return {
            total_suppliers: 0,
            total_purchases_amount: 0,
            total_paid_amount: 0,
            total_pending_amount: 0,
            suppliers_with_pending: 0,
        };
    },
};

// Cash Reports API
export interface CashFlowReport {
    period_start: string;
    period_end: string;
    opening_balance: number;
    total_income: number;
    total_expense: number;
    closing_balance: number;
    transactions: Array<{
        date: string;
        type: PaymentType;
        concept: string;
        amount: number;
        balance: number;
        payment_number: string;
        payment_method: string;
    }>;
}

export interface CashRegisterReport {
    cash_register: CashRegister;
    period_start: string;
    period_end: string;
    sessions_count: number;
    total_income: number;
    total_expense: number;
    total_transfers_sent: number;
    total_transfers_received: number;
    sessions: Array<{
        session_number: string;
        opened_at: string;
        closed_at?: string;
        status: SessionStatus;
        opening_balance: number;
        closing_balance?: number;
        total_income: number;
        total_expense: number;
    }>;
}

export interface GlobalCashReport {
    period_start: string;
    period_end: string;
    total_income: number;
    total_expense: number;
    net_cash_flow: number;
    by_branch: Array<{
        branch_id: number;
        branch_name: string;
        total_income: number;
        total_expense: number;
        net_cash_flow: number;
    }>;
    by_payment_method: Array<{
        payment_method_id: number;
        payment_method_name: string;
        total_income: number;
        total_expense: number;
        net_amount: number;
    }>;
}

export const cashReportsApi = {
    cashFlow: async (params: {
        session_id?: number;
        cash_register_id?: number;
        date_from: string;
        date_to: string;
    }): Promise<CashFlowReport> => {
        const queryParams: string[] = [];
        if (params.session_id) queryParams.push(`session_id=${params.session_id}`);
        if (params.cash_register_id) queryParams.push(`cash_register_id=${params.cash_register_id}`);
        queryParams.push(`date_from=${params.date_from}`);
        queryParams.push(`date_to=${params.date_to}`);
        return api.get<CashFlowReport>(`/cash-reports/cash-flow?${queryParams.join('&')}`);
    },
    byRegister: async (cashRegisterId: number, params: {
        date_from: string;
        date_to: string;
    }): Promise<CashRegisterReport> => {
        return api.get<CashRegisterReport>(`/cash-reports/by-register/${cashRegisterId}?date_from=${params.date_from}&date_to=${params.date_to}`);
    },
    global: async (params: {
        date_from: string;
        date_to: string;
        branch_id?: number;
    }): Promise<GlobalCashReport> => {
        const queryParams: string[] = [];
        queryParams.push(`date_from=${params.date_from}`);
        queryParams.push(`date_to=${params.date_to}`);
        if (params.branch_id) queryParams.push(`branch_id=${params.branch_id}`);
        return api.get<GlobalCashReport>(`/cash-reports/global?${queryParams.join('&')}`);
    },
    export: async (params: {
        report_type: 'cash_flow' | 'by_register' | 'global';
        format: 'pdf' | 'excel';
        date_from: string;
        date_to: string;
        cash_register_id?: number;
        session_id?: number;
        branch_id?: number;
    }): Promise<Blob> => {
        // Preparar headers con token y CSRF
        const token = localStorage.getItem('auth_token');
        const csrfMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : undefined;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': params.format === 'pdf'
                ? 'application/pdf'
                : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'X-Requested-With': 'XMLHttpRequest',
        };

        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (csrfToken) headers['X-XSRF-TOKEN'] = csrfToken;

        const response = await fetch(`${API_BASE_URL}/cash-reports/export`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            try {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            } catch {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        }
        return response.blob();
    },
};

// Audit Logs API
export interface AuditLog {
    id: number;
    description?: string;
    event?: string;
    causer_type?: string;
    causer_id?: number;
    subject_type?: string;
    subject_id?: number;
    properties?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
    causer?: User;
    subject?: unknown;
    created_at?: string;
}

export const auditLogsApi = {
    getAll: async (params?: { company_id?: number }): Promise<AuditLog[]> => {
        const query = params?.company_id ? `?company_id=${params.company_id}` : '';
        const response = await api.get<AuditLog[] | PaginatedResponse<AuditLog>>('/audit-logs' + query);
        return extractData(response);
    },
};

// External API Logs
export interface ExternalApiLog {
    id: number;
    api_client_id: number;
    api_client_name: string;
    method: string;
    endpoint: string;
    action: string;
    action_label: string;
    company_name?: string;
    company_nit?: string;
    user_name?: string;
    user_email?: string;
    request_payload?: Record<string, unknown>;
    response_status: number;
    response_success: boolean;
    response_summary?: string;
    ip_address?: string;
    user_agent?: string;
    duration_ms?: number;
    api_client?: { id: number; name: string };
    created_at: string;
}

export const externalApiLogsApi = {
    getAll: async (params?: Record<string, string>): Promise<ExternalApiLog[]> => {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        const response = await api.get<ExternalApiLog[] | PaginatedResponse<ExternalApiLog>>('/external-api-logs' + query);
        return extractData(response);
    },
};

// Sales Audit API (Solo SuperAdmin)
export interface SalesAuditEvent {
    id: number;
    event: string;
    description: string;
    user: string;
    ip_address?: string;
    properties?: Record<string, unknown>;
    created_at: string;
}

export interface SalesAuditSale {
    id: number;
    invoice_number: string;
    type: string;
    type_label: string;
    status: string;
    status_label: string;
    payment_status: string;
    payment_status_label: string;
    total_amount: number;
    client_name: string;
    created_by: string;
    created_at: string;
    deleted_at?: string;
    has_credit_note: boolean;
    credit_note_type?: string;
    credit_note_number?: string;
    has_debit_note: boolean;
    debit_note_number?: string;
    is_cancelled: boolean;
    events: SalesAuditEvent[];
}

export interface SalesAuditCompany {
    id: number;
    name: string;
    nit: string;
    sales_count: number;
    sales: SalesAuditSale[];
}

export interface SalesAuditSummary {
    total_sales: number;
    by_type: Record<string, number>;
    total_credit_notes: number;
    total_debit_notes: number;
    total_cancelled: number;
}

export interface SalesAuditData {
    companies: SalesAuditCompany[];
    summary: SalesAuditSummary;
    available_companies: { id: number; name: string }[];
}

export const salesAuditApi = {
    getAll: async (params?: Record<string, string>): Promise<SalesAuditData> => {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return api.get<SalesAuditData>('/sales-audit' + query);
    },
};

// Clients API (usuarios con rol de cliente)
export const clientsApi = {
    getAll: async (params?: { company_id?: number }): Promise<User[]> => {
        const query = params?.company_id ? `?company_id=${params.company_id}` : '';
        const response = await api.get<User[] | PaginatedResponse<User>>('/clients' + query);
        return extractData(response);
    },
    getById: async (id: number): Promise<User> => {
        return api.get<User>(`/clients/${id}`);
    },
    create: async (data: Partial<User> & { password?: string }): Promise<User> => {
        return api.post<User>('/clients', data);
    },
    update: async (id: number, data: Partial<User> & { password?: string }): Promise<User> => {
        return api.put<User>(`/clients/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/clients/${id}`);
    },
};

// Adjustment Reasons API
export interface AdjustmentReason {
    id: number;
    company_id: number;
    code: string;
    name: string;
    description?: string;
    requires_approval: boolean;
    approval_threshold_quantity?: number | null;
    approval_threshold_amount?: number | null;
    is_active: boolean;
    company?: Company;
    created_at?: string;
    updated_at?: string;
}

export interface CreateAdjustmentReasonData {
    code: string;
    name: string;
    description?: string | null;
    is_active?: boolean;
    requires_approval: boolean;
    approval_threshold_amount?: number | null;
    approval_threshold_quantity?: number | null;
}

export interface UpdateAdjustmentReasonData {
    code?: string;
    name?: string;
    description?: string | null;
    is_active?: boolean;
    requires_approval?: boolean;
    approval_threshold_amount?: number | null;
    approval_threshold_quantity?: number | null;
}

export const adjustmentReasonsApi = {
    getAll: async (params?: { is_active?: string; search?: string }): Promise<AdjustmentReason[]> => {
        let endpoint = '/adjustment-reasons';
        const queryParams: string[] = [];
        if (params?.is_active) queryParams.push(`is_active=${params.is_active}`);
        if (params?.search) queryParams.push(`search=${encodeURIComponent(params.search)}`);
        if (queryParams.length > 0) endpoint += `?${queryParams.join('&')}`;
        const response = await api.get<AdjustmentReason[] | PaginatedResponse<AdjustmentReason>>(endpoint);
        return extractData(response);
    },
    getById: async (id: number): Promise<AdjustmentReason> => {
        const response = await api.get<AdjustmentReason>(`/adjustment-reasons/${id}`);
        return response;
    },
    create: async (data: CreateAdjustmentReasonData): Promise<AdjustmentReason> => {
        const response = await api.post<AdjustmentReason>('/adjustment-reasons', data);
        return response;
    },
    update: async (id: number, data: UpdateAdjustmentReasonData): Promise<AdjustmentReason> => {
        const response = await api.put<AdjustmentReason>(`/adjustment-reasons/${id}`, data);
        return response;
    },
    delete: async (id: number): Promise<void> => {
        await api.delete(`/adjustment-reasons/${id}`);
    },
};

// Inventory Movements API
export type InventoryMovementType = 'entry' | 'exit' | 'transfer' | 'adjustment' | 'sale' | 'purchase' | 'return' | 'damage' | 'loss' | 'other';

export interface InventoryMovement {
    id: number;
    product_id: number;
    company_id: number;
    branch_id?: number | null;
    type: InventoryMovementType;
    quantity: number;
    unit_cost?: number;
    sale_unit_price?: number;
    stock_before: number;
    stock_after: number;
    reference_type?: string | null;
    reference_id?: number | null;
    source_location_id?: number | null;
    destination_location_id?: number | null;
    created_by_user_id?: number;
    notes?: string;
    product?: Product;
    source_location?: Location;
    destination_location?: Location;
    created_by?: User;
    created_at?: string;
    updated_at?: string;
}

export const inventoryMovementsApi = {
    getAll: async (params?: {
        product_id?: number;
        type?: InventoryMovementType;
        date_from?: string;
        date_to?: string;
        company_id?: number;
    }): Promise<InventoryMovement[]> => {
        let endpoint = '/inventory-movements';
        const queryParams: string[] = [];
        if (params?.product_id) queryParams.push(`product_id=${params.product_id}`);
        if (params?.type) queryParams.push(`type=${params.type}`);
        if (params?.date_from) queryParams.push(`date_from=${params.date_from}`);
        if (params?.date_to) queryParams.push(`date_to=${params.date_to}`);
        if (params?.company_id) queryParams.push(`company_id=${params.company_id}`);
        if (queryParams.length > 0) endpoint += `?${queryParams.join('&')}`;
        const response = await api.get<InventoryMovement[] | PaginatedResponse<InventoryMovement>>(endpoint);
        return extractData(response);
    },
    getById: async (id: number): Promise<InventoryMovement> => {
        return api.get<InventoryMovement>(`/inventory-movements/${id}`);
    },
};

// Inventory Purchase Items
export interface InventoryPurchaseItem {
    id: number;
    inventory_purchase_id: number;
    product_id: number;
    quantity_ordered: number;
    quantity_received: number;
    unit_cost: number;
    subtotal?: number;
    pending_quantity?: number;
    product?: Product;
}

// Inventory Purchases API
export type InventoryPurchaseStatus = 'draft' | 'pending' | 'approved' | 'partial' | 'received' | 'cancelled';
export type PaymentStatus = 'pending' | 'partial' | 'paid';

export interface InventoryPurchase {
    id: number;
    company_id: number;
    branch_id?: number | null;
    warehouse_id: number;
    supplier_id: number;
    purchase_number: string;
    status: InventoryPurchaseStatus;
    payment_status: PaymentStatus;
    is_credit: boolean;
    credit_due_date?: string | null;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    total_paid?: number;
    balance_due?: number;
    expected_date?: string | null;
    received_at?: string | null;
    notes?: string;
    created_by_user_id?: number;
    approved_by_user_id?: number | null;
    received_by_user_id?: number | null;
    company?: Company;
    branch?: Branch;
    warehouse?: Warehouse;
    supplier?: Supplier;
    items?: InventoryPurchaseItem[];
    created_by?: User;
    approved_by?: User;
    received_by?: User;
    receipt_acknowledgment?: ReceiptAcknowledgmentData | null;
    goods_receipt?: GoodsReceiptData | null;
    express_acceptance?: ExpressAcceptanceData | null;
    payments?: Payment[];
    document_support?: DocumentSupportData | null;
    created_at?: string;
    updated_at?: string;
}

export interface AddPurchasePaymentData {
    cash_register_id: number;
    amount: number;
    payment_date: string;
    reference?: string;
    notes?: string;
}

export interface ReceiptAcknowledgmentData {
    id: number;
    inventory_purchase_id: number;
    uuid_reference: string;
    number: string | null;
    uuid: string | null;
    issue_date: string | null;
    status_description: string | null;
    status_message: string | null;
    qr_link: string | null;
    email_status?: 'sent' | 'pending' | null;
    created_at: string;
    updated_at: string;
}

export interface GoodsReceiptData {
    id: number;
    inventory_purchase_id: number;
    receipt_acknowledgment_id: number;
    uuid_reference: string | null;
    number: string | null;
    uuid: string | null;
    issue_date: string | null;
    status_description: string | null;
    status_message: string | null;
    qr_link: string | null;
    email_status?: 'sent' | 'pending' | null;
    created_at: string;
    updated_at: string;
}

export interface ExpressAcceptanceData {
    id: number;
    inventory_purchase_id: number;
    receipt_acknowledgment_id: number;
    uuid_reference: string | null;
    number: string | null;
    uuid: string | null;
    issue_date: string | null;
    status_description: string | null;
    status_message: string | null;
    qr_link: string | null;
    email_status?: 'sent' | 'pending' | null;
    created_at: string;
    updated_at: string;
}

export interface SavedPersonData {
    type_document_identification_id: number;
    identification_number: string;
    first_name: string;
    family_name: string;
    job_title: string;
}

export interface DocumentSupportData {
    id: number;
    inventory_purchase_id: number;
    number: string | null;
    uuid: string | null;
    expedition_date: string | null;
    status_description: string | null;
    status_message: string | null;
    qr_link: string | null;
    pdf_download_link: string | null;
    email_status?: 'sent' | 'pending' | null;
    voided: boolean;
    void_uuid: string | null;
    void_number: string | null;
    void_date: string | null;
    created_at: string;
    updated_at: string;
}

export interface CreateInventoryPurchaseData {
    warehouse_id: number;
    supplier_id: number;
    expected_date?: string;
    notes?: string;
    is_credit?: boolean;
    credit_due_date?: string;
    retentions?: Array<{
        id: string;
        type: string;
        name: string;
        percentage: number;
        value: number;
    }>;
    items: Array<{
        product_id: number;
        quantity_ordered: number;
        unit_cost: number;
    }>;
}

export interface ReceiveItemData {
    id: number;
    quantity_received: number;
}

export interface ParsedInvoiceItem {
    raw_text: string;
    quantity: number;
    unit_cost: number;
    matched_product_id: number | null;
    matched_product_name: string | null;
    matched_product_sku: string | null;
    confidence: number;
}

export interface ParsedInvoiceInfo {
    supplier_name: string | null;
    invoice_number: string | null;
    date: string | null;
}

export interface ParseInvoiceResponse {
    items: ParsedInvoiceItem[];
    invoice_info: ParsedInvoiceInfo;
    raw_text: string;
    warning?: string;
}

export const inventoryPurchasesApi = {
    getAll: async (params?: {
        status?: InventoryPurchaseStatus;
        supplier_id?: number;
        date_from?: string;
        date_to?: string;
        company_id?: number;
    }): Promise<InventoryPurchase[]> => {
        let endpoint = '/inventory-purchases';
        const queryParams: string[] = [];
        if (params?.status) queryParams.push(`status=${params.status}`);
        if (params?.supplier_id) queryParams.push(`supplier_id=${params.supplier_id}`);
        if (params?.date_from) queryParams.push(`date_from=${params.date_from}`);
        if (params?.date_to) queryParams.push(`date_to=${params.date_to}`);
        if (params?.company_id) queryParams.push(`company_id=${params.company_id}`);
        if (queryParams.length > 0) endpoint += `?${queryParams.join('&')}`;
        const response = await api.get<InventoryPurchase[] | PaginatedResponse<InventoryPurchase>>(endpoint);
        return extractData(response);
    },
    getById: async (id: number): Promise<InventoryPurchase> => {
        return api.get<InventoryPurchase>(`/inventory-purchases/${id}`);
    },
    create: async (data: CreateInventoryPurchaseData): Promise<InventoryPurchase> => {
        return api.post<InventoryPurchase>('/inventory-purchases', data);
    },
    update: async (id: number, data: Partial<CreateInventoryPurchaseData>): Promise<InventoryPurchase> => {
        return api.put<InventoryPurchase>(`/inventory-purchases/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/inventory-purchases/${id}`);
    },
    approve: async (id: number, data: { cash_register_id: number; amount?: number }): Promise<InventoryPurchase> => {
        return api.post<InventoryPurchase>(`/inventory-purchases/${id}/approve`, data);
    },
    receive: async (id: number, items: ReceiveItemData[]): Promise<InventoryPurchase> => {
        return api.post<InventoryPurchase>(`/inventory-purchases/${id}/receive`, { items });
    },
    cancel: async (id: number): Promise<InventoryPurchase> => {
        return api.post<InventoryPurchase>(`/inventory-purchases/${id}/cancel`);
    },
    addPayment: async (purchaseId: number, data: AddPurchasePaymentData): Promise<{ payment: Payment; purchase: InventoryPurchase }> => {
        return api.post<{ payment: Payment; purchase: InventoryPurchase }>(`/inventory-purchases/${purchaseId}/payments`, data);
    },
    sendReceiptAcknowledgment: async (purchaseId: number, uuid: string): Promise<{
        success: boolean;
        message: string;
        receipt_acknowledgment?: ReceiptAcknowledgmentData;
        errors_messages?: string[];
        errors?: Record<string, string[]>;
    }> => {
        return api.requestRaw(`/inventory-purchases/${purchaseId}/receipt-acknowledgment`, {
            method: 'POST',
            body: JSON.stringify({ uuid }),
        });
    },
    getReceiptAcknowledgmentPdfUrl: (receiptAcknowledgmentId: number): string => {
        return `/api/receipt-acknowledgments/${receiptAcknowledgmentId}/pdf`;
    },
    sendReceiptAcknowledgmentEmail: async (receiptAcknowledgmentId: number): Promise<{ success: boolean; message: string }> => {
        return api.requestRaw(`/receipt-acknowledgments/${receiptAcknowledgmentId}/send-email`, {
            method: 'POST',
        });
    },
    sendGoodsReceipt: async (purchaseId: number, personData: {
        type_document_identification_id: number;
        identification_number: string;
        first_name: string;
        family_name: string;
        job_title: string;
    }): Promise<{
        success: boolean;
        message: string;
        goods_receipt?: GoodsReceiptData;
        errors_messages?: string[];
        errors?: Record<string, string[]>;
    }> => {
        return api.requestRaw(`/inventory-purchases/${purchaseId}/goods-receipt`, {
            method: 'POST',
            body: JSON.stringify(personData),
        });
    },
    getGoodsReceiptPdfUrl: (goodsReceiptId: number): string => {
        return `/api/goods-receipts/${goodsReceiptId}/pdf`;
    },

    sendGoodsReceiptEmail: async (goodsReceiptId: number): Promise<{ success: boolean; message: string }> => {
        return api.requestRaw(`/goods-receipts/${goodsReceiptId}/send-email`, {
            method: 'POST',
        });
    },

    sendExpressAcceptance: async (purchaseId: number, personData: {
        type_document_identification_id: number;
        identification_number: string;
        first_name: string;
        family_name: string;
        job_title: string;
    }): Promise<{
        success: boolean;
        message: string;
        express_acceptance?: ExpressAcceptanceData;
        errors_messages?: string[];
        errors?: Record<string, string[]>;
    }> => {
        return api.requestRaw(`/inventory-purchases/${purchaseId}/express-acceptance`, {
            method: 'POST',
            body: JSON.stringify(personData),
        });
    },
    getExpressAcceptancePdfUrl: (expressAcceptanceId: number): string => {
        return `/api/express-acceptances/${expressAcceptanceId}/pdf`;
    },
    sendExpressAcceptanceEmail: async (expressAcceptanceId: number): Promise<{ success: boolean; message: string }> => {
        return api.requestRaw(`/express-acceptances/${expressAcceptanceId}/send-email`, {
            method: 'POST',
        });
    },
    getSavedPerson: async (): Promise<{ success: boolean; data?: SavedPersonData | null }> => {
        return api.requestRaw('/electronic-invoicing/saved-person');
    },

    sendDocumentSupport: async (purchaseId: number): Promise<{ success: boolean; message: string; document_support?: DocumentSupportData; errors_messages?: string[] }> => {
        return api.requestRaw(`/inventory-purchases/${purchaseId}/document-support`, {
            method: 'POST',
        });
    },
    getDocumentSupportPdfUrl: (documentSupportId: number): string => {
        return `/api/document-supports/${documentSupportId}/pdf`;
    },
    sendDocumentSupportEmail: async (documentSupportId: number): Promise<{ success: boolean; message: string }> => {
        return api.requestRaw(`/document-supports/${documentSupportId}/send-email`, {
            method: 'POST',
        });
    },
    voidDocumentSupport: async (documentSupportId: number): Promise<{ success: boolean; message: string; document_support?: DocumentSupportData; errors_messages?: string[] }> => {
        return api.requestRaw(`/document-supports/${documentSupportId}/void`, {
            method: 'POST',
        });
    },
    getDocumentSupportVoidPdfUrl: (documentSupportId: number): string => {
        return `/api/document-supports/${documentSupportId}/void-pdf`;
    },
    parseInvoice: async (file?: File, extractedText?: string): Promise<ParseInvoiceResponse> => {
        if (file) {
            const formData = new FormData();
            formData.append('invoice_file', file);
            return api.postFile<ParseInvoiceResponse>('/inventory-purchases/parse-invoice', formData);
        } else {
            return api.post<ParseInvoiceResponse>('/inventory-purchases/parse-invoice', { extracted_text: extractedText });
        }
    },
};

// Inventory Transfer Items
export interface InventoryTransferItem {
    id: number;
    inventory_transfer_id: number;
    product_id: number;
    quantity_requested: number;
    quantity_transferred: number;
    pending_quantity?: number;
    product?: Product;
}

// Inventory Transfers API
export type InventoryTransferStatus = 'requested' | 'approved' | 'in_transit' | 'completed' | 'rejected' | 'cancelled';

export interface InventoryTransfer {
    id: number;
    company_id: number;
    transfer_number: string;
    source_warehouse_id: number;
    destination_warehouse_id: number;
    source_location_id?: number | null;
    destination_location_id?: number | null;
    status: InventoryTransferStatus;
    requested_by_user_id: number;
    approved_by_user_id?: number | null;
    completed_by_user_id?: number | null;
    requested_at?: string | null;
    approved_at?: string | null;
    completed_at?: string | null;
    notes?: string;
    rejection_reason?: string;
    company?: Company;
    source_warehouse?: Warehouse;
    destination_warehouse?: Warehouse;
    source_location?: Location;
    destination_location?: Location;
    items?: InventoryTransferItem[];
    requested_by?: User;
    approved_by?: User;
    completed_by?: User;
    created_at?: string;
    updated_at?: string;
}

export interface CreateInventoryTransferData {
    source_warehouse_id: number;
    destination_warehouse_id: number;
    source_location_id?: number;
    destination_location_id?: number;
    notes?: string;
    items: Array<{
        product_id: number;
        quantity_requested: number;
    }>;
}

export const inventoryTransfersApi = {
    getAll: async (params?: {
        status?: InventoryTransferStatus;
        warehouse_id?: number;
        company_id?: number;
    }): Promise<InventoryTransfer[]> => {
        let endpoint = '/inventory-transfers';
        const queryParams: string[] = [];
        if (params?.status) queryParams.push(`status=${params.status}`);
        if (params?.warehouse_id) queryParams.push(`warehouse_id=${params.warehouse_id}`);
        if (params?.company_id) queryParams.push(`company_id=${params.company_id}`);
        if (queryParams.length > 0) endpoint += `?${queryParams.join('&')}`;
        const response = await api.get<InventoryTransfer[] | PaginatedResponse<InventoryTransfer>>(endpoint);
        return extractData(response);
    },
    getById: async (id: number): Promise<InventoryTransfer> => {
        return api.get<InventoryTransfer>(`/inventory-transfers/${id}`);
    },
    create: async (data: CreateInventoryTransferData): Promise<InventoryTransfer> => {
        return api.post<InventoryTransfer>('/inventory-transfers', data);
    },
    update: async (id: number, data: Partial<CreateInventoryTransferData>): Promise<InventoryTransfer> => {
        return api.put<InventoryTransfer>(`/inventory-transfers/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/inventory-transfers/${id}`);
    },
    approve: async (id: number): Promise<InventoryTransfer> => {
        return api.post<InventoryTransfer>(`/inventory-transfers/${id}/approve`);
    },
    reject: async (id: number, reason: string): Promise<InventoryTransfer> => {
        return api.post<InventoryTransfer>(`/inventory-transfers/${id}/reject`, { rejection_reason: reason });
    },
    startTransit: async (id: number): Promise<InventoryTransfer> => {
        return api.post<InventoryTransfer>(`/inventory-transfers/${id}/start-transit`);
    },
    complete: async (id: number, items?: Array<{ item_id: number; quantity_transferred: number }>): Promise<InventoryTransfer> => {
        const response = await api.post<{ success: boolean; message: string; data: InventoryTransfer }>(`/inventory-transfers/${id}/complete`, items ? { items } : undefined);
        return response.data;
    },
};

// Inventory Adjustments API
export type InventoryAdjustmentStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved';

export interface InventoryAdjustment {
    id: number;
    company_id: number;
    branch_id?: number | null;
    product_id: number;
    adjustment_reason_id: number;
    adjustment_number: string;
    quantity: number;
    stock_before: number;
    stock_after: number;
    unit_cost: number;
    financial_impact: number;
    status: InventoryAdjustmentStatus;
    notes?: string;
    rejection_reason?: string;
    created_by_user_id: number;
    approved_by_user_id?: number | null;
    company?: Company;
    branch?: Branch;
    product?: Product;
    adjustmentReason?: AdjustmentReason;
    createdBy?: User;
    approvedBy?: User;
    created_at?: string;
    updated_at?: string;
}

export interface CreateInventoryAdjustmentData {
    product_id: number;
    adjustment_reason_id: number;
    quantity: number;
    notes?: string;
}

export const inventoryAdjustmentsApi = {
    getAll: async (params?: {
        status?: InventoryAdjustmentStatus;
        product_id?: number;
        reason_id?: number;
        date_from?: string;
        date_to?: string;
        company_id?: number;
    }): Promise<InventoryAdjustment[]> => {
        let endpoint = '/inventory-adjustments';
        const queryParams: string[] = [];
        if (params?.status) queryParams.push(`status=${params.status}`);
        if (params?.product_id) queryParams.push(`product_id=${params.product_id}`);
        if (params?.reason_id) queryParams.push(`reason_id=${params.reason_id}`);
        if (params?.date_from) queryParams.push(`date_from=${params.date_from}`);
        if (params?.date_to) queryParams.push(`date_to=${params.date_to}`);
        if (params?.company_id) queryParams.push(`company_id=${params.company_id}`);
        if (queryParams.length > 0) endpoint += `?${queryParams.join('&')}`;
        const response = await api.get<InventoryAdjustment[] | PaginatedResponse<InventoryAdjustment>>(endpoint);
        return extractData(response);
    },
    getById: async (id: number): Promise<InventoryAdjustment> => {
        return api.get<InventoryAdjustment>(`/inventory-adjustments/${id}`);
    },
    create: async (data: CreateInventoryAdjustmentData): Promise<InventoryAdjustment> => {
        return api.post<InventoryAdjustment>('/inventory-adjustments', data);
    },
    update: async (id: number, data: Partial<CreateInventoryAdjustmentData>): Promise<InventoryAdjustment> => {
        return api.put<InventoryAdjustment>(`/inventory-adjustments/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/inventory-adjustments/${id}`);
    },
    approve: async (id: number): Promise<InventoryAdjustment> => {
        return api.post<InventoryAdjustment>(`/inventory-adjustments/${id}/approve`);
    },
    reject: async (id: number, reason: string): Promise<InventoryAdjustment> => {
        return api.post<InventoryAdjustment>(`/inventory-adjustments/${id}/reject`, { rejection_reason: reason });
    },
};

// Sales Types
export type SaleType = 'pos' | 'electronic' | 'account' | 'credit';
export type SaleStatus = 'draft' | 'pending' | 'completed' | 'cancelled';
export type SalePaymentStatus = 'pending' | 'partial' | 'paid';

export interface SaleItem {
    id: number;
    sale_id: number;
    product_id?: number;
    service_id?: number;
    description: string;
    quantity: number;
    unit_price: number;
    discount_percentage: number;
    discount_amount: number;
    discount_note?: string | null;
    tax_rate?: number;
    tax_amount: number;
    subtotal: number;
    total: number;
    product?: Product;
}

export interface SalePayment {
    id: number;
    sale_id: number;
    cash_register_id?: number;
    payment_method_id?: number;
    payment_method_name: string;
    amount: number;
    payment_date: string;
    reference?: string;
    notes?: string;
    created_by_user_id: number;
    created_at: string;
    cash_register?: CashRegister;
}

export interface SaleRetention {
    id: string;
    type: string;
    name: string;
    percentage: number;
    value: number;
}

export interface Sale {
    id: number;
    company_id: number;
    branch_id: number;
    client_id: number;
    seller_id?: number;
    invoice_number: string;
    type: SaleType;
    status: SaleStatus;
    payment_status: SalePaymentStatus;
    invoice_date: string;
    due_date?: string;
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    retention_amount: number;
    total_amount: number;
    paid_amount: number;
    balance: number;
    commission_percentage: number;
    commission_amount: number;
    notes?: string;
    retentions?: SaleRetention[];
    price_list_id?: number | null;
    created_by_user_id: number;
    created_at: string;
    updated_at: string;
    client?: User;
    seller?: User;
    branch?: Branch;
    items?: SaleItem[];
    payments?: SalePayment[];
    created_by?: User;
    price_list?: PriceList;
    electronic_invoices?: ElectronicInvoiceData[];
    internal_notes?: InternalNote[];
    credit_note_amount?: number;
    debit_note_amount?: number;
    email_status?: 'sent' | 'pending' | null;
}

// Internal Notes (Notas Crédito/Débito Internas)
export type InternalNoteType = 'credit' | 'debit';
export type InternalNoteStatus = 'completed' | 'cancelled';

export interface InternalNote {
    id: number;
    company_id: number;
    branch_id: number;
    sale_id: number;
    note_number: string;
    type: InternalNoteType;
    status: InternalNoteStatus;
    reason: string;
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
    issue_date: string;
    created_by_user_id: number;
    created_at: string;
    updated_at: string;
    items?: InternalNoteItem[];
    created_by?: User;
}

export interface InternalNoteItem {
    id: number;
    internal_note_id: number;
    sale_item_id?: number;
    product_id?: number;
    service_id?: number;
    description: string;
    quantity: number;
    unit_price: number;
    discount_percentage: number;
    discount_amount: number;
    tax_rate?: number;
    tax_amount: number;
    subtotal: number;
    total: number;
}

export interface CreateInternalNoteData {
    type: InternalNoteType;
    reason: string;
    cash_register_id?: number;
    payment_method_id?: number;
    items: {
        sale_item_id?: number;
        product_id?: number;
        service_id?: number;
        description: string;
        quantity: number;
        unit_price: number;
        discount_percentage?: number;
        tax_rate?: number;
    }[];
}

export const internalNotesApi = {
    getBySale: async (saleId: number): Promise<InternalNote[]> => {
        return api.get<InternalNote[]>(`/sales/${saleId}/internal-notes`);
    },
    create: async (saleId: number, data: CreateInternalNoteData): Promise<InternalNote> => {
        return api.post<InternalNote>(`/sales/${saleId}/internal-notes`, data);
    },
    cancel: async (noteId: number): Promise<InternalNote> => {
        return api.post<InternalNote>(`/internal-notes/${noteId}/cancel`);
    },
};

export interface CreateSaleData {
    client_id: number;
    seller_id?: number;
    type: SaleType;
    invoice_date: string;
    due_date?: string;
    notes?: string;
    commission_percentage?: number;
    retentions?: SaleRetention[];
    price_list_id?: number | null;
    items: {
        product_id?: number | null;
        service_id?: number | null;
        description: string;
        quantity: number;
        unit_price: number;
        discount_percentage?: number;
        discount_note?: string | null;
        tax_rate?: number | null;
    }[];
    payments: {
        cash_register_id: number;
        payment_method_id: number;
        amount: number;
        date: string;
    }[];
}

export interface CreateDraftData {
    client_id?: number | null;
    seller_id?: number;
    type: SaleType;
    invoice_date: string;
    due_date?: string;
    notes?: string;
    commission_percentage?: number;
    retentions?: SaleRetention[];
    price_list_id?: number | null;
    items?: {
        product_id?: number | null;
        service_id?: number | null;
        description: string;
        quantity: number;
        unit_price: number;
        discount_percentage?: number;
        discount_note?: string | null;
        tax_rate?: number | null;
    }[];
}

export interface AddSalePaymentData {
    payment_method_name: string;
    amount: number;
    payment_date: string;
    reference?: string;
    notes?: string;
}

export interface SaleStats {
    total_sales: number;
    total_amount: number;
    total_paid: number;
    total_pending: number;
    by_type: { type: SaleType; count: number; total: number }[];
    by_payment_status: { payment_status: SalePaymentStatus; count: number; total: number }[];
}

export const salesApi = {
    getAll: async (params?: {
        type?: SaleType;
        status?: SaleStatus;
        payment_status?: SalePaymentStatus;
        client_id?: number;
        date_from?: string;
        date_to?: string;
        search?: string;
        per_page?: number;
        page?: number;
    }): Promise<Sale[]> => {
        let endpoint = '/sales';
        const queryParams: string[] = [];
        if (params?.type) queryParams.push(`type=${params.type}`);
        if (params?.status) queryParams.push(`status=${params.status}`);
        if (params?.payment_status) queryParams.push(`payment_status=${params.payment_status}`);
        if (params?.client_id) queryParams.push(`client_id=${params.client_id}`);
        if (params?.date_from) queryParams.push(`date_from=${params.date_from}`);
        if (params?.date_to) queryParams.push(`date_to=${params.date_to}`);
        if (params?.search) queryParams.push(`search=${encodeURIComponent(params.search)}`);
        if (params?.per_page) queryParams.push(`per_page=${params.per_page}`);
        if (params?.page) queryParams.push(`page=${params.page}`);
        if (queryParams.length > 0) endpoint += `?${queryParams.join('&')}`;
        const response = await api.get<Sale[] | PaginatedResponse<Sale>>(endpoint);
        return extractData(response);
    },
    getById: async (id: number): Promise<Sale> => {
        return api.get<Sale>(`/sales/${id}`);
    },
    create: async (data: CreateSaleData): Promise<Sale> => {
        return api.post<Sale>('/sales', data);
    },
    addPayment: async (saleId: number, data: AddSalePaymentData): Promise<{ payment: SalePayment; sale: Sale }> => {
        return api.post<{ payment: SalePayment; sale: Sale }>(`/sales/${saleId}/payments`, data);
    },
    updateItems: async (saleId: number, data: {
        items: {
            id?: number;
            product_id?: number | null;
            service_id?: number | null;
            description: string;
            quantity: number;
            unit_price: number;
            discount_percentage?: number;
            tax_rate?: number | null;
        }[];
    }): Promise<Sale> => {
        return api.put<Sale>(`/sales/${saleId}/items`, data);
    },
    cancel: async (id: number): Promise<Sale> => {
        return api.post<Sale>(`/sales/${id}/cancel`);
    },
    updateDueDate: async (saleId: number, dueDate: string | null): Promise<Sale> => {
        return api.patch<Sale>(`/sales/${saleId}/due-date`, { due_date: dueDate });
    },
    getStats: async (): Promise<SaleStats> => {
        return api.get<SaleStats>('/sales/stats');
    },
    getPdfUrl: (saleId: number, download: boolean = false): string => {
        const baseUrl = `/api/sales/${saleId}/pdf`;
        return download ? `${baseUrl}?download=true` : baseUrl;
    },
    sendEmail: async (saleId: number): Promise<{ success: boolean; message: string }> => {
        return api.requestRaw(`/sales/${saleId}/send-email`, {
            method: 'POST',
        });
    },
    saveDraft: async (data: CreateDraftData): Promise<Sale> => {
        return api.post<Sale>('/sales/draft', data);
    },
    updateDraft: async (saleId: number, data: CreateDraftData): Promise<Sale> => {
        return api.put<Sale>(`/sales/${saleId}/draft`, data);
    },
    finalizeDraft: async (saleId: number, data: CreateSaleData): Promise<Sale> => {
        return api.post<Sale>(`/sales/${saleId}/finalize`, data);
    },
    deleteDraft: async (saleId: number): Promise<void> => {
        await api.delete(`/sales/${saleId}/draft`);
    },
};

// Invoice Alert Types (header notifications)
export interface InvoiceAlertItem {
    id: number;
    invoice_number: string;
    client_id: number;
    total_amount: number;
    balance: number;
    due_date: string | null;
    type: SaleType;
    payment_status: SalePaymentStatus;
    client?: {
        id: number;
        name: string;
        document_id?: string;
    };
}

export interface InvoiceAlertCategory {
    count: number;
    items: InvoiceAlertItem[];
}

export interface InvoiceAlertData {
    overdue: InvoiceAlertCategory;
    due_soon: InvoiceAlertCategory;
    partial_payment: InvoiceAlertCategory;
    total_alerts: number;
}

export const invoiceAlertsApi = {
    getAlerts: async (): Promise<InvoiceAlertData> => {
        return api.get<InvoiceAlertData>('/invoice-alerts');
    },
};

// Purchase Alert Types (header notifications)
export interface PurchaseAlertItem {
    id: number;
    purchase_number: string;
    supplier_id: number;
    total_amount: number;
    balance_due: number;
    credit_due_date: string | null;
    status: string;
    payment_status: string;
    supplier?: {
        id: number;
        name: string;
        tax_id?: string;
    };
}

export interface PurchaseAlertCategory {
    count: number;
    items: PurchaseAlertItem[];
}

export interface PurchaseAlertData {
    overdue: PurchaseAlertCategory;
    due_soon: PurchaseAlertCategory;
    partial_payment: PurchaseAlertCategory;
    total_alerts: number;
}

export const purchaseAlertsApi = {
    getAlerts: async (): Promise<PurchaseAlertData> => {
        return api.get<PurchaseAlertData>('/purchase-alerts');
    },
};

// Electronic Invoicing API
export interface ElectronicInvoicingStatus {
    registered: boolean;
    registered_at?: string;
    has_token: boolean;
    token?: string;
    branch_data?: {
        tax_id?: string;
        type_document_identification_id?: number;
        type_organization_id?: number;
        type_regime_id?: number;
        type_liability_id?: number;
        municipality_id?: number;
        business_name?: string;
        merchant_registration?: string;
        address?: string;
        phone?: string;
        email?: string;
    } | null;
}

export interface SendInvoiceData {
    number: number;
    sync: boolean;
    type_document_id: number;
    resolution_id: number;
    environment?: { type_environment_id: number };
    customer: {
        identification_number: string;
        name: string;
        address?: string;
        email?: string;
        phone?: string;
        type_document_identification_id?: number;
        type_organization_id?: number;
        type_regime_id?: number;
        type_liabilitie_id?: number;
    };
    date: string;
    invoice_lines: Array<{
        unit_measure_id: number;
        invoiced_quantity: string;
        line_extension_amount: string;
        free_of_charge_indicator: boolean;
        description: string;
        code: string;
        type_item_identification_id: number;
        price_amount: string;
        base_quantity: string;
        tax_totals?: Array<{
            tax_id: number;
            tax_amount: string;
            taxable_amount: string;
            percent: string;
        }>;
        allowance_charges?: Array<{
            charge_indicator: boolean;
            allowance_charge_reason: string;
            amount: string;
            base_amount: string;
        }>;
    }>;
    legal_monetary_totals: {
        line_extension_amount: string;
        tax_exclusive_amount: string;
        tax_inclusive_amount: string;
        allowance_total_amount: string;
        charge_total_amount: string;
        payable_amount: string;
    };
    payment_forms?: Array<{
        payment_form_id: number;
        payment_method_id: number;
        payment_due_date?: string;
        duration_measure?: number;
    }>;
    notes?: Array<{ text: string }>;
}

export interface SendInvoiceResponse {
    success: boolean;
    is_valid: boolean;
    message?: string;
    data?: {
        uuid?: string;
        number?: string | number;
        issue_date?: string;
        xml_name?: string;
        zip_name?: string;
        pdf_base64_bytes?: string;
        qr_link?: string;
    };
    errors_messages?: string[];
    errors?: Record<string, string[]>;
}

export interface ElectronicInvoicingRegisterData {
    tax_id: string;
    type_document_identification_id: number;
    type_organization_id: number;
    type_regime_id: number;
    type_liability_id: number;
    municipality_id: number;
    business_name: string;
    merchant_registration: string;
    address: string;
    phone: string | number;
    email: string;
}

export interface ElectronicInvoicingUpdateData {
    type_organization_id: number;
    type_regime_id: number;
    type_liability_id: number;
    municipality_id: number;
    business_name: string;
    merchant_registration: string;
    address: string;
    phone: number;
    email: string;
}

export interface ElectronicInvoicingCatalogs {
    type_document_identifications: Array<{ id: number; name: string; code: string }>;
    type_organizations: Array<{ id: number; name: string; code: string }>;
    type_regimes: Array<{ id: number; name: string; code: string }>;
    type_liabilities: Array<{ id: number; name: string; code: string }>;
    municipalities: Array<{ id: number; name: string; code: string }>;
    departments: Array<{ code: string; name: string }>;
}

export interface ElectronicInvoicingRegisterResponse {
    success: boolean;
    message: string;
    data?: {
        tax_id: string;
        type_document_identification_id: number;
        type_organization_id: number;
        type_regime_id: number;
        type_liability_id: number;
        municipality_id: number;
        business_name: string;
        merchant_registration: string;
        address: string;
        phone: string;
        email: string;
    };
}

export const electronicInvoicingApi = {
    getStatus: async (): Promise<ElectronicInvoicingStatus> => {
        return api.getRaw<ElectronicInvoicingStatus>('/electronic-invoicing/status');
    },
    getCatalogs: async (): Promise<ElectronicInvoicingCatalogs> => {
        return api.get<ElectronicInvoicingCatalogs>('/electronic-invoicing/catalogs');
    },
    syncCatalogs: async (): Promise<{ success: boolean; message: string; synced: Record<string, number> }> => {
        return api.post('/electronic-invoicing/sync-catalogs');
    },
    register: async (data: ElectronicInvoicingRegisterData): Promise<ElectronicInvoicingRegisterResponse> => {
        return api.requestRaw<ElectronicInvoicingRegisterResponse>('/electronic-invoicing/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    update: async (data: ElectronicInvoicingUpdateData): Promise<ElectronicInvoicingRegisterResponse> => {
        return api.requestRaw<ElectronicInvoicingRegisterResponse>('/electronic-invoicing/register', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
    sendInvoice: async (data: SendInvoiceData): Promise<SendInvoiceResponse> => {
        return api.requestRaw<SendInvoiceResponse>('/electronic-invoicing/invoice', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    getConfig: async (): Promise<ElectronicInvoicingConfigResponse> => {
        return api.requestRaw<ElectronicInvoicingConfigResponse>('/electronic-invoicing/config');
    },
    updateConfig: async (data: ElectronicInvoicingConfigData): Promise<{ success: boolean; message: string }> => {
        return api.requestRaw<{ success: boolean; message: string }>('/electronic-invoicing/config', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
    getResolutions: async (): Promise<{ success: boolean; data?: any; message?: string }> => {
        return api.requestRaw('/electronic-invoicing/resolutions');
    },
    generateFromSale: async (saleId: number): Promise<GenerateFromSaleResponse> => {
        return api.requestRaw<GenerateFromSaleResponse>(`/electronic-invoicing/sales/${saleId}/generate`, {
            method: 'POST',
        });
    },
    generatePosFromSale: async (saleId: number): Promise<GenerateFromSaleResponse> => {
        return api.requestRaw<GenerateFromSaleResponse>(`/electronic-invoicing/sales/${saleId}/generate-pos`, {
            method: 'POST',
        });
    },
    getElectronicInvoicePdfUrl: (electronicInvoiceId: number): string => {
        return `/api/electronic-invoicing/${electronicInvoiceId}/pdf`;
    },
    voidInvoice: async (electronicInvoiceId: number): Promise<{ success: boolean; message: string; credit_note?: ElectronicCreditNoteData; electronic_invoices?: ElectronicInvoiceData[]; errors_messages?: string[]; errors?: Record<string, string[]> }> => {
        return api.requestRaw(`/electronic-invoicing/${electronicInvoiceId}/void`, {
            method: 'POST',
        });
    },
    getCreditNotePdfUrl: (creditNoteId: number): string => {
        return `/api/electronic-invoicing/credit-notes/${creditNoteId}/pdf`;
    },
    createDebitNote: async (
        electronicInvoiceId: number,
    ): Promise<{
        success: boolean;
        message: string;
        debit_note?: ElectronicDebitNoteData;
        electronic_invoices?: ElectronicInvoiceData[];
        errors_messages?: string[];
        errors?: Record<string, string[]>;
    }> => {
        return api.requestRaw(`/electronic-invoicing/${electronicInvoiceId}/debit-note`, {
            method: 'POST',
        });
    },
    createAdjustmentCreditNote: async (
        electronicInvoiceId: number,
    ): Promise<{
        success: boolean;
        message: string;
        credit_note?: ElectronicCreditNoteData;
        electronic_invoices?: ElectronicInvoiceData[];
        errors_messages?: string[];
        errors?: Record<string, string[]>;
    }> => {
        return api.requestRaw(`/electronic-invoicing/${electronicInvoiceId}/adjustment-credit-note`, {
            method: 'POST',
        });
    },
    getDebitNotePdfUrl: (debitNoteId: number): string => {
        return `/api/electronic-invoicing/debit-notes/${debitNoteId}/pdf`;
    },
    sendInvoiceEmail: async (electronicInvoiceId: number): Promise<{ success: boolean; message: string }> => {
        return api.requestRaw(`/electronic-invoicing/${electronicInvoiceId}/send-email`, {
            method: 'POST',
        });
    },
    sendCreditNoteEmail: async (creditNoteId: number): Promise<{ success: boolean; message: string }> => {
        return api.requestRaw(`/electronic-invoicing/credit-notes/${creditNoteId}/send-email`, {
            method: 'POST',
        });
    },
    sendDebitNoteEmail: async (debitNoteId: number): Promise<{ success: boolean; message: string }> => {
        return api.requestRaw(`/electronic-invoicing/debit-notes/${debitNoteId}/send-email`, {
            method: 'POST',
        });
    },

    // Status endpoints
    checkDocumentStatus: async (type: 'invoice' | 'credit_note' | 'debit_note' | 'payroll', id: number): Promise<DocumentStatusResponse> => {
        return api.requestRaw('/electronic-invoicing/check-status', {
            method: 'POST',
            body: JSON.stringify({ type, id }),
        });
    },
    getDocumentInformation: async (uuid: string): Promise<DocumentStatusResponse> => {
        return api.requestRaw(`/electronic-invoicing/status/document-information/${uuid}`, { method: 'POST' });
    },
    getDocumentNotes: async (uuid: string): Promise<DocumentStatusResponse> => {
        return api.requestRaw(`/electronic-invoicing/status/notes/${uuid}`, { method: 'POST' });
    },
    getDocumentEvents: async (uuid: string): Promise<DocumentStatusResponse> => {
        return api.requestRaw(`/electronic-invoicing/status/events/${uuid}`, { method: 'POST' });
    },
    getDocumentXml: async (uuid: string): Promise<DocumentStatusResponse> => {
        return api.requestRaw(`/electronic-invoicing/status/xml/${uuid}`, { method: 'POST' });
    },
    checkZipStatus: async (zipKey: string): Promise<DocumentStatusResponse> => {
        return api.requestRaw(`/electronic-invoicing/status/zip/${zipKey}`, { method: 'POST' });
    },
    getAcquirerData: async (): Promise<DocumentStatusResponse> => {
        return api.requestRaw('/electronic-invoicing/status/acquirer', { method: 'POST' });
    },
};

export interface DocumentStatusResponse {
    success: boolean;
    data?: {
        status_code?: string;
        status_description?: string;
        status_message?: string;
        uuid?: string;
        is_valid?: boolean;
        local_updated?: boolean;
        [key: string]: any;
    };
    message?: string;
}

export interface ElectronicInvoicingConfigData {
    resolution_id?: number | null;
    prefix?: string | null;
    consecutive_start?: number | null;
    consecutive_end?: number | null;
    // Credit Note numbering
    cn_prefix?: string | null;
    cn_consecutive_start?: number | null;
    cn_consecutive_end?: number | null;
    // Debit Note numbering
    dn_prefix?: string | null;
    dn_consecutive_start?: number | null;
    dn_consecutive_end?: number | null;
    // Receipt Acknowledgment numbering
    ar_prefix?: string | null;
    ar_consecutive_start?: number | null;
    ar_consecutive_end?: number | null;
    // Goods Receipt numbering
    rb_prefix?: string | null;
    rb_consecutive_start?: number | null;
    rb_consecutive_end?: number | null;
    // Express Acceptance numbering
    ea_prefix?: string | null;
    ea_consecutive_start?: number | null;
    ea_consecutive_end?: number | null;
    // Document Support
    ds_prefix?: string | null;
    ds_resolution?: string | null;
    ds_resolution_date?: string | null;
    ds_consecutive_start?: number | null;
    ds_consecutive_end?: number | null;
    ds_date_from?: string | null;
    ds_date_to?: string | null;
    // Document Support Credit Note
    ds_cn_prefix?: string | null;
    ds_cn_resolution?: string | null;
    ds_cn_resolution_date?: string | null;
    ds_cn_consecutive_start?: number | null;
    ds_cn_consecutive_end?: number | null;
    ds_cn_date_from?: string | null;
    ds_cn_date_to?: string | null;
    // POS Electronic Invoice
    pos_prefix?: string | null;
    pos_resolution_id?: string | null;
    pos_consecutive_start?: number | null;
    pos_consecutive_end?: number | null;
    pos_software_id?: string | null;
    pos_pin?: string | null;
    // POS Credit Note (anulación POS)
    pos_cn_prefix?: string | null;
    pos_cn_consecutive_start?: number | null;
    pos_cn_consecutive_end?: number | null;
    // Payroll (Nómina Electrónica) - global fields only
    payroll_software_id?: string | null;
    payroll_pin?: string | null;
}

export interface ElectronicInvoicingConfigResponse {
    success: boolean;
    data: {
        has_token: boolean;
        resolution_id: number | null;
        prefix: string | null;
        consecutive_start: number | null;
        consecutive_end: number | null;
        current_consecutive: number;
        // Credit Note numbering
        cn_prefix: string | null;
        cn_consecutive_start: number | null;
        cn_consecutive_end: number | null;
        cn_current_consecutive: number;
        // Debit Note numbering
        dn_prefix: string | null;
        dn_consecutive_start: number | null;
        dn_consecutive_end: number | null;
        dn_current_consecutive: number;
        // Receipt Acknowledgment numbering
        ar_prefix: string | null;
        ar_consecutive_start: number | null;
        ar_consecutive_end: number | null;
        ar_current_consecutive: number;
        // Goods Receipt numbering
        rb_prefix: string | null;
        rb_consecutive_start: number | null;
        rb_consecutive_end: number | null;
        rb_current_consecutive: number;
        // Document Support
        ds_prefix: string | null;
        ds_resolution: string | null;
        ds_resolution_date: string | null;
        ds_consecutive_start: number | null;
        ds_consecutive_end: number | null;
        ds_current_consecutive: number;
        ds_date_from: string | null;
        ds_date_to: string | null;
        // Document Support Credit Note
        ds_cn_prefix: string | null;
        ds_cn_resolution: string | null;
        ds_cn_resolution_date: string | null;
        ds_cn_consecutive_start: number | null;
        ds_cn_consecutive_end: number | null;
        ds_cn_current_consecutive: number;
        ds_cn_date_from: string | null;
        ds_cn_date_to: string | null;
        // POS Electronic Invoice
        pos_prefix: string | null;
        pos_resolution_id: string | null;
        pos_consecutive_start: number | null;
        pos_consecutive_end: number | null;
        pos_current_consecutive: number;
        pos_software_id: string | null;
        pos_pin: string | null;
        // POS Credit Note (anulación POS)
        pos_cn_prefix: string | null;
        pos_cn_consecutive_start: number | null;
        pos_cn_consecutive_end: number | null;
        pos_cn_current_consecutive: number;
        // Payroll (Nómina Electrónica) - global fields only
        payroll_software_id: string | null;
        payroll_pin: string | null;
        // Payroll numbering ranges
        payroll_numbering_ranges: PayrollNumberingRangeData[];
    };
}

export interface ElectronicCreditNoteData {
    id: number;
    electronic_invoice_id: number;
    type: 'void' | 'adjustment';
    number: string | null;
    uuid: string | null;
    issue_date: string | null;
    status_description: string | null;
    status_message: string | null;
    qr_link: string | null;
    email_status?: 'sent' | 'pending' | null;
    created_at: string;
    updated_at: string;
}

export interface ElectronicDebitNoteData {
    id: number;
    electronic_invoice_id: number;
    number: string | null;
    uuid: string | null;
    issue_date: string | null;
    status_description: string | null;
    status_message: string | null;
    qr_link: string | null;
    email_status?: 'sent' | 'pending' | null;
    created_at: string;
    updated_at: string;
}

export interface ElectronicInvoiceData {
    id: number;
    sale_id: number;
    number: string | null;
    uuid: string | null;
    issue_date: string | null;
    expedition_date: string | null;
    status_description: string | null;
    status_message: string | null;
    xml_name: string | null;
    zip_name: string | null;
    qr_link: string | null;
    credit_note?: ElectronicCreditNoteData | null;
    debit_note?: ElectronicDebitNoteData | null;
    email_status?: 'sent' | 'pending' | null;
    created_at: string;
    updated_at: string;
}

export interface GenerateFromSaleResponse {
    success: boolean;
    message: string;
    electronic_invoice?: ElectronicInvoiceData;
    electronic_invoices?: ElectronicInvoiceData[];
    consecutive?: number;
    errors_messages?: string[];
    errors?: Record<string, string[]>;
}

// Habilitación DIAN
export interface HabilitacionDocumentResult {
    number: string | number | null;
    uuid: string | null;
    issue_date: string | null;
    success: boolean;
}

export interface HabilitacionStatus {
    success: boolean;
    data: {
        registered: boolean;
        has_token: boolean;
        environment: number;
        test_uuid: string | null;
        has_certificate: boolean;
        software_id: string | null;
        pin: string | null;
        environment_set: boolean;
        invoices: HabilitacionDocumentResult[];
        credit_note: HabilitacionDocumentResult | null;
        debit_note: HabilitacionDocumentResult | null;
        can_enable_production: boolean;
        is_production: boolean;
    };
}

export interface SetEnvironmentData {
    type_environment_id: number;
    software_id: string;
    pin: string;
    certificate: string;
    certificate_password: string;
}

export interface HabilitacionResponse {
    success: boolean;
    message: string;
    data?: {
        number?: string | number | null;
        uuid?: string | null;
        issue_date?: string | null;
    };
    errors_messages?: string[];
}

export const habilitacionApi = {
    getStatus: async (): Promise<HabilitacionStatus> => {
        return api.requestRaw<HabilitacionStatus>('/electronic-invoicing/habilitacion/status');
    },
    setEnvironment: async (data: SetEnvironmentData): Promise<HabilitacionResponse> => {
        return api.requestRaw<HabilitacionResponse>('/electronic-invoicing/habilitacion/set-environment', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    sendInvoice: async (): Promise<HabilitacionResponse> => {
        return api.requestRaw<HabilitacionResponse>('/electronic-invoicing/habilitacion/send-invoice', {
            method: 'POST',
        });
    },
    sendCreditNote: async (): Promise<HabilitacionResponse> => {
        return api.requestRaw<HabilitacionResponse>('/electronic-invoicing/habilitacion/send-credit-note', {
            method: 'POST',
        });
    },
    sendDebitNote: async (): Promise<HabilitacionResponse> => {
        return api.requestRaw<HabilitacionResponse>('/electronic-invoicing/habilitacion/send-debit-note', {
            method: 'POST',
        });
    },
    enableProduction: async (): Promise<HabilitacionResponse> => {
        return api.requestRaw<HabilitacionResponse>('/electronic-invoicing/habilitacion/enable-production', {
            method: 'POST',
        });
    },
};

// Profile API
export const profileApi = {
    update: async (data: { name?: string; phone?: string }): Promise<User> => {
        return api.put<User>('/profile', data);
    },
    updatePassword: async (data: {
        current_password: string;
        password: string;
        password_confirmation: string;
    }): Promise<{ message: string }> => {
        return api.put<{ message: string }>('/profile/password', data);
    },
};

// Company Settings API
export interface CompanySettingsResponse {
    settings: Record<string, unknown>;
    company_name: string;
    company_id: number;
}

export const companySettingsApi = {
    get: async (): Promise<CompanySettingsResponse> => {
        return api.get<CompanySettingsResponse>('/company-settings');
    },
    update: async (settings: Record<string, unknown>): Promise<{ settings: Record<string, unknown> }> => {
        return api.put<{ settings: Record<string, unknown> }>('/company-settings', { settings });
    },
    uploadLogo: async (file: File): Promise<{ logo_url: string }> => {
        const formData = new FormData();
        formData.append('logo', file);
        return api.postFile<{ logo_url: string }>('/company-settings/logo', formData);
    },
    deleteLogo: async (): Promise<{ logo_url: null }> => {
        return api.delete<{ logo_url: null }>('/company-settings/logo');
    },
    uploadLogoIcon: async (file: File): Promise<{ logo_icon_url: string }> => {
        const formData = new FormData();
        formData.append('logo_icon', file);
        return api.postFile<{ logo_icon_url: string }>('/company-settings/logo-icon', formData);
    },
    deleteLogoIcon: async (): Promise<{ logo_icon_url: null }> => {
        return api.delete<{ logo_icon_url: null }>('/company-settings/logo-icon');
    },
    uploadBirthdayImage: async (file: File): Promise<{ url: string }> => {
        const formData = new FormData();
        formData.append('image', file);
        return api.postFile<{ url: string }>('/company-settings/birthday-image', formData);
    },
    deleteBirthdayImage: async (): Promise<void> => {
        return api.delete<void>('/company-settings/birthday-image');
    },
};

// Reports API
export interface SalesProductReportItem {
    product_id: number;
    product_name: string;
    sku: string | null;
    purchase_price: number;
    category_name: string | null;
    total_quantity: number;
    total_subtotal: number;
    total_discount: number;
    total_tax: number;
    total_amount: number;
    sales_count: number;
}

export interface SalesProductReportTotals {
    total_quantity: number;
    total_subtotal: number;
    total_discount: number;
    total_tax: number;
    total_amount: number;
    total_sales_count: number;
}

export interface SalesProductReport {
    items: SalesProductReportItem[];
    totals: SalesProductReportTotals;
}

export interface ProductInvoiceDetail {
    sale_id: number;
    invoice_number: string;
    invoice_date: string;
    client_name: string | null;
    quantity: number;
    unit_price: number;
    total: number;
}

// Best Sellers
export interface BestSellerItem {
    rank: number;
    product_id: number;
    product_name: string;
    sku: string | null;
    category_name: string | null;
    current_price: number;
    total_quantity: number;
    total_amount: number;
    sales_count: number;
    avg_price: number;
    quantity_percentage: number;
    amount_percentage: number;
}

export interface BestSellersReport {
    items: BestSellerItem[];
    totals: {
        total_quantity: number;
        total_amount: number;
        products_count: number;
    };
}

// Top Clients
export interface TopClientItem {
    rank: number;
    client_id: number;
    client_name: string;
    email: string | null;
    phone: string | null;
    sales_count: number;
    total_amount: number;
    total_paid: number;
    total_balance: number;
    avg_ticket: number;
    last_purchase_date: string;
    amount_percentage: number;
}

export interface TopClientsReport {
    items: TopClientItem[];
    totals: {
        total_amount: number;
        total_paid: number;
        total_balance: number;
        clients_count: number;
    };
}

// Product Profit
export interface ProductProfitItem {
    product_id: number;
    product_name: string;
    sku: string | null;
    category_name: string | null;
    total_quantity: number;
    avg_sale_price: number;
    cost_per_unit: number;
    total_revenue: number;
    total_cost: number;
    profit: number;
    margin_percent: number;
}

export interface ProductProfitReport {
    items: ProductProfitItem[];
    totals: {
        total_revenue: number;
        total_cost: number;
        total_profit: number;
        avg_margin: number;
        products_count: number;
    };
}

// Monthly Growth
export interface MonthlyGrowthItem {
    month: number;
    month_name: string;
    sales_count: number;
    total_amount: number;
    total_paid: number;
    avg_ticket: number;
    prev_year_amount: number;
    prev_year_sales_count: number;
    growth_percent: number;
}

export interface MonthlyGrowthReport {
    months: MonthlyGrowthItem[];
    year: number;
    totals: {
        year_total: number;
        prev_year_total: number;
        year_sales_count: number;
        prev_year_sales_count: number;
        year_growth: number;
    };
}

// Tax Collection
export interface TaxRateItem {
    tax_rate: number;
    taxable_base: number;
    tax_collected: number;
    total_with_tax: number;
    sales_count: number;
}

export interface TaxMonthlyItem {
    year: number;
    month: number;
    month_name: string;
    period: string;
    taxable_base: number;
    tax_collected: number;
    total_with_tax: number;
}

export interface TaxCollectionReport {
    by_tax_rate: TaxRateItem[];
    monthly: TaxMonthlyItem[];
    totals: {
        taxable_base: number;
        tax_collected: number;
        total_with_tax: number;
        effective_rate: number;
    };
}

// Income & Expenses
export interface IncomeExpensePeriod {
    year: number;
    month: number;
    period: string;
    income: number;
    income_count: number;
    income_paid: number;
    expense: number;
    expense_count: number;
    expense_paid: number;
    net: number;
}

export interface IncomeExpensesReport {
    periods: IncomeExpensePeriod[];
    totals: {
        total_income: number;
        total_income_paid: number;
        total_expense: number;
        total_expense_paid: number;
        net: number;
        income_count: number;
        expense_count: number;
    };
}

export interface IncomeExpenseDetailSale {
    id: number;
    invoice_number: string;
    date: string;
    client_name: string | null;
    total_amount: number;
    paid_amount: number;
    payment_status: string;
}

export interface IncomeExpenseDetailPurchase {
    id: number;
    purchase_number: string;
    date: string;
    supplier_name: string | null;
    total_amount: number;
    total_paid: number;
    payment_status: string;
    status: string;
}

export interface IncomeExpenseDetail {
    sales: IncomeExpenseDetailSale[];
    purchases: IncomeExpenseDetailPurchase[];
}

// Payments Report
export interface PaymentReportItem {
    id: number;
    payment_number: string;
    payment_date: string;
    amount: number;
    type: 'income' | 'expense';
    is_partial: boolean;
    status: string;
    notes: string | null;
    payment_method_name: string | null;
    created_by_name: string | null;
    cash_register_name: string | null;
    reference_label: string | null;
    reference_path: string | null;
}

export interface PaymentsReport {
    items: PaymentReportItem[];
    totals: {
        total_income: number;
        total_expense: number;
        net: number;
        total_count: number;
        income_count: number;
        expense_count: number;
    };
}

export interface ExpenseDistributionExpenseItem {
    id: number;
    payment_number: string;
    payment_date: string;
    amount: number;
    concept: string | null;
    notes: string | null;
    payment_method_name: string | null;
    created_by_name: string | null;
    cash_register_name: string | null;
}

export interface ExpenseDistributionInvoiceItem {
    id: number;
    invoice_number: string;
    invoice_date: string;
    type: string;
    type_label: string;
    status: string;
    client_name: string | null;
    total_amount: number;
    effective_total: number;
    payment_status: string;
    weight: number;
    expense_share: number;
    expense_percentage: number;
}

export interface ExpenseDistributionReport {
    expenses: ExpenseDistributionExpenseItem[];
    invoices: ExpenseDistributionInvoiceItem[];
    totals: {
        total_expenses: number;
        total_income: number;
        total_invoices_effective: number;
        invoice_count: number;
        expense_count: number;
        avg_expense_per_invoice: number;
    };
}

export interface CommissionSellerItem {
    seller_id: number;
    seller_name: string;
    sales_count: number;
    total_sales: number;
    total_commission: number;
    avg_percentage: number;
}

export interface CommissionSaleItem {
    id: number;
    sale_number: string;
    created_at: string;
    client_name: string | null;
    seller_name: string;
    total_amount: number;
    commission_percentage: number;
    commission_amount: number;
}

export interface CommissionsReport {
    sellers: CommissionSellerItem[];
    sales: CommissionSaleItem[];
    totals: {
        total_sales_amount: number;
        total_commission: number;
        sales_count: number;
        sellers_count: number;
        avg_percentage: number;
    };
}

export interface InventoryReportItem {
    product_id: number;
    product_name: string;
    sku: string | null;
    category_name: string | null;
    current_stock: number;
    min_stock: number;
    max_stock: number | null;
    purchase_price: number;
    average_cost: number;
    sale_price: number;
    tax_rate: number;
    total_cost: number;
    iva_amount: number;
    stock_status: 'low' | 'normal' | 'over';
}

export interface InventoryReportCategory {
    category_name: string;
    product_count: number;
    total_units: number;
    total_cost: number;
    total_iva: number;
}

export interface InventoryReport {
    totals: {
        total_products: number;
        total_units: number;
        total_cost: number;
        total_iva: number;
        low_stock_count: number;
        over_stock_count: number;
    };
    by_category: InventoryReportCategory[];
    items: InventoryReportItem[];
}

export interface PriceHistoryItem {
    id: number;
    product_id: number;
    product_name: string;
    sku: string | null;
    category_name: string | null;
    old_value: number;
    new_value: number;
    change_amount: number;
    change_percent: number;
    reason: string | null;
    reference_type: string | null;
    reference_id: number | null;
    changed_by_name: string;
    created_at: string;
}

export interface PriceHistoryByProduct {
    product_name: string;
    changes_count: number;
    first_value: number;
    last_value: number;
    net_change: number;
}

export interface PriceHistoryReport {
    totals: {
        total_changes: number;
        products_affected: number;
        avg_change_percent: number;
        increases: number;
        decreases: number;
    };
    items: PriceHistoryItem[];
    by_product: PriceHistoryByProduct[];
}

export const reportsApi = {
    salesByProduct: async (params: {
        date_from: string;
        date_to: string;
        category_id?: number;
        product_id?: number;
    }): Promise<SalesProductReport> => {
        const qp = new URLSearchParams({
            date_from: params.date_from,
            date_to: params.date_to,
        });
        if (params.category_id) qp.set('category_id', params.category_id.toString());
        if (params.product_id) qp.set('product_id', params.product_id.toString());
        return api.get<SalesProductReport>(`/reports/sales-products?${qp}`);
    },
    invoicesByProduct: async (productId: number, params: {
        date_from: string;
        date_to: string;
    }): Promise<ProductInvoiceDetail[]> => {
        const qp = new URLSearchParams({
            date_from: params.date_from,
            date_to: params.date_to,
        });
        return api.get<ProductInvoiceDetail[]>(`/reports/sales-products/${productId}/invoices?${qp}`);
    },
    bestSellers: async (params: {
        date_from: string;
        date_to: string;
        category_id?: number;
        limit?: number;
        order_by?: 'quantity' | 'amount';
    }): Promise<BestSellersReport> => {
        const qp = new URLSearchParams({ date_from: params.date_from, date_to: params.date_to });
        if (params.category_id) qp.set('category_id', params.category_id.toString());
        if (params.limit) qp.set('limit', params.limit.toString());
        if (params.order_by) qp.set('order_by', params.order_by);
        return api.get<BestSellersReport>(`/reports/best-sellers?${qp}`);
    },
    topClients: async (params: {
        date_from: string;
        date_to: string;
        limit?: number;
        order_by?: 'amount' | 'count';
    }): Promise<TopClientsReport> => {
        const qp = new URLSearchParams({ date_from: params.date_from, date_to: params.date_to });
        if (params.limit) qp.set('limit', params.limit.toString());
        if (params.order_by) qp.set('order_by', params.order_by);
        return api.get<TopClientsReport>(`/reports/top-clients?${qp}`);
    },
    productProfit: async (params: {
        date_from: string;
        date_to: string;
        category_id?: number;
    }): Promise<ProductProfitReport> => {
        const qp = new URLSearchParams({ date_from: params.date_from, date_to: params.date_to });
        if (params.category_id) qp.set('category_id', params.category_id.toString());
        return api.get<ProductProfitReport>(`/reports/product-profit?${qp}`);
    },
    monthlyGrowth: async (params: {
        year: number;
    }): Promise<MonthlyGrowthReport> => {
        return api.get<MonthlyGrowthReport>(`/reports/monthly-growth?year=${params.year}`);
    },
    taxCollection: async (params: {
        date_from: string;
        date_to: string;
    }): Promise<TaxCollectionReport> => {
        const qp = new URLSearchParams({ date_from: params.date_from, date_to: params.date_to });
        return api.get<TaxCollectionReport>(`/reports/tax-collection?${qp}`);
    },
    incomeExpenses: async (params: {
        date_from: string;
        date_to: string;
    }): Promise<IncomeExpensesReport> => {
        const qp = new URLSearchParams({ date_from: params.date_from, date_to: params.date_to });
        return api.get<IncomeExpensesReport>(`/reports/income-expenses?${qp}`);
    },
    incomeExpensesDetail: async (params: {
        year: number;
        month: number;
        date_from: string;
        date_to: string;
    }): Promise<IncomeExpenseDetail> => {
        const qp = new URLSearchParams({
            year: params.year.toString(),
            month: params.month.toString(),
            date_from: params.date_from,
            date_to: params.date_to,
        });
        return api.get<IncomeExpenseDetail>(`/reports/income-expenses/detail?${qp}`);
    },
    payments: async (params: {
        date_from: string;
        date_to: string;
        type?: 'income' | 'expense';
        payment_method_id?: number;
    }): Promise<PaymentsReport> => {
        const qp = new URLSearchParams({ date_from: params.date_from, date_to: params.date_to });
        if (params.type) qp.set('type', params.type);
        if (params.payment_method_id) qp.set('payment_method_id', params.payment_method_id.toString());
        return api.get<PaymentsReport>(`/reports/payments?${qp}`);
    },
    entries: async (params: {
        date_from: string;
        date_to: string;
        payment_method_id?: number;
    }): Promise<PaymentsReport> => {
        const qp = new URLSearchParams({ date_from: params.date_from, date_to: params.date_to });
        if (params.payment_method_id) qp.set('payment_method_id', params.payment_method_id.toString());
        return api.get<PaymentsReport>(`/reports/entries?${qp}`);
    },
    expenses: async (params: {
        date_from: string;
        date_to: string;
        payment_method_id?: number;
    }): Promise<PaymentsReport> => {
        const qp = new URLSearchParams({ date_from: params.date_from, date_to: params.date_to });
        if (params.payment_method_id) qp.set('payment_method_id', params.payment_method_id.toString());
        return api.get<PaymentsReport>(`/reports/expenses?${qp}`);
    },
    expenseDistribution: async (params: {
        date_from: string;
        date_to: string;
    }): Promise<ExpenseDistributionReport> => {
        const qp = new URLSearchParams({ date_from: params.date_from, date_to: params.date_to });
        return api.get<ExpenseDistributionReport>(`/reports/expense-distribution?${qp}`);
    },
    commissions: async (params: {
        date_from: string;
        date_to: string;
        seller_id?: number;
    }): Promise<CommissionsReport> => {
        const qp = new URLSearchParams({ date_from: params.date_from, date_to: params.date_to });
        if (params.seller_id) qp.set('seller_id', params.seller_id.toString());
        return api.get<CommissionsReport>(`/reports/commissions?${qp}`);
    },
    inventory: async (params?: {
        category_id?: number;
        search?: string;
        stock_status?: 'all' | 'low' | 'normal' | 'over';
    }): Promise<InventoryReport> => {
        const qp = new URLSearchParams();
        if (params?.category_id) qp.set('category_id', params.category_id.toString());
        if (params?.search) qp.set('search', params.search);
        if (params?.stock_status && params.stock_status !== 'all') qp.set('stock_status', params.stock_status);
        const qs = qp.toString();
        return api.get<InventoryReport>(`/reports/inventory${qs ? '?' + qs : ''}`);
    },
    costHistory: async (params: {
        date_from: string;
        date_to: string;
        product_id?: number;
        category_id?: number;
    }): Promise<PriceHistoryReport> => {
        const qp = new URLSearchParams();
        qp.set('date_from', params.date_from);
        qp.set('date_to', params.date_to);
        if (params.product_id) qp.set('product_id', params.product_id.toString());
        if (params.category_id) qp.set('category_id', params.category_id.toString());
        return api.get<PriceHistoryReport>(`/reports/cost-history?${qp.toString()}`);
    },
    salePriceHistory: async (params: {
        date_from: string;
        date_to: string;
        product_id?: number;
        category_id?: number;
    }): Promise<PriceHistoryReport> => {
        const qp = new URLSearchParams();
        qp.set('date_from', params.date_from);
        qp.set('date_to', params.date_to);
        if (params.product_id) qp.set('product_id', params.product_id.toString());
        if (params.category_id) qp.set('category_id', params.category_id.toString());
        return api.get<PriceHistoryReport>(`/reports/sale-price-history?${qp.toString()}`);
    },
    exportReport: async (params: {
        format: 'pdf' | 'excel';
        report_type: string;
        date_from?: string;
        date_to?: string;
        category_id?: number;
        product_id?: number;
        order_by?: string;
        year?: number;
        type?: string;
        payment_method_id?: number;
        seller_id?: number;
        search?: string;
        stock_status?: string;
        limit?: number;
    }): Promise<Blob> => {
        const token = localStorage.getItem('auth_token');
        const csrfMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : undefined;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': params.format === 'pdf'
                ? 'application/pdf'
                : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'X-Requested-With': 'XMLHttpRequest',
        };

        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (csrfToken) headers['X-XSRF-TOKEN'] = csrfToken;

        const response = await fetch(`${API_BASE_URL}/reports/export`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            try {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            } catch {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        }
        return response.blob();
    },
    exportAnalytics: async (params: {
        format: 'pdf' | 'excel';
        date_from: string;
        date_to: string;
        sections?: string[];
    }): Promise<Blob> => {
        const token = localStorage.getItem('auth_token');
        const csrfMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
        const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : undefined;

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': params.format === 'pdf'
                ? 'application/pdf'
                : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'X-Requested-With': 'XMLHttpRequest',
        };

        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (csrfToken) headers['X-XSRF-TOKEN'] = csrfToken;

        const response = await fetch(`${API_BASE_URL}/reports/analytics/export`, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            try {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            } catch {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        }
        return response.blob();
    },
};

// ============================================================
// Accounting API
// ============================================================

import type {
    AccountingAccount,
    JournalEntry,
    AccountingPeriod,
    AccountingSaleTypeMapping,
    TrialBalanceRow,
    GeneralLedgerRow,
    GeneralLedgerResponse,
    IncomeStatementSection,
    BalanceSheetSection,
    AccountSubledgerEntry,
    ThirdPartySubledgerEntry,
} from '@/types';

export const accountingApi = {
    accounts: {
        getAll: async (params?: Record<string, string>) => {
            const qs = params ? '?' + new URLSearchParams(params).toString() : '';
            const response = await api.get<AccountingAccount[] | PaginatedResponse<AccountingAccount>>(`/accounting/accounts${qs}`);
            return extractData(response);
        },
        getTree: async (): Promise<AccountingAccount[]> => {
            return api.get<AccountingAccount[]>('/accounting/accounts/tree');
        },
        getLeaf: async (params?: Record<string, string>): Promise<AccountingAccount[]> => {
            const qs = params ? '?' + new URLSearchParams(params).toString() : '';
            return api.get<AccountingAccount[]>(`/accounting/accounts/leaf${qs}`);
        },
        getById: async (id: number): Promise<AccountingAccount> => {
            return api.get<AccountingAccount>(`/accounting/accounts/${id}`);
        },
        create: async (data: Partial<AccountingAccount>): Promise<AccountingAccount> => {
            return api.post<AccountingAccount>('/accounting/accounts', data);
        },
        update: async (id: number, data: Partial<AccountingAccount>): Promise<AccountingAccount> => {
            return api.put<AccountingAccount>(`/accounting/accounts/${id}`, data);
        },
        delete: async (id: number): Promise<void> => {
            return api.delete(`/accounting/accounts/${id}`);
        },
        linkCashRegister: async (accountId: number, cashRegisterId: number): Promise<void> => {
            return api.post(`/accounting/accounts/${accountId}/link-cash-register`, { cash_register_id: cashRegisterId });
        },
        unlinkCashRegister: async (accountId: number, cashRegisterId: number): Promise<void> => {
            return api.delete(`/accounting/accounts/${accountId}/unlink-cash-register/${cashRegisterId}`);
        },
        linkSupplier: async (accountId: number, supplierId: number): Promise<void> => {
            return api.post(`/accounting/accounts/${accountId}/link-supplier`, { supplier_id: supplierId });
        },
        unlinkSupplier: async (accountId: number, supplierId: number): Promise<void> => {
            return api.delete(`/accounting/accounts/${accountId}/unlink-supplier/${supplierId}`);
        },
        exportPlan: async (params: { format: 'pdf' | 'excel' }): Promise<Blob> => {
            const token = localStorage.getItem('auth_token');
            const csrfMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
            const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : undefined;

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Accept': params.format === 'pdf'
                    ? 'application/pdf'
                    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'X-Requested-With': 'XMLHttpRequest',
            };

            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (csrfToken) headers['X-XSRF-TOKEN'] = csrfToken;

            const response = await fetch(`${API_BASE_URL}/accounting/accounts/export`, {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
                } catch {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
            return response.blob();
        },
    },

    journalEntries: {
        getAll: async (params?: Record<string, string>) => {
            const qs = params ? '?' + new URLSearchParams(params).toString() : '';
            const response = await api.get<JournalEntry[] | PaginatedResponse<JournalEntry>>(`/accounting/journal-entries${qs}`);
            return extractData(response);
        },
        getById: async (id: number): Promise<JournalEntry> => {
            return api.get<JournalEntry>(`/accounting/journal-entries/${id}`);
        },
        create: async (data: { date: string; description: string; notes?: string; auto_post?: boolean; lines: { account_id: number; debit: number; credit: number; description?: string }[] }): Promise<JournalEntry> => {
            return api.post<JournalEntry>('/accounting/journal-entries', data);
        },
        post: async (id: number): Promise<JournalEntry> => {
            return api.post<JournalEntry>(`/accounting/journal-entries/${id}/post`);
        },
        void: async (id: number, reason: string): Promise<JournalEntry> => {
            return api.post<JournalEntry>(`/accounting/journal-entries/${id}/void`, { void_reason: reason });
        },
        exportEntries: async (params: { format: 'pdf' | 'excel'; status?: string; source?: string; date_from?: string; date_to?: string; search?: string }): Promise<Blob> => {
            const token = localStorage.getItem('auth_token');
            const csrfMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
            const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : undefined;

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Accept': params.format === 'pdf'
                    ? 'application/pdf'
                    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'X-Requested-With': 'XMLHttpRequest',
            };

            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (csrfToken) headers['X-XSRF-TOKEN'] = csrfToken;

            const response = await fetch(`${API_BASE_URL}/accounting/journal-entries/export`, {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.blob();
        },
        exportSingle: async (id: number, format: 'pdf' | 'excel'): Promise<Blob> => {
            const token = localStorage.getItem('auth_token');
            const csrfMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
            const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : undefined;

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Accept': format === 'pdf'
                    ? 'application/pdf'
                    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'X-Requested-With': 'XMLHttpRequest',
            };

            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (csrfToken) headers['X-XSRF-TOKEN'] = csrfToken;

            const response = await fetch(`${API_BASE_URL}/accounting/journal-entries/${id}/export`, {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify({ format }),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.blob();
        },
    },

    reports: {
        trialBalance: async (dateFrom: string, dateTo: string): Promise<TrialBalanceRow[]> => {
            return api.get<TrialBalanceRow[]>(`/accounting/reports/trial-balance?date_from=${dateFrom}&date_to=${dateTo}`);
        },
        generalLedger: async (accountId: number, dateFrom: string, dateTo: string): Promise<GeneralLedgerResponse> => {
            return api.get<GeneralLedgerResponse>(`/accounting/reports/general-ledger?account_id=${accountId}&date_from=${dateFrom}&date_to=${dateTo}`);
        },
        journalBook: async (dateFrom: string, dateTo: string): Promise<JournalEntry[]> => {
            return api.get<JournalEntry[]>(`/accounting/reports/journal-book?date_from=${dateFrom}&date_to=${dateTo}`);
        },
        incomeStatement: async (dateFrom: string, dateTo: string): Promise<IncomeStatementSection[]> => {
            return api.get<IncomeStatementSection[]>(`/accounting/reports/income-statement?date_from=${dateFrom}&date_to=${dateTo}`);
        },
        balanceSheet: async (dateFrom: string, dateTo: string): Promise<BalanceSheetSection[]> => {
            return api.get<BalanceSheetSection[]>(`/accounting/reports/balance-sheet?date_from=${dateFrom}&date_to=${dateTo}`);
        },
        accountSubledger: async (dateFrom: string, dateTo: string, codeFrom?: string, codeTo?: string): Promise<AccountSubledgerEntry[]> => {
            let url = `/accounting/reports/account-subledger?date_from=${dateFrom}&date_to=${dateTo}`;
            if (codeFrom) url += `&code_from=${codeFrom}`;
            if (codeTo) url += `&code_to=${codeTo}`;
            return api.get<AccountSubledgerEntry[]>(url);
        },
        thirdPartySubledger: async (dateFrom: string, dateTo: string, accountId?: number, thirdPartyType?: string, thirdPartyId?: number): Promise<ThirdPartySubledgerEntry[]> => {
            let url = `/accounting/reports/third-party-subledger?date_from=${dateFrom}&date_to=${dateTo}`;
            if (accountId) url += `&account_id=${accountId}`;
            if (thirdPartyType && thirdPartyId) url += `&third_party_type=${thirdPartyType}&third_party_id=${thirdPartyId}`;
            return api.get<ThirdPartySubledgerEntry[]>(url);
        },
        exportReport: async (params: {
            format: 'pdf' | 'excel';
            report_type: string;
            date_from: string;
            date_to: string;
            account_id?: number;
            code_from?: string;
            code_to?: string;
        }): Promise<Blob> => {
            await api.initCsrf();

            const token = localStorage.getItem('auth_token');
            const csrfMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
            const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : undefined;

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Accept': params.format === 'pdf'
                    ? 'application/pdf'
                    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'X-Requested-With': 'XMLHttpRequest',
            };

            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (csrfToken) headers['X-XSRF-TOKEN'] = csrfToken;

            const response = await fetch(`${API_BASE_URL}/accounting/reports/export`, {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
                } catch {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
            return response.blob();
        },
        exportThirdPartySubledger: async (params: {
            format: 'pdf' | 'excel';
            date_from: string;
            date_to: string;
            account_id?: number;
            third_party_type?: string;
            third_party_id?: number;
        }): Promise<Blob> => {
            const token = localStorage.getItem('auth_token');
            const csrfMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
            const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : undefined;

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Accept': params.format === 'pdf'
                    ? 'application/pdf'
                    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'X-Requested-With': 'XMLHttpRequest',
            };

            if (token) headers['Authorization'] = `Bearer ${token}`;
            if (csrfToken) headers['X-XSRF-TOKEN'] = csrfToken;

            const response = await fetch(`${API_BASE_URL}/accounting/reports/third-party-subledger/export`, {
                method: 'POST',
                headers,
                credentials: 'include',
                body: JSON.stringify(params),
            });

            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
                } catch {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            }
            return response.blob();
        },
    },

    periods: {
        getAll: async (): Promise<AccountingPeriod[]> => {
            return api.get<AccountingPeriod[]>('/accounting/periods');
        },
        close: async (year: number, month: number): Promise<AccountingPeriod> => {
            return api.post<AccountingPeriod>('/accounting/periods/close', { year, month });
        },
        reopen: async (id: number): Promise<AccountingPeriod> => {
            return api.post<AccountingPeriod>(`/accounting/periods/${id}/reopen`);
        },
    },

    config: {
        getSaleTypeAccounts: async (): Promise<AccountingSaleTypeMapping[]> => {
            return api.get<AccountingSaleTypeMapping[]>('/accounting/config/sale-type-accounts');
        },
        updateSaleTypeAccounts: async (mappings: { transaction_type: string; accounting_account_id: number }[]): Promise<void> => {
            return api.put('/accounting/config/sale-type-accounts', { mappings });
        },
        getCashRegisterAccounts: async (): Promise<{ cash_register: { id: number; name: string; type: string; bank_name?: string }; account?: { id: number; code: string; name: string } }[]> => {
            return api.get('/accounting/config/cash-register-accounts');
        },
        getSupplierAccounts: async (): Promise<{ supplier: { id: number; name: string; document_number?: string }; account?: { id: number; code: string; name: string } }[]> => {
            return api.get('/accounting/config/supplier-accounts');
        },
    },
};

// ==================== Appointments (Calendar) ====================

export interface CreateAppointmentData {
    title: string;
    description?: string;
    type: string;
    status?: string;
    priority?: string;
    starts_at: string;
    ends_at?: string;
    all_day?: boolean;
    client_id?: number | null;
    supplier_id?: number | null;
    related_sale_id?: number | null;
    color?: string;
    location?: string;
    notes?: string;
    reminders?: { remind_at: string }[];
}

import type { Appointment, AppointmentReminder, CalendarDateRangeData, CalendarRemindersCount } from '@/types';

export const appointmentsApi = {
    getAll: async (params?: {
        type?: string;
        status?: string;
        priority?: string;
        client_id?: number;
        date_from?: string;
        date_to?: string;
        search?: string;
        per_page?: number;
        page?: number;
    }): Promise<{ data: Appointment[]; current_page: number; last_page: number; total: number }> => {
        const queryParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    queryParams.append(key, String(value));
                }
            });
        }
        const qs = queryParams.toString();
        return api.getRaw(`/appointments${qs ? `?${qs}` : ''}`);
    },

    getById: async (id: number): Promise<Appointment> => {
        return api.get<Appointment>(`/appointments/${id}`);
    },

    getByDateRange: async (dateFrom: string, dateTo: string): Promise<CalendarDateRangeData> => {
        return api.get<CalendarDateRangeData>(`/appointments/by-date-range?date_from=${dateFrom}&date_to=${dateTo}`);
    },

    getUpcoming: async (limit?: number): Promise<Appointment[]> => {
        return api.get<Appointment[]>(`/appointments/upcoming${limit ? `?limit=${limit}` : ''}`);
    },

    create: async (data: CreateAppointmentData): Promise<Appointment> => {
        return api.post<Appointment>('/appointments', data);
    },

    update: async (id: number, data: Partial<CreateAppointmentData>): Promise<Appointment> => {
        return api.put<Appointment>(`/appointments/${id}`, data);
    },

    updateStatus: async (id: number, status: string): Promise<Appointment> => {
        return api.patch<Appointment>(`/appointments/${id}/status`, { status });
    },

    delete: async (id: number): Promise<void> => {
        return api.delete(`/appointments/${id}`);
    },

    getTypes: async (): Promise<{ types: Record<string, string>; statuses: Record<string, string>; priorities: Record<string, string> }> => {
        return api.get('/appointments/types');
    },

    // Reminders
    getReminders: async (): Promise<AppointmentReminder[]> => {
        return api.get<AppointmentReminder[]>('/appointment-reminders');
    },

    getRemindersCount: async (): Promise<CalendarRemindersCount> => {
        return api.get<CalendarRemindersCount>('/appointment-reminders/count');
    },

    markReminderRead: async (reminderId: number): Promise<void> => {
        return api.post(`/appointment-reminders/${reminderId}/read`);
    },

    markAllRemindersRead: async (): Promise<void> => {
        return api.post('/appointment-reminders/read-all');
    },

    dismissReminder: async (reminderId: number): Promise<void> => {
        return api.post(`/appointment-reminders/${reminderId}/dismiss`);
    },
};

// ===== Payroll Numbering Ranges =====

export interface PayrollNumberingRangeData {
    id: number;
    company_id: number;
    branch_id: number;
    name: string;
    type: 'payroll' | 'payroll_note';
    prefix: string;
    consecutive_start: number | null;
    consecutive_end: number | null;
    current_consecutive: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export const payrollNumberingRangeApi = {
    getAll: async (): Promise<PayrollNumberingRangeData[]> => {
        return api.get<PayrollNumberingRangeData[]>('/electronic-invoicing/payroll-numbering-ranges');
    },
    create: async (data: {
        name: string;
        type?: 'payroll' | 'payroll_note';
        prefix: string;
        consecutive_start: number;
        consecutive_end: number;
    }): Promise<PayrollNumberingRangeData> => {
        return api.post<PayrollNumberingRangeData>('/electronic-invoicing/payroll-numbering-ranges', data);
    },
    update: async (id: number, data: {
        name: string;
        type?: 'payroll' | 'payroll_note';
        prefix: string;
        consecutive_start: number;
        consecutive_end: number;
        is_active?: boolean;
    }): Promise<PayrollNumberingRangeData> => {
        return api.put<PayrollNumberingRangeData>(`/electronic-invoicing/payroll-numbering-ranges/${id}`, data);
    },
    remove: async (id: number): Promise<{ success: boolean; message: string }> => {
        return api.delete(`/electronic-invoicing/payroll-numbering-ranges/${id}`);
    },
};

// ===== Payroll (Nómina Electrónica) =====

export type PayrollStatus = 'draft' | 'in_progress' | 'issued' | 'cancelled';

export interface PayrollData {
    id: number;
    company_id: number;
    branch_id: number;
    prefix: string | null;
    number: number | null;
    settlement_start_date: string;
    settlement_end_date: string;
    issue_date: string;
    status: PayrollStatus;
    payroll_period_id: number | null;
    notes: string | null;
    created_by_user_id: number;
    employees_count: number;
    issued_count: number;
    rejected_count: number;
    created_by?: { id: number; name: string };
    branch?: { id: number; name: string };
    created_at: string;
    updated_at: string;
}

export interface PayrollEmployeeEarningData {
    id: number;
    payroll_employee_id: number;
    concept: string;
    data: Record<string, any> | null;
    payment: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface PayrollEmployeeDeductionData {
    id: number;
    payroll_employee_id: number;
    concept: string;
    data: Record<string, any> | null;
    payment: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface PayrollEmployeeData {
    id: number;
    payroll_id: number;
    employee_id: number;
    identification_number: string;
    employee_name: string;
    type_worker_id: number;
    subtype_worker_id: number;
    type_contract_id: number;
    integral_salary: boolean;
    high_risk_pension: boolean;
    type_document_identification_id: number | null;
    surname: string | null;
    second_surname: string | null;
    first_name: string | null;
    other_names: string | null;
    municipality_id: number | null;
    address: string | null;
    admission_date: string | null;
    salary: number;
    accrued_total: number;
    deductions_total: number;
    total: number;
    payment_form_id: number;
    payment_method_id: number;
    bank: string | null;
    account_type: string | null;
    account_number: string | null;
    accepted: boolean;
    rejected: boolean;
    uuid: string | null;
    number: string | null;
    status_code: string | null;
    status_description: string | null;
    status_message: string | null;
    errors_messages: string[] | null;
    qr_link: string | null;
    has_pdf?: boolean;
    sent_at: string | null;
    // Annulment fields
    annulled: boolean;
    annulment_uuid: string | null;
    annulment_number: string | null;
    annulment_qr_link: string | null;
    has_annulment_pdf?: boolean;
    annulled_at: string | null;
    earnings?: PayrollEmployeeEarningData[];
    deductions?: PayrollEmployeeDeductionData[];
    payroll?: {
        id: number;
        prefix: string | null;
        number: number | null;
        settlement_start_date: string;
        settlement_end_date: string;
    };
}

export interface PayrollCatalogItem {
    id: number | string;
    name: string;
    code?: string;
}

export interface PayrollCatalogs {
    type_document_identifications: PayrollCatalogItem[];
    municipalities: PayrollCatalogItem[];
    departments: { code: string; name: string }[];
    type_workers: PayrollCatalogItem[];
    sub_type_workers: PayrollCatalogItem[];
    type_contracts: PayrollCatalogItem[];
    payment_forms: PayrollCatalogItem[];
    payment_methods: PayrollCatalogItem[];
    payroll_periods: PayrollCatalogItem[];
    account_types: PayrollCatalogItem[];
}

export interface PayrollHistoryItem {
    id: number;
    payroll_id: number;
    employee_id: number;
    accrued_total: number;
    deductions_total: number;
    total: number;
    accepted: boolean;
    rejected: boolean;
    uuid: string | null;
    number: string | null;
    qr_link: string | null;
    has_pdf: boolean;
    sent_at: string | null;
    annulled: boolean;
    annulment_uuid: string | null;
    annulment_number: string | null;
    annulment_qr_link: string | null;
    has_annulment_pdf: boolean;
    annulled_at: string | null;
    payroll?: {
        id: number;
        prefix: string | null;
        number: number | null;
        settlement_start_date: string;
        settlement_end_date: string;
        issue_date: string;
        status: string;
    };
}

export interface EmissionHistoryItem {
    id: number;
    payroll_employee_id: number;
    type: "emission" | "annulment";
    uuid: string | null;
    number: string | null;
    qr_link: string | null;
    is_valid: boolean;
    status_message: string | null;
    has_pdf: boolean;
    sent_at: string | null;
    payroll_employee?: {
        id: number;
        payroll_id: number;
        accrued_total: number;
        deductions_total: number;
        total: number;
        payroll?: {
            id: number;
            prefix: string | null;
            number: number | null;
            settlement_start_date: string;
            settlement_end_date: string;
            issue_date: string;
        };
    };
}

export interface PayrollEmployeeDetailData {
    payroll_employee: PayrollEmployeeData;
    payroll: PayrollData;
    employee: BranchUserData;
    emission_history: EmissionHistoryItem[];
}

export interface BranchUserData {
    id: number;
    name: string;
    first_name: string | null;
    last_name: string | null;
    document_id: string | null;
    document_type: string | null;
    email: string;
    phone?: string | null;
    address?: string | null;
    city_name?: string | null;
    state_name?: string | null;
    country_name?: string | null;
    occupation?: string | null;
    gender?: string | null;
}

export interface PayrollDetailData {
    payroll: PayrollData;
    payroll_employees: PayrollEmployeeData[];
    branch_users: BranchUserData[];
    numbering_ranges?: PayrollNumberingRangeData[];
}

// In-memory cache for payroll catalogs (static DIAN data, doesn't change)
let _payrollCatalogsCache: PayrollCatalogs | null = null;

export const payrollApi = {
    getAll: async (params?: { status?: PayrollStatus }): Promise<PayrollData[]> => {
        let endpoint = '/electronic-invoicing/payrolls';
        const queryParams: string[] = [];
        if (params?.status) queryParams.push(`status=${params.status}`);
        if (queryParams.length > 0) endpoint += `?${queryParams.join('&')}`;
        return api.get<PayrollData[]>(endpoint);
    },
    getById: async (id: number): Promise<PayrollDetailData> => {
        return api.get<PayrollDetailData>(`/electronic-invoicing/payrolls/${id}`);
    },
    create: async (data: {
        settlement_start_date: string;
        settlement_end_date: string;
        issue_date: string;
        numbering_range_id: number;
        payroll_period_id?: number;
        notes?: string;
    }): Promise<PayrollData> => {
        return api.post<PayrollData>('/electronic-invoicing/payrolls', data);
    },
    getCatalogs: async (): Promise<PayrollCatalogs> => {
        if (_payrollCatalogsCache) return _payrollCatalogsCache;
        const data = await api.get<PayrollCatalogs>('/electronic-invoicing/payrolls/catalogs');
        _payrollCatalogsCache = data;
        return data;
    },
    sendEmployee: async (payrollId: number, payrollEmployeeId: number): Promise<{
        uuid?: string;
        issue_date?: string;
        qr_link?: string;
        has_pdf?: boolean;
        status_description?: string;
        errors_messages?: string[];
        is_mock?: boolean;
        request_payload?: Record<string, unknown>;
    }> => {
        return api.post(`/electronic-invoicing/payrolls/${payrollId}/employees/${payrollEmployeeId}/send`, {});
    },
    annulEmployee: async (payrollId: number, payrollEmployeeId: number, numberingRangeId?: number): Promise<{
        annulment_uuid?: string;
        annulment_number?: string;
        annulment_qr_link?: string;
        has_annulment_pdf?: boolean;
        is_mock?: boolean;
        request_payload?: Record<string, unknown>;
    }> => {
        return api.post(`/electronic-invoicing/payrolls/${payrollId}/employees/${payrollEmployeeId}/annul`, {
            numbering_range_id: numberingRangeId ?? null,
        });
    },
};

export const payrollEmployeeApi = {
    getDetail: async (payrollId: number, userId: number): Promise<PayrollEmployeeDetailData> => {
        return api.get<PayrollEmployeeDetailData>(`/electronic-invoicing/payrolls/${payrollId}/employees/${userId}`);
    },
    createEarning: async (payrollEmployeeId: number, data: {
        concept: string;
        data?: Record<string, any> | null;
        payment: number;
    }): Promise<PayrollEmployeeEarningData> => {
        return api.post<PayrollEmployeeEarningData>(`/electronic-invoicing/payrolls/employees/${payrollEmployeeId}/earnings`, data);
    },
    updateEarning: async (earningId: number, data: {
        concept?: string;
        data?: Record<string, any> | null;
        payment?: number;
        is_active?: boolean;
    }): Promise<PayrollEmployeeEarningData> => {
        return api.put<PayrollEmployeeEarningData>(`/electronic-invoicing/payrolls/employee-earnings/${earningId}`, data);
    },
    deleteEarning: async (earningId: number): Promise<{ success: boolean; message: string }> => {
        return api.delete<{ success: boolean; message: string }>(`/electronic-invoicing/payrolls/employee-earnings/${earningId}`);
    },
    createDeduction: async (payrollEmployeeId: number, data: {
        concept: string;
        data?: Record<string, any> | null;
        payment: number;
    }): Promise<PayrollEmployeeDeductionData> => {
        return api.post<PayrollEmployeeDeductionData>(`/electronic-invoicing/payrolls/employees/${payrollEmployeeId}/deductions`, data);
    },
    updateDeduction: async (deductionId: number, data: {
        concept?: string;
        data?: Record<string, any> | null;
        payment?: number;
        is_active?: boolean;
    }): Promise<PayrollEmployeeDeductionData> => {
        return api.put<PayrollEmployeeDeductionData>(`/electronic-invoicing/payrolls/employee-deductions/${deductionId}`, data);
    },
    deleteDeduction: async (deductionId: number): Promise<{ success: boolean; message: string }> => {
        return api.delete<{ success: boolean; message: string }>(`/electronic-invoicing/payrolls/employee-deductions/${deductionId}`);
    },
    updateLaborData: async (payrollEmployeeId: number, data: Partial<PayrollEmployeeData>): Promise<PayrollEmployeeData> => {
        return api.put<PayrollEmployeeData>(`/electronic-invoicing/payrolls/employees/${payrollEmployeeId}/labor-data`, data);
    },
    getPreviousRecords: async (employeeId: number): Promise<PayrollEmployeeData[]> => {
        const res = await api.get<{ success: boolean; data: PayrollEmployeeData[] }>(`/electronic-invoicing/payrolls/employees/previous-records/${employeeId}`);
        return (res as any).data ?? res;
    },
};

// ==================== Trash (Papelera de reciclaje) ====================

export type TrashType = 'sales' | 'clients' | 'products';

export interface TrashResponse {
    items: {
        data: Record<string, any>[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    restorable: boolean;
}

export const trashApi = {
    getAll: async (
        type: TrashType,
        params?: { search?: string; page?: number; per_page?: number }
    ): Promise<TrashResponse> => {
        const searchParams = new URLSearchParams();
        searchParams.set('type', type);
        if (params?.search) searchParams.set('search', params.search);
        if (params?.page) searchParams.set('page', params.page.toString());
        if (params?.per_page) searchParams.set('per_page', params.per_page.toString());
        return api.get<TrashResponse>(`/trash?${searchParams.toString()}`);
    },
    restore: async (type: TrashType, id: number): Promise<Record<string, any>> => {
        return api.post<Record<string, any>>(`/trash/${type}/${id}/restore`);
    },
};

// ========================
// Google Calendar API
// ========================

export interface GoogleCalendarToken {
    id: number;
    company_id: number;
    branch_id?: number | null;
    calendar_id: string;
    calendar_name?: string | null;
    is_active: boolean;
    created_by_user_id: number;
    created_at: string;
    updated_at: string;
}

export interface GoogleContact {
    resource_name: string;
    name: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    photo: string | null;
    imported: boolean;
}

export const googleCalendarApi = {
    getAuthUrl: async (): Promise<{ auth_url: string }> => {
        return api.get<{ auth_url: string }>('/google-calendar/auth-url');
    },
    callback: async (code: string, state: string) => {
        return api.post('/google-calendar/callback', { code, state });
    },
    getCalendars: async (): Promise<GoogleCalendarToken[]> => {
        return api.get<GoogleCalendarToken[]>('/google-calendar/calendars');
    },
    disconnect: async (tokenId: number) => {
        return api.post(`/google-calendar/${tokenId}/disconnect`, {});
    },
    syncAppointment: async (appointmentId: number) => {
        return api.post(`/google-calendar/sync/${appointmentId}`, {});
    },
    getContacts: async (): Promise<GoogleContact[]> => {
        return api.get<GoogleContact[]>('/google-calendar/contacts');
    },
    importContacts: async (contacts: Partial<GoogleContact>[]): Promise<{ imported: number; skipped: number }> => {
        return api.post<{ imported: number; skipped: number }>('/google-calendar/contacts/import', { contacts });
    },
};

// Holidays API (Días festivos)
export interface HolidayItem {
    date: string;
    name: string;
    imported: boolean;
}

export const holidaysApi = {
    getByCountry: async (country: string, year: number): Promise<HolidayItem[]> => {
        return api.get<HolidayItem[]>(`/holidays?country=${country}&year=${year}`);
    },
    import: async (country: string, year: number, dates: string[]): Promise<{ imported: number }> => {
        return api.post<{ imported: number }>('/holidays/import', { country, year, dates });
    },
    remove: async (year: number): Promise<{ deleted: number }> => {
        return api.post<{ deleted: number }>('/holidays/remove', { year });
    },
};

// Alert Rules API (Alertas configurables)
import type { AlertRule, AlertLog, AlertStats } from '@/types';

export const alertRulesApi = {
    getAll: async (params?: { type?: string; is_active?: boolean; search?: string }): Promise<AlertRule[]> => {
        const searchParams = new URLSearchParams();
        if (params?.type) searchParams.set('type', params.type);
        if (params?.is_active !== undefined) searchParams.set('is_active', params.is_active.toString());
        if (params?.search) searchParams.set('search', params.search);
        const query = searchParams.toString();
        return api.get<AlertRule[]>(`/alert-rules${query ? `?${query}` : ''}`);
    },
    getStats: async (): Promise<AlertStats> => {
        return api.get<AlertStats>('/alert-rules/stats');
    },
    getRecentLogs: async (): Promise<AlertLog[]> => {
        return api.get<AlertLog[]>('/alert-rules/recent-logs');
    },
    create: async (data: Partial<AlertRule>): Promise<AlertRule> => {
        return api.post<AlertRule>('/alert-rules', data);
    },
    get: async (id: number): Promise<AlertRule> => {
        return api.get<AlertRule>(`/alert-rules/${id}`);
    },
    update: async (id: number, data: Partial<AlertRule>): Promise<AlertRule> => {
        return api.put<AlertRule>(`/alert-rules/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/alert-rules/${id}`);
    },
    toggleActive: async (id: number): Promise<AlertRule> => {
        return api.post<AlertRule>(`/alert-rules/${id}/toggle`);
    },
    test: async (id: number): Promise<{ triggered: boolean; log: AlertLog | null }> => {
        return api.post<{ triggered: boolean; log: AlertLog | null }>(`/alert-rules/${id}/test`);
    },
    getLogs: async (id: number, limit?: number): Promise<AlertLog[]> => {
        return api.get<AlertLog[]>(`/alert-rules/${id}/logs${limit ? `?limit=${limit}` : ''}`);
    },
};

// ===================== Inventory Reconciliations (Conciliación de Inventario) =====================

import type {
    InventoryReconciliation,
    InventoryReconciliationItem,
    InventoryReconciliationStats,
    InventoryReconciliationStatus,
} from '@/types';

export const inventoryReconciliationsApi = {
    getAll: async (params?: {
        search?: string;
        status?: InventoryReconciliationStatus;
        warehouse_id?: number;
        date_from?: string;
        date_to?: string;
        per_page?: number;
        page?: number;
    }): Promise<PaginatedResponse<InventoryReconciliation>> => {
        let endpoint = '/inventory-reconciliations';
        const queryParams: string[] = [];
        if (params?.search) queryParams.push(`search=${encodeURIComponent(params.search)}`);
        if (params?.status) queryParams.push(`status=${params.status}`);
        if (params?.warehouse_id) queryParams.push(`warehouse_id=${params.warehouse_id}`);
        if (params?.date_from) queryParams.push(`date_from=${params.date_from}`);
        if (params?.date_to) queryParams.push(`date_to=${params.date_to}`);
        if (params?.per_page) queryParams.push(`per_page=${params.per_page}`);
        if (params?.page) queryParams.push(`page=${params.page}`);
        if (queryParams.length > 0) endpoint += `?${queryParams.join('&')}`;
        return api.get<PaginatedResponse<InventoryReconciliation>>(endpoint);
    },
    getStats: async (): Promise<InventoryReconciliationStats> => {
        return api.get<InventoryReconciliationStats>('/inventory-reconciliations/stats');
    },
    getById: async (id: number): Promise<InventoryReconciliation> => {
        return api.get<InventoryReconciliation>(`/inventory-reconciliations/${id}`);
    },
    create: async (data: {
        warehouse_id?: number;
        location_id?: number;
        category_id?: number;
        is_blind_count?: boolean;
        notes?: string;
    }): Promise<InventoryReconciliation> => {
        return api.post<InventoryReconciliation>('/inventory-reconciliations', data);
    },
    update: async (id: number, data: { notes?: string; is_blind_count?: boolean }): Promise<InventoryReconciliation> => {
        return api.put<InventoryReconciliation>(`/inventory-reconciliations/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/inventory-reconciliations/${id}`);
    },
    startCounting: async (id: number): Promise<InventoryReconciliation> => {
        return api.post<InventoryReconciliation>(`/inventory-reconciliations/${id}/start-counting`);
    },
    updateCounts: async (id: number, items: Array<{ item_id: number; physical_count: number; notes?: string }>): Promise<InventoryReconciliationItem[]> => {
        return api.post<InventoryReconciliationItem[]>(`/inventory-reconciliations/${id}/update-counts`, { items });
    },
    finishCounting: async (id: number): Promise<InventoryReconciliation> => {
        return api.post<InventoryReconciliation>(`/inventory-reconciliations/${id}/finish-counting`);
    },
    approve: async (id: number): Promise<InventoryReconciliation> => {
        return api.post<InventoryReconciliation>(`/inventory-reconciliations/${id}/approve`);
    },
    reject: async (id: number, reason: string): Promise<InventoryReconciliation> => {
        return api.post<InventoryReconciliation>(`/inventory-reconciliations/${id}/reject`, { reason });
    },
    apply: async (id: number): Promise<InventoryReconciliation> => {
        return api.post<InventoryReconciliation>(`/inventory-reconciliations/${id}/apply`);
    },
    cancel: async (id: number, reason?: string): Promise<InventoryReconciliation> => {
        return api.post<InventoryReconciliation>(`/inventory-reconciliations/${id}/cancel`, { reason });
    },
};

// ── Bulk Import API ──

export const bulkImportApi = {
    downloadTemplate: async (type: string): Promise<void> => {
        const response = await fetch(`/api/bulk-import/template/${type}`, {
            headers: {
                'Authorization': `Bearer ${document.cookie.split('XSRF-TOKEN=')[1]?.split(';')[0] || ''}`,
                'Accept': 'application/octet-stream',
            },
            credentials: 'include',
        });
        if (!response.ok) throw new Error('Download failed');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plantilla_importacion_${type}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    },
    validate: async (type: string, file: File): Promise<{ preview: Array<{ row: number; data: Record<string, unknown>; errors: Array<{ row: number; field: string; message: string; type?: string; value?: string }>; is_duplicate: boolean; valid: boolean }>; summary: { total: number; valid: number; errors: number; duplicates: number }; missing_references?: { categories: string[]; suppliers: string[] } }> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.postFile<{ success: boolean; data: { preview: any[]; summary: any; missing_references?: any } }>(`/bulk-import/${type}/validate`, formData);
        return (response as any).data ?? response;
    },
    import: async (type: string, file: File, duplicateMode: string = 'skip'): Promise<{ inserted: number; updated: number; skipped: number; errors: Array<{ row: number; field: string; message: string }> }> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('duplicate_mode', duplicateMode);
        const response = await api.postFile<{ success: boolean; data: any }>(`/bulk-import/${type}`, formData);
        return (response as any).data ?? response;
    },
};

// ── Birthday API ──

export interface BirthdayClient {
    id: number;
    name: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    document_id?: string;
    birth_date: string;
    birth_day: number;
    birth_month: number;
    age: number;
    turning_age: number;
    whatsapp_number?: string;
    whatsapp_url?: string;
    last_purchase_date?: string;
    total_purchased: number;
    next_birthday?: string;
    days_until?: number;
}

export interface BirthdayStats {
    today: BirthdayClient[];
    this_week: BirthdayClient[];
    today_count: number;
    week_count: number;
    month_count: number;
    total_with_birthday: number;
}

export const birthdayApi = {
    getToday: async (): Promise<BirthdayClient[]> => {
        const response = await api.get<{ success: boolean; data: BirthdayClient[] }>('/birthdays/today');
        return (response as any).data ?? response;
    },
    getUpcoming: async (days: number = 30): Promise<BirthdayClient[]> => {
        const response = await api.get<{ success: boolean; data: BirthdayClient[] }>(`/birthdays/upcoming?days=${days}`);
        return (response as any).data ?? response;
    },
    getStats: async (): Promise<BirthdayStats> => {
        const response = await api.get<{ success: boolean; data: BirthdayStats }>('/birthdays/stats');
        return (response as any).data ?? response;
    },
    getByMonth: async (month: number): Promise<BirthdayClient[]> => {
        const response = await api.get<{ success: boolean; data: BirthdayClient[] }>(`/birthdays/month/${month}`);
        return (response as any).data ?? response;
    },
};

// Chat API
import type { ChatConversation, ChatMessage, ChatContact, ChatUnreadCount, SupportConversation, SupportMessage, SupportUnreadCount } from '@/types';

export const chatApi = {
    getConversations: async (): Promise<ChatConversation[]> => {
        return api.get<ChatConversation[]>('/chat/conversations');
    },
    getMessages: async (conversationId: number, params?: { before_id?: number }): Promise<ChatMessage[]> => {
        const searchParams = new URLSearchParams();
        if (params?.before_id) searchParams.set('before_id', String(params.before_id));
        const qs = searchParams.toString();
        return api.get<ChatMessage[]>(`/chat/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`);
    },
    sendMessage: async (conversationId: number, body: string, attachment?: File): Promise<ChatMessage> => {
        if (attachment) {
            const formData = new FormData();
            formData.append('body', body || '');
            formData.append('attachment', attachment);
            return api.postFile<ChatMessage>(`/chat/conversations/${conversationId}/messages`, formData);
        }
        return api.post<ChatMessage>(`/chat/conversations/${conversationId}/messages`, { body });
    },
    createConversation: async (data: { type: 'personal' | 'group'; participant_ids: number[]; name?: string; description?: string }): Promise<ChatConversation> => {
        return api.post<ChatConversation>('/chat/conversations', data);
    },
    markAsRead: async (conversationId: number): Promise<void> => {
        return api.post<void>(`/chat/conversations/${conversationId}/read`);
    },
    markAsDelivered: async (conversationId: number): Promise<void> => {
        return api.post<void>(`/chat/conversations/${conversationId}/delivered`);
    },
    getContacts: async (): Promise<ChatContact[]> => {
        return api.get<ChatContact[]>('/chat/contacts');
    },
    getUnreadCount: async (): Promise<ChatUnreadCount> => {
        return api.get<ChatUnreadCount>('/chat/unread-count');
    },
    updateConversation: async (conversationId: number, data: { name?: string; description?: string }): Promise<ChatConversation> => {
        return api.put<ChatConversation>(`/chat/conversations/${conversationId}`, data);
    },
    addParticipants: async (conversationId: number, userIds: number[]): Promise<void> => {
        return api.post<void>(`/chat/conversations/${conversationId}/participants`, { user_ids: userIds });
    },
    leaveConversation: async (conversationId: number): Promise<void> => {
        return api.delete<void>(`/chat/conversations/${conversationId}/leave`);
    },
    deleteMessage: async (conversationId: number, messageId: number): Promise<void> => {
        return api.delete<void>(`/chat/conversations/${conversationId}/messages/${messageId}`);
    },
    deleteConversation: async (conversationId: number): Promise<void> => {
        return api.delete<void>(`/chat/conversations/${conversationId}`);
    },
};

export const supportApi = {
    getConversations: async (type: 'ticket' | 'chat' = 'ticket'): Promise<SupportConversation[]> => {
        return api.get<SupportConversation[]>(`/support/conversations?type=${type}`);
    },
    getOrCreateChat: async (): Promise<SupportConversation> => {
        return api.get<SupportConversation>('/support/chat');
    },
    getChatConversations: async (): Promise<SupportConversation[]> => {
        return api.get<SupportConversation[]>('/support/chat/conversations');
    },
    getMessages: async (conversationId: number, params?: { before_id?: number; after_id?: number }): Promise<SupportMessage[]> => {
        const searchParams = new URLSearchParams();
        if (params?.before_id) searchParams.set('before_id', String(params.before_id));
        if (params?.after_id) searchParams.set('after_id', String(params.after_id));
        const qs = searchParams.toString();
        return api.get<SupportMessage[]>(`/support/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`);
    },
    createConversation: async (data: { subject: string; description: string; attachments?: File[] }): Promise<SupportConversation> => {
        if (data.attachments && data.attachments.length > 0) {
            const formData = new FormData();
            formData.append('subject', data.subject);
            formData.append('description', data.description);
            data.attachments.forEach((file) => formData.append('attachments[]', file));
            return api.postFile<SupportConversation>('/support/conversations', formData);
        }
        return api.post<SupportConversation>('/support/conversations', { subject: data.subject, description: data.description });
    },
    sendMessage: async (conversationId: number, body: string, attachment?: File): Promise<SupportMessage> => {
        if (attachment) {
            const formData = new FormData();
            formData.append('body', body || '');
            formData.append('attachment', attachment);
            return api.postFile<SupportMessage>(`/support/conversations/${conversationId}/messages`, formData);
        }
        return api.post<SupportMessage>(`/support/conversations/${conversationId}/messages`, { body });
    },
    markAsRead: async (conversationId: number): Promise<void> => {
        return api.post<void>(`/support/conversations/${conversationId}/read`);
    },
    getUnreadCount: async (): Promise<SupportUnreadCount> => {
        return api.get<SupportUnreadCount>('/support/unread-count');
    },
    closeConversation: async (conversationId: number): Promise<void> => {
        return api.post<void>(`/support/conversations/${conversationId}/close`);
    },
};

// ==================== Registration API (Public - No Auth Required) ====================

export const serviceOrdersApi = {
    getAll: async (params?: { search?: string; status?: string; priority?: string; type?: string; assigned_to?: number; client_id?: number; date_from?: string; date_to?: string; page?: number }): Promise<{ data: ServiceOrder[]; meta?: any }> => {
        const qp = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') qp.append(k, String(v)); });
        }
        const url = qp.toString() ? `/service-orders?${qp}` : '/service-orders';
        return api.get(url);
    },
    getById: async (id: number): Promise<ServiceOrder> => {
        return api.get<ServiceOrder>(`/service-orders/${id}`);
    },
    create: async (data: any): Promise<ServiceOrder> => {
        return api.post<ServiceOrder>('/service-orders', data);
    },
    update: async (id: number, data: any): Promise<ServiceOrder> => {
        return api.put<ServiceOrder>(`/service-orders/${id}`, data);
    },
    delete: async (id: number): Promise<void> => {
        return api.delete(`/service-orders/${id}`);
    },
    updateStatus: async (id: number, data: { status: string; notes?: string }): Promise<ServiceOrder> => {
        return api.post<ServiceOrder>(`/service-orders/${id}/status`, data);
    },
    assignTo: async (id: number, assignedTo: number): Promise<ServiceOrder> => {
        return api.post<ServiceOrder>(`/service-orders/${id}/assign`, { assigned_to: assignedTo });
    },
    convertToInvoice: async (id: number): Promise<any> => {
        return api.post(`/service-orders/${id}/invoice`);
    },
    addAttachment: async (id: number, formData: FormData): Promise<any> => {
        await api.initCsrf();
        return api.postFile(`/service-orders/${id}/attachments`, formData);
    },
    removeAttachment: async (attachmentId: number): Promise<void> => {
        return api.delete(`/service-orders/attachments/${attachmentId}`);
    },
};

export const registrationApi = {
    parseRut: async (file: File) => {
        const formData = new FormData();
        formData.append('rut_file', file);
        return api.postFile<{ success: boolean; data: Record<string, string>; message: string }>('/registration/parse-rut', formData);
    },
    validateCompany: async (data: { name: string; email?: string; tax_id?: string; admin_email: string }) => {
        return api.post<{ success: boolean; errors?: Record<string, string>; message: string }>('/registration/validate-company', data);
    },
    uploadLogo: async (file: File, registrationToken: string) => {
        const formData = new FormData();
        formData.append('logo', file);
        formData.append('registration_token', registrationToken);
        return api.postFile<{ success: boolean; data: { url: string; path: string } }>('/registration/upload-logo', formData);
    },
    uploadLogoIcon: async (file: File, registrationToken: string) => {
        const formData = new FormData();
        formData.append('logo_icon', file);
        formData.append('registration_token', registrationToken);
        return api.postFile<{ success: boolean; data: { url: string; path: string } }>('/registration/upload-logo-icon', formData);
    },
    complete: async (data: Record<string, unknown>) => {
        await api.initCsrf();
        return api.requestRaw<{ success: boolean; data: { company_name: string; admin_email: string; admin_name: string }; message: string }>('/registration/complete', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
};
