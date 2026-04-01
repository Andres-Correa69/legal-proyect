import type { Config } from 'ziggy-js';

export interface User {
    id: number;
    name: string;
    first_name?: string;
    last_name?: string;
    business_name?: string;
    legal_representative?: string;
    email: string;
    document_id?: string;
    document_type?: string;
    phone?: string;
    whatsapp_country?: string;
    whatsapp_number?: string;
    address?: string;
    birth_date?: string;
    gender?: string;
    occupation?: string;
    avatar?: string;
    avatar_url?: string;
    signature_url?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    email_2fa_enabled?: boolean;
    email_2fa_enabled_at?: string | null;
    is_active: boolean;
    company_id?: number;
    branch_id?: number;
    country_code?: string;
    country_name?: string;
    state_code?: string;
    state_name?: string;
    city_name?: string;
    neighborhood?: string;
    commune?: string;
    referral_source?: string;
    contact_preference?: string;
    preferred_schedule?: string;
    observations?: string;
    tags?: string[];
    social_networks?: { platform: string; url: string }[];
    // Employment fields
    salary?: number;
    contract_type?: string;
    admission_date?: string;
    bank_name?: string;
    account_type?: string;
    account_number?: string;
    eps_name?: string;
    pension_fund_name?: string;
    arl_name?: string;
    compensation_fund_name?: string;
    risk_level?: number;
    roles?: Role[];
    permissions?: Permission[];
    company?: Company;
    branch?: Branch;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
}

export interface Role {
    id: number;
    name: string;
    slug: string;
    description?: string;
    company_id?: number | null;
    permissions?: Permission[];
}

export interface Permission {
    id: number;
    name: string;
    slug: string;
    group?: string;
    description?: string;
}

export interface Company {
    id: number;
    name: string;
    slug: string;
    email?: string;
    phone?: string;
    address?: string;
    tax_id?: string;
    parent_id?: number | null;
    is_active: boolean;
    settings?: Record<string, unknown>;
    logo_url?: string;
    logo_icon_url?: string;
    branches?: Branch[];
    parent?: Company;
    children?: Company[];
    created_at: string;
    updated_at: string;
}

export interface Branch {
    id: number;
    company_id: number;
    name: string;
    slug: string;
    code?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    latitude?: number;
    longitude?: number;
    is_active: boolean;
    is_main: boolean;
    settings?: Record<string, unknown>;
    rut_url?: string | null;
    electronic_invoicing_registered?: boolean;
    ei_environment?: number | null;
    company?: Company;
    created_at: string;
    updated_at: string;
}

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavItem {
    title: string;
    href: string;
    icon?: React.ComponentType<{ className?: string }>;
    isActive?: boolean;
    items?: NavItem[];
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: Auth;
    ziggy: Config & { location: string };
};

export interface SharedData {
    auth: Auth;
    flash?: {
        success?: string;
        error?: string;
        warning?: string;
        info?: string;
    };
}

// Pagination Types
export interface PaginatedData<T> {
    data: T[];
    links: {
        first: string | null;
        last: string | null;
        prev: string | null;
        next: string | null;
    };
    meta: {
        current_page: number;
        from: number | null;
        last_page: number;
        path: string;
        per_page: number;
        to: number | null;
        total: number;
    };
}

// API Types
export interface ApiError {
    message: string;
    errors?: Record<string, string[]>;
    errors_messages?: string[];
    request_payload?: Record<string, unknown>;
    status?: number;
    subscription_expired?: boolean;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message?: string;
    errors?: Record<string, string[]>;
}

// Cash Register Types
export interface CashRegister {
    id: number;
    company_id: number;
    branch_id: number;
    type: 'minor' | 'major' | 'bank';
    name: string;
    bank_name?: string;
    account_number?: string;
    account_type?: string;
    status: 'open' | 'closed';
    current_balance: number;
    is_active: boolean;
    notes?: string;
    company?: Company;
    branch?: Branch;
    created_at: string;
    updated_at: string;
}

export interface CashRegisterSession {
    id: number;
    cash_register_id: number;
    company_id: number;
    branch_id: number;
    opened_by_user_id: number;
    closed_by_user_id?: number;
    opening_balance: number;
    closing_balance?: number;
    expected_balance?: number;
    difference?: number;
    total_income: number;
    total_expense: number;
    opened_at: string;
    closed_at?: string;
    notes?: string;
    cash_register?: CashRegister;
    opened_by?: User;
    closed_by?: User;
}

// Payment Types
export interface Payment {
    id: number;
    company_id: number;
    branch_id: number;
    cash_register_id: number;
    cash_register_session_id?: number;
    payment_method_id: number;
    type: 'income' | 'expense';
    reference_type?: string;
    reference_id?: number;
    payment_number: string;
    amount: number;
    payment_date: string;
    is_partial: boolean;
    status: 'completed' | 'cancelled' | 'pending';
    concept?: string;
    accounting_account_id?: number | null;
    notes?: string;
    cancellation_reason?: string;
    created_by_user_id: number;
    cancelled_by_user_id?: number;
    cancelled_at?: string;
    payment_method?: PaymentMethod;
    cash_register?: CashRegister;
    accounting_account?: AccountingAccount;
    created_by?: User;
    created_at: string;
    updated_at: string;
}

export interface PaymentMethod {
    id: number;
    company_id: number;
    name: string;
    description?: string;
    type: 'system' | 'custom';
    is_active: boolean;
}

// Inventory Types
export interface Product {
    id: number;
    company_id: number;
    category_id: number;
    location_id?: number;
    sku: string;
    barcode?: string;
    name: string;
    image_url?: string;
    description?: string;
    brand?: string;
    purchase_price: number;
    sale_price: number;
    tax_rate?: number | null;
    average_cost: number;
    current_stock: number;
    min_stock: number;
    max_stock?: number;
    unit_of_measure: string;
    is_active: boolean;
    is_trackable: boolean;
    category?: ProductCategory;
    location?: Location;
    created_at: string;
    updated_at: string;
}

export interface ProductCategory {
    id: number;
    company_id: number;
    name: string;
    slug: string;
    description?: string;
    is_active: boolean;
    products_count?: number;
}

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
    locations?: Location[];
}

export interface Location {
    id: number;
    warehouse_id: number;
    company_id: number;
    parent_id?: number;
    name: string;
    code?: string;
    type: 'zone' | 'aisle' | 'shelf' | 'bin';
    is_active: boolean;
    warehouse?: Warehouse;
    parent?: Location;
    children?: Location[];
}

export interface Supplier {
    id: number;
    company_id: number;
    name: string;
    contact_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    tax_id?: string;
    payment_terms?: string;
    is_active: boolean;
}

// Service Types
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
    created_at: string;
    updated_at: string;
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

export interface ServiceCategories {
    [key: string]: string;
}

export interface ServiceUnits {
    [key: string]: string;
}

export interface InventoryMovement {
    id: number;
    product_id: number;
    company_id: number;
    branch_id: number;
    type: 'entry' | 'exit' | 'transfer' | 'adjustment' | 'sale' | 'purchase' | 'return' | 'damage' | 'loss' | 'other';
    quantity: number;
    unit_cost: number;
    stock_before: number;
    stock_after: number;
    reference_type?: string;
    reference_id?: number;
    source_location_id?: number;
    destination_location_id?: number;
    created_by_user_id: number;
    notes?: string;
    sale_unit_price?: number | null;
    product?: Product;
    created_by?: User;
    created_at: string;
}

export interface InventoryPurchase {
    id: number;
    company_id: number;
    branch_id: number;
    warehouse_id: number;
    supplier_id: number;
    purchase_number: string;
    status: 'draft' | 'pending' | 'approved' | 'partial' | 'received' | 'cancelled';
    payment_status: 'pending' | 'partial' | 'paid';
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    retention_amount: number;
    retentions?: PurchaseRetention[];
    expected_date?: string;
    received_at?: string;
    notes?: string;
    created_by_user_id: number;
    approved_by_user_id?: number;
    received_by_user_id?: number;
    supplier?: Supplier;
    warehouse?: Warehouse;
    items?: InventoryPurchaseItem[];
    created_at: string;
    updated_at: string;
}

export interface PurchaseRetention {
    id: string;
    type: string;
    name: string;
    percentage: number;
    value: number;
}

export interface InventoryPurchaseItem {
    id: number;
    inventory_purchase_id: number;
    product_id: number;
    quantity_ordered: number;
    quantity_received: number;
    unit_cost: number;
    tax_rate: number;
    tax_amount: number;
    product?: Product;
}

export interface InventoryTransfer {
    id: number;
    company_id: number;
    transfer_number: string;
    source_warehouse_id: number;
    destination_warehouse_id: number;
    source_location_id?: number;
    destination_location_id?: number;
    status: 'requested' | 'approved' | 'in_transit' | 'completed' | 'rejected' | 'cancelled';
    requested_by_user_id: number;
    approved_by_user_id?: number;
    completed_by_user_id?: number;
    requested_at: string;
    approved_at?: string;
    completed_at?: string;
    notes?: string;
    rejection_reason?: string;
    source_warehouse?: Warehouse;
    destination_warehouse?: Warehouse;
    items?: InventoryTransferItem[];
}

export interface InventoryTransferItem {
    id: number;
    inventory_transfer_id: number;
    product_id: number;
    quantity_requested: number;
    quantity_transferred: number;
    product?: Product;
}

export interface InventoryAdjustment {
    id: number;
    company_id: number;
    branch_id: number;
    product_id: number;
    adjustment_reason_id: number;
    adjustment_number: string;
    quantity: number;
    stock_before: number;
    stock_after: number;
    unit_cost: number;
    financial_impact: number;
    status: 'pending' | 'approved' | 'rejected' | 'auto_approved';
    notes?: string;
    rejection_reason?: string;
    created_by_user_id: number;
    approved_by_user_id?: number;
    product?: Product;
    adjustment_reason?: AdjustmentReason;
    created_at: string;
    updated_at: string;
}

export interface AdjustmentReason {
    id: number;
    company_id: number;
    code: string;
    name: string;
    description?: string;
    requires_approval: boolean;
    approval_threshold_quantity?: number;
    approval_threshold_amount?: number;
    is_active: boolean;
}

// Activity Log Types
export interface ActivityLog {
    id: number;
    description: string;
    event?: string;
    causer_type?: string;
    causer_id?: number;
    subject_type?: string;
    subject_id?: number;
    properties?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
    causer?: User;
    created_at: string;
}

// Accounting Types
export interface AccountingAccount {
    id: number;
    company_id: number;
    parent_id?: number | null;
    code: string;
    name: string;
    type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'cost';
    nature: 'debit' | 'credit';
    level: number;
    is_active: boolean;
    is_parent: boolean;
    description?: string;
    parent?: AccountingAccount;
    children?: AccountingAccount[];
    cash_registers?: CashRegister[];
    suppliers?: Supplier[];
    created_at: string;
    updated_at: string;
}

export interface JournalEntry {
    id: number;
    company_id: number;
    branch_id?: number | null;
    entry_number: string;
    date: string;
    description: string;
    reference_type?: string;
    reference_id?: number;
    status: 'draft' | 'posted' | 'voided';
    total_debit: number;
    total_credit: number;
    source: 'manual' | 'automatic';
    auto_source?: string;
    created_by_user_id: number;
    posted_at?: string;
    voided_at?: string;
    notes?: string;
    void_reason?: string;
    lines?: JournalEntryLine[];
    created_by?: User;
    branch?: Branch;
    created_at: string;
    updated_at: string;
}

export interface JournalEntryLine {
    id: number;
    journal_entry_id: number;
    accounting_account_id: number;
    debit: number;
    credit: number;
    description?: string;
    accounting_account?: AccountingAccount;
}

export interface AccountingPeriod {
    id: number;
    company_id: number;
    year: number;
    month: number;
    status: 'open' | 'closed';
    closed_at?: string;
    closed_by_user_id?: number;
    closed_by?: User;
    created_at: string;
    updated_at: string;
}

export interface AccountingSaleTypeMapping {
    id: number;
    company_id: number;
    accounting_account_id: number;
    transaction_type: string;
    is_active: boolean;
    accounting_account?: AccountingAccount;
}

export interface TrialBalanceRow {
    account_id: number;
    account_code: string;
    account_name: string;
    account_type: string;
    debit_movement: number;
    credit_movement: number;
    previous_balance: number;
    total_balance: number;
    final_balance: number;
}

export interface GeneralLedgerRow {
    date: string;
    entry_number: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
}

export interface GeneralLedgerResponse {
    previous_balance: number;
    movements: GeneralLedgerRow[];
    final_balance: number;
}

export interface IncomeStatementSection {
    title: string;
    accounts: { code: string; name: string; amount: number }[];
    total: number;
}

export interface BalanceSheetSection {
    title: string;
    accounts: { code: string; name: string; amount: number }[];
    total: number;
}

export interface UnifiedNotification {
    id: string;
    originalId: number;
    type: 'reminder' | 'invoice_alert' | 'purchase_alert';
    subtype?: string;
    title: string;
    description: string;
    date: string;
    isRead: boolean;
    isDismissed: boolean;
    metadata: Record<string, any>;
}

export interface AccountSubledgerEntry {
    account: {
        id: number;
        code: string;
        name: string;
        type: string;
        nature: string;
    };
    previous_balance: number;
    movements: GeneralLedgerRow[];
    total_debit: number;
    total_credit: number;
    final_balance: number;
}

export interface ThirdPartySubledgerEntry {
    third_party: {
        id: number;
        name: string;
        type: string;
        document: string | null;
    };
    movements: {
        date: string;
        entry_number: string;
        account_code: string;
        account_name: string;
        description: string;
        debit: number;
        credit: number;
        balance: number;
    }[];
    previous_balance: number;
    total_debit: number;
    total_credit: number;
    final_balance: number;
}

// Appointments (Calendar)
export interface Appointment {
    id: number;
    company_id: number;
    branch_id?: number | null;
    title: string;
    description?: string | null;
    type: 'appointment' | 'reminder' | 'follow_up' | 'call' | 'meeting';
    status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    starts_at: string;
    ends_at?: string | null;
    all_day: boolean;
    client_id?: number | null;
    supplier_id?: number | null;
    related_sale_id?: number | null;
    color?: string | null;
    location?: string | null;
    notes?: string | null;
    created_by_user_id?: number | null;
    client?: User;
    supplier?: { id: number; name: string; document_number?: string };
    related_sale?: { id: number; invoice_number: string; type: string; total_amount: number };
    created_by?: User;
    branch?: { id: number; name: string };
    reminders?: AppointmentReminder[];
    created_at: string;
    updated_at: string;
}

export interface AppointmentReminder {
    id: number;
    company_id: number;
    appointment_id: number;
    user_id: number;
    remind_at: string;
    is_read: boolean;
    is_dismissed: boolean;
    read_at?: string | null;
    dismissed_at?: string | null;
    appointment?: Appointment;
    user?: User;
    created_at: string;
    updated_at: string;
}

export interface CalendarDateRangeData {
    appointments: Appointment[];
    invoice_due_dates: Array<{
        id: number;
        invoice_number: string;
        type: string;
        status: string;
        payment_status: string;
        due_date: string;
        total_amount: number;
        balance: number;
        client_id?: number;
        client?: User;
    }>;
    purchase_due_dates: Array<{
        id: number;
        purchase_number: string;
        status: string;
        payment_status: string;
        credit_due_date: string;
        total_amount: number;
        balance_due: number;
        supplier_id?: number;
        supplier?: { id: number; name: string };
    }>;
    stats: {
        total_appointments: number;
        upcoming_today: number;
        overdue_invoices: number;
        overdue_purchases: number;
        pending_reminders: number;
    };
}

export interface CalendarRemindersCount {
    reminders_count: number;
    today_appointments: number;
    total: number;
}

// Alert Rules (Alertas configurables)
export type AlertRuleType = 'low_stock' | 'sales_decrease' | 'inactive_clients' | 'no_movement_products' | 'sales_target' | 'upcoming_invoices' | 'high_expenses' | 'client_birthday';
export type AlertFrequency = 'hourly' | 'daily' | 'weekly';

export interface AlertRule {
    id: number;
    company_id: number;
    created_by: number;
    name: string;
    type: AlertRuleType;
    conditions: Record<string, any>;
    recipients: string[];
    frequency: AlertFrequency;
    is_active: boolean;
    last_checked_at: string | null;
    last_triggered_at: string | null;
    created_at: string;
    updated_at: string;
    creator?: { id: number; name: string };
    logs_count?: number;
}

export interface AlertLog {
    id: number;
    alert_rule_id: number;
    company_id: number;
    data: {
        items: any[];
        summary: string;
        [key: string]: any;
    };
    email_sent: boolean;
    email_error: string | null;
    triggered_at: string;
    created_at: string;
    alert_rule?: { id: number; name: string; type: AlertRuleType };
}

// Inventory Reconciliation Types
export type InventoryReconciliationStatus = 'draft' | 'in_progress' | 'review' | 'approved' | 'applied' | 'cancelled';

export interface InventoryReconciliation {
    id: number;
    company_id: number;
    branch_id: number;
    reconciliation_number: string;
    warehouse_id?: number;
    location_id?: number;
    category_id?: number;
    status: InventoryReconciliationStatus;
    is_blind_count: boolean;
    notes?: string;
    cancellation_reason?: string;
    total_products: number;
    total_counted: number;
    total_matches: number;
    total_surpluses: number;
    total_shortages: number;
    total_surplus_value: number;
    total_shortage_value: number;
    net_financial_impact: number;
    created_by_user_id: number;
    counted_by_user_id?: number;
    reviewed_by_user_id?: number;
    approved_by_user_id?: number;
    applied_by_user_id?: number;
    counting_started_at?: string;
    counting_completed_at?: string;
    reviewed_at?: string;
    approved_at?: string;
    applied_at?: string;
    cancelled_at?: string;
    warehouse?: Warehouse;
    location?: Location;
    category?: ProductCategory;
    items?: InventoryReconciliationItem[];
    items_count?: number;
    created_by?: User;
    counted_by?: User;
    reviewed_by?: User;
    approved_by?: User;
    applied_by?: User;
    created_at: string;
    updated_at: string;
}

export interface InventoryReconciliationItem {
    id: number;
    inventory_reconciliation_id: number;
    product_id: number;
    system_stock: number;
    physical_count: number | null;
    difference: number;
    unit_cost: number;
    financial_impact: number;
    variance_percentage: number;
    notes?: string;
    is_counted: boolean;
    adjustment_id?: number;
    product?: Product;
    created_at: string;
    updated_at: string;
}

export interface InventoryReconciliationStats {
    total: number;
    in_progress: number;
    pending_approval: number;
    last_applied_at?: string;
}

export interface AlertStats {
    total_rules: number;
    active_rules: number;
    today_triggers: number;
    emails_sent: number;
}

// Chat Types
export interface ChatConversation {
    id: number;
    company_id: number;
    type: 'personal' | 'group';
    name: string | null;
    description: string | null;
    created_by: number;
    last_message_at: string | null;
    active_participants: ChatParticipant[];
    latest_message?: ChatMessage | null;
    unread_count: number;
    created_at: string;
    updated_at: string;
}

export interface ChatParticipant {
    id: number;
    conversation_id: number;
    user_id: number;
    role: 'member' | 'admin';
    last_read_at: string | null;
    joined_at: string;
    left_at: string | null;
    user: Pick<User, 'id' | 'name' | 'email' | 'avatar_url'>;
}

export interface ChatMessage {
    id: number;
    conversation_id: number;
    sender_id: number;
    body: string;
    type: 'text' | 'system';
    status: 'sent' | 'delivered' | 'read' | 'failed';
    attachment_url?: string | null;
    attachment_name?: string | null;
    attachment_type?: 'image' | 'video' | 'audio' | 'document' | null;
    attachment_size?: number | null;
    sender: Pick<User, 'id' | 'name' | 'avatar_url'>;
    created_at: string;
}

export interface ChatContact {
    id: number;
    name: string;
    email: string;
    avatar_url?: string;
    branch_id?: number;
    roles?: Role[];
}

export interface ChatUnreadCount {
    total: number;
}

// Support Chat Types
export interface SupportConversation {
    id: number;
    type: 'chat' | 'ticket';
    ticket_number: string | null;
    company_id: number;
    branch_id: number | null;
    user_id: number;
    subject: string | null;
    description: string | null;
    status: 'pending' | 'in_progress' | 'resolved';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    assigned_admin_name: string | null;
    last_message_at: string | null;
    resolved_at: string | null;
    resolved_by_name: string | null;
    resolution_notes: string | null;
    latest_message?: SupportMessage | null;
    unread_count: number;
    created_at: string;
    updated_at: string;
}

export interface SupportMessage {
    id: number;
    conversation_id: number;
    sender_type: 'client' | 'admin';
    sender_id: number;
    sender_name: string;
    body: string;
    type: 'text' | 'system';
    attachment_url?: string | null;
    attachment_name?: string | null;
    attachment_type?: 'image' | 'video' | 'audio' | 'document' | null;
    attachment_size?: number | null;
    read_at: string | null;
    created_at: string;
}

export interface SupportUnreadCount {
    total: number;
}

// Service Order Types
export interface ServiceOrder {
    id: number;
    company_id: number;
    branch_id: number | null;
    client_id: number | null;
    assigned_to: number | null;
    created_by: number;
    sale_id: number | null;
    order_number: string;
    status: 'pending' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled' | 'invoiced';
    priority: 'low' | 'normal' | 'high' | 'urgent';
    type: 'repair' | 'maintenance' | 'installation' | 'inspection' | 'custom';
    title: string;
    description: string | null;
    equipment_info: string | null;
    scheduled_date: string | null;
    scheduled_time: string | null;
    started_at: string | null;
    completed_at: string | null;
    estimated_duration: number | null;
    actual_duration: number | null;
    diagnosis: string | null;
    resolution_notes: string | null;
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total_amount: number;
    client?: User;
    assigned_to_user?: User;
    created_by_user?: User;
    sale?: any;
    items?: ServiceOrderItem[];
    attachments?: ServiceOrderAttachment[];
    status_history?: ServiceOrderStatusHistory[];
    created_at?: string;
    updated_at?: string;
}

export interface ServiceOrderItem {
    id: number;
    service_order_id: number;
    service_id: number | null;
    product_id: number | null;
    type: 'service' | 'product' | 'labor';
    description: string;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    tax_rate: number;
    tax_amount: number;
    subtotal: number;
    total: number;
    service?: any;
    product?: any;
}

export interface ServiceOrderAttachment {
    id: number;
    service_order_id: number;
    uploaded_by: number;
    file_url: string;
    file_name: string;
    file_type: string | null;
    file_size: number | null;
    category: 'before' | 'during' | 'after' | 'diagnostic' | 'signature' | 'other';
    notes: string | null;
    uploaded_by_user?: User;
    created_at?: string;
}

export interface ServiceOrderStatusHistory {
    id: number;
    service_order_id: number;
    changed_by: number;
    from_status: string | null;
    to_status: string;
    notes: string | null;
    changed_by_user?: User;
    created_at?: string;
}

declare global {
    interface Window {
        // Add any window extensions here
    }
}

declare module '@inertiajs/react' {
    export function usePage<T = PageProps>(): { props: T };
}
