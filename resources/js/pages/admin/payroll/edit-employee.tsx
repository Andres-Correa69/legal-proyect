import { useState, useEffect, useMemo } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import AppLayout from "@/layouts/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
    payrollEmployeeApi,
    payrollApi,
    electronicInvoicingApi,
    type PayrollData,
    type PayrollEmployeeData,
    type PayrollEmployeeEarningData,
    type PayrollEmployeeDeductionData,
    type PayrollCatalogs,
    type BranchUserData,
} from "@/lib/api";
import { toast } from "@/hooks/use-toast";
import { formatCurrency, cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerReport } from "@/components/ui/date-picker-report";
import {
    ArrowLeft,
    AlertCircle,
    Loader2,
    Plus,
    Pencil,
    Trash2,
    Save,
    Send,
    ChevronDown,
    ChevronUp,
    User,
    CreditCard,
    FileDown,
    ExternalLink,
    RefreshCw,
    Copy,
    CalendarIcon,
    XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// ======= DIAN Concept Definitions =======

interface ConceptField {
    key: string;
    label: string;
    type: "number" | "text" | "date" | "select";
    options?: { value: string; label: string }[];
}

interface ConceptDef {
    key: string;
    label: string;
    fields: ConceptField[];
    paymentField?: string; // which field maps to the main "payment" column, default "payment"
}

const EARNING_CONCEPTS: ConceptDef[] = [
    {
        key: "basic",
        label: "Básico (Salario)",
        fields: [
            { key: "worked_days", label: "Días trabajados", type: "number" },
            { key: "worker_salary", label: "Salario", type: "number" },
        ],
        paymentField: "worker_salary",
    },
    {
        key: "transportation_assistance",
        label: "Auxilio de Transporte",
        fields: [{ key: "payment", label: "Valor", type: "number" }],
    },
    {
        key: "daily_overtime",
        label: "Horas Extra Diurnas",
        fields: [
            { key: "quantity", label: "Cantidad (horas)", type: "number" },
            { key: "payment", label: "Valor", type: "number" },
        ],
    },
    {
        key: "overtime_night_hours",
        label: "Horas Extra Nocturnas",
        fields: [
            { key: "quantity", label: "Cantidad (horas)", type: "number" },
            { key: "payment", label: "Valor", type: "number" },
        ],
    },
    {
        key: "hours_night_surcharge",
        label: "Recargo Nocturno",
        fields: [
            { key: "quantity", label: "Cantidad (horas)", type: "number" },
            { key: "payment", label: "Valor", type: "number" },
        ],
    },
    {
        key: "sunday_and_holiday_daily_overtime",
        label: "H.E. Diurnas Dom/Fest",
        fields: [
            { key: "quantity", label: "Cantidad (horas)", type: "number" },
            { key: "payment", label: "Valor", type: "number" },
        ],
    },
    {
        key: "daily_surcharge_hours_on_sundays_and_holidays",
        label: "Recargo Diurno Dom/Fest",
        fields: [
            { key: "quantity", label: "Cantidad (horas)", type: "number" },
            { key: "payment", label: "Valor", type: "number" },
        ],
    },
    {
        key: "sunday_night_overtime_and_holidays",
        label: "H.E. Nocturnas Dom/Fest",
        fields: [
            { key: "quantity", label: "Cantidad (horas)", type: "number" },
            { key: "payment", label: "Valor", type: "number" },
        ],
    },
    {
        key: "sunday_and_holidays_night_surcharge_hours",
        label: "Recargo Nocturno Dom/Fest",
        fields: [
            { key: "quantity", label: "Cantidad (horas)", type: "number" },
            { key: "payment", label: "Valor", type: "number" },
        ],
    },
    {
        key: "vacation_common",
        label: "Vacaciones Disfrutadas",
        fields: [
            { key: "start", label: "Fecha inicio", type: "date" },
            { key: "end", label: "Fecha fin", type: "date" },
            { key: "quantity", label: "Días", type: "number" },
            { key: "payment", label: "Valor", type: "number" },
        ],
    },
    {
        key: "vacation_compensated",
        label: "Vacaciones Compensadas",
        fields: [
            { key: "quantity", label: "Días", type: "number" },
            { key: "payment", label: "Valor", type: "number" },
        ],
    },
    {
        key: "primas",
        label: "Prima de Servicios",
        fields: [
            { key: "quantity", label: "Días", type: "number" },
            { key: "payment", label: "Valor", type: "number" },
        ],
    },
    {
        key: "layoffs",
        label: "Cesantías",
        fields: [
            { key: "payment", label: "Cesantías", type: "number" },
            { key: "percentage", label: "Porcentaje (%)", type: "number" },
            { key: "interest_payment", label: "Intereses", type: "number" },
        ],
    },
    {
        key: "incapacities",
        label: "Incapacidades",
        fields: [
            { key: "start", label: "Fecha inicio", type: "date" },
            { key: "end", label: "Fecha fin", type: "date" },
            { key: "quantity", label: "Días", type: "number" },
            {
                key: "type_incapacity_id",
                label: "Tipo",
                type: "select",
                options: [
                    { value: "1", label: "Común" },
                    { value: "2", label: "Profesional" },
                    { value: "3", label: "Laboral" },
                ],
            },
            { key: "payment", label: "Valor", type: "number" },
        ],
    },
    {
        key: "licensings_maternity",
        label: "Licencia Maternidad/Paternidad",
        fields: [
            { key: "start", label: "Fecha inicio", type: "date" },
            { key: "end", label: "Fecha fin", type: "date" },
            { key: "quantity", label: "Días", type: "number" },
            { key: "payment", label: "Valor", type: "number" },
        ],
    },
    {
        key: "licensings_paid",
        label: "Licencia Remunerada",
        fields: [
            { key: "start", label: "Fecha inicio", type: "date" },
            { key: "end", label: "Fecha fin", type: "date" },
            { key: "quantity", label: "Días", type: "number" },
            { key: "payment", label: "Valor", type: "number" },
        ],
    },
    {
        key: "licensings_unpaid",
        label: "Suspensión No Remunerada",
        fields: [
            { key: "start", label: "Fecha inicio", type: "date" },
            { key: "end", label: "Fecha fin", type: "date" },
            { key: "quantity", label: "Días", type: "number" },
        ],
    },
    {
        key: "bonuses",
        label: "Bonificaciones",
        fields: [
            { key: "payment", label: "Salarial", type: "number" },
            { key: "non_salary_payment", label: "No salarial", type: "number" },
        ],
    },
    {
        key: "assistances",
        label: "Auxilios",
        fields: [
            { key: "payment", label: "Salarial", type: "number" },
            { key: "non_salary_payment", label: "No salarial", type: "number" },
        ],
    },
    {
        key: "legal_strikes",
        label: "Huelga Legal",
        fields: [
            { key: "start", label: "Fecha inicio", type: "date" },
            { key: "end", label: "Fecha fin", type: "date" },
            { key: "quantity", label: "Días", type: "number" },
        ],
    },
    {
        key: "other_concepts",
        label: "Otros Conceptos",
        fields: [
            { key: "description", label: "Descripción", type: "text" },
            { key: "payment", label: "Salarial", type: "number" },
            { key: "non_salary_payment", label: "No salarial", type: "number" },
        ],
    },
    {
        key: "compensations",
        label: "Compensaciones",
        fields: [
            { key: "ordinary", label: "Ordinaria", type: "number" },
            { key: "extraordinary", label: "Extraordinaria", type: "number" },
        ],
    },
    {
        key: "commissions",
        label: "Comisiones",
        fields: [{ key: "payment", label: "Valor", type: "number" }],
    },
    {
        key: "third_party_payments",
        label: "Pagos a Terceros",
        fields: [{ key: "payment", label: "Valor", type: "number" }],
    },
    {
        key: "advances",
        label: "Anticipos",
        fields: [{ key: "payment", label: "Valor", type: "number" }],
    },
    {
        key: "endowment",
        label: "Dotación",
        fields: [{ key: "payment", label: "Valor", type: "number" }],
    },
    {
        key: "sustainment_support",
        label: "Apoyo Sostenimiento",
        fields: [{ key: "payment", label: "Valor", type: "number" }],
    },
    {
        key: "telecommuting",
        label: "Teletrabajo",
        fields: [{ key: "payment", label: "Valor", type: "number" }],
    },
    {
        key: "company_withdrawal_bonus",
        label: "Bonif. por Retiro",
        fields: [{ key: "payment", label: "Valor", type: "number" }],
    },
    {
        key: "compensation_indemnity",
        label: "Indemnización",
        fields: [{ key: "payment", label: "Valor", type: "number" }],
    },
    {
        key: "refund",
        label: "Reintegro",
        fields: [{ key: "payment", label: "Valor", type: "number" }],
    },
];

const DEDUCTION_CONCEPTS: ConceptDef[] = [
    {
        key: "health",
        label: "Salud/EPS",
        fields: [
            { key: "percentage", label: "Porcentaje (%)", type: "number" },
            { key: "payment", label: "Valor", type: "number" },
        ],
    },
    {
        key: "pension_fund",
        label: "Fondo de Pensión",
        fields: [
            { key: "percentage", label: "Porcentaje (%)", type: "number" },
            { key: "payment", label: "Valor", type: "number" },
        ],
    },
    {
        key: "pension_security_fund",
        label: "Fondo Solidaridad Pensional",
        fields: [
            { key: "percentage", label: "Porcentaje (%)", type: "number" },
            { key: "payment", label: "Valor", type: "number" },
            { key: "percentage_subsistence", label: "% Subsistencia", type: "number" },
            { key: "payment_subsistence", label: "Valor Subsistencia", type: "number" },
        ],
    },
    {
        key: "trade_unions",
        label: "Sindicatos",
        fields: [
            { key: "percentage", label: "Porcentaje (%)", type: "number" },
            { key: "payment", label: "Valor", type: "number" },
        ],
    },
    {
        key: "sanctions",
        label: "Sanciones",
        fields: [
            { key: "payment_public", label: "Sanción pública", type: "number" },
            { key: "payment_private", label: "Sanción privada", type: "number" },
        ],
    },
    {
        key: "libranzas",
        label: "Libranzas",
        fields: [
            { key: "description", label: "Descripción", type: "text" },
            { key: "payment", label: "Valor", type: "number" },
        ],
    },
    {
        key: "third_party_payments",
        label: "Pagos a Terceros",
        fields: [{ key: "payment", label: "Valor", type: "number" }],
    },
    {
        key: "advances",
        label: "Anticipos",
        fields: [{ key: "payment", label: "Valor", type: "number" }],
    },
    {
        key: "other_deductions",
        label: "Otras Deducciones",
        fields: [{ key: "payment", label: "Valor", type: "number" }],
    },
    {
        key: "voluntary_pension",
        label: "Pensión Voluntaria",
        fields: [{ key: "payment", label: "Valor", type: "number" }],
    },
    {
        key: "withholding_source",
        label: "Retención en la Fuente",
        fields: [{ key: "payment", label: "Valor", type: "number" }],
    },
    {
        key: "afc",
        label: "AFC",
        fields: [{ key: "payment", label: "Valor", type: "number" }],
    },
    {
        key: "cooperative",
        label: "Cooperativa",
        fields: [{ key: "payment", label: "Valor", type: "number" }],
    },
    {
        key: "tax_lien",
        label: "Embargo Fiscal",
        fields: [{ key: "payment", label: "Valor", type: "number" }],
    },
    {
        key: "complementary_plans",
        label: "Planes Complementarios",
        fields: [{ key: "payment", label: "Valor", type: "number" }],
    },
    {
        key: "education",
        label: "Educación",
        fields: [{ key: "payment", label: "Valor", type: "number" }],
    },
    {
        key: "refund",
        label: "Reintegro",
        fields: [{ key: "payment", label: "Valor", type: "number" }],
    },
    {
        key: "debt",
        label: "Deuda",
        fields: [{ key: "payment", label: "Valor", type: "number" }],
    },
];

const earningConceptMap = new Map(EARNING_CONCEPTS.map((c) => [c.key, c]));
const deductionConceptMap = new Map(DEDUCTION_CONCEPTS.map((c) => [c.key, c]));

// ======= Helper to get payment value from concept data =======
function getPaymentFromConcept(concept: ConceptDef, data: Record<string, any> | null, fallbackPayment: number): number {
    if (concept.paymentField && data) {
        return Number(data[concept.paymentField]) || 0;
    }
    // For concepts with non-standard payment fields, sum payment-like fields
    if (data) {
        if (concept.key === "sanctions") {
            return (Number(data.payment_public) || 0) + (Number(data.payment_private) || 0);
        }
        if (concept.key === "compensations") {
            return (Number(data.ordinary) || 0) + (Number(data.extraordinary) || 0);
        }
        if (concept.key === "layoffs") {
            return (Number(data.payment) || 0) + (Number(data.interest_payment) || 0);
        }
        if (concept.key === "pension_security_fund") {
            return (Number(data.payment) || 0) + (Number(data.payment_subsistence) || 0);
        }
        // For concepts with payment + non_salary_payment
        if (data.payment !== undefined && data.non_salary_payment !== undefined) {
            return (Number(data.payment) || 0) + (Number(data.non_salary_payment) || 0);
        }
    }
    return fallbackPayment;
}

// ======= Component =======

export default function EditEmployee() {
    const { payrollId, userId } = usePage<{ payrollId: number; userId: number }>().props;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [payroll, setPayroll] = useState<PayrollData | null>(null);
    const [employee, setEmployee] = useState<BranchUserData | null>(null);
    const [payrollEmployee, setPayrollEmployee] = useState<PayrollEmployeeData | null>(null);
    const [earnings, setEarnings] = useState<PayrollEmployeeEarningData[]>([]);
    const [deductions, setDeductions] = useState<PayrollEmployeeDeductionData[]>([]);

    // Catalogs + labor data
    const [catalogs, setCatalogs] = useState<PayrollCatalogs | null>(null);
    const municipalityOptions = useMemo(() => {
        const deptMap = new Map<string, string>();
        (catalogs?.departments ?? []).forEach((d) => deptMap.set(d.code, d.name));
        return (catalogs?.municipalities ?? []).map((m) => {
            const deptCode = (m.code ?? '').substring(0, 2);
            const deptName = deptMap.get(deptCode);
            return { value: String(m.id), label: deptName ? `${m.name} - ${deptName}` : m.name };
        });
    }, [catalogs?.municipalities, catalogs?.departments]);
    const [laborSectionOpen, setLaborSectionOpen] = useState(false);
    const [laborSaving, setLaborSaving] = useState(false);
    const [emitting, setEmitting] = useState(false);
    const [previousRecords, setPreviousRecords] = useState<(PayrollEmployeeData & { payroll?: { id: number; prefix: string; number: number; settlement_start_date: string; settlement_end_date: string } })[]>([]);
    const [checkingStatus, setCheckingStatus] = useState(false);
    const [mockPayload, setMockPayload] = useState<Record<string, unknown> | null>(null);

    // Labor form fields
    const [laborForm, setLaborForm] = useState({
        type_document_identification_id: "",
        identification_number: "",
        surname: "",
        second_surname: "",
        first_name: "",
        other_names: "",
        type_worker_id: "",
        subtype_worker_id: "",
        type_contract_id: "",
        integral_salary: false,
        high_risk_pension: false,
        admission_date: "",
        salary: "",
        municipality_id: "",
        address: "",
        payment_form_id: "",
        payment_method_id: "",
        bank: "",
        account_type: "",
        account_number: "",
    });

    // Dialog state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogType, setDialogType] = useState<"earning" | "deduction">("earning");
    const [editingItem, setEditingItem] = useState<PayrollEmployeeEarningData | PayrollEmployeeDeductionData | null>(null);
    const [formConcept, setFormConcept] = useState("");
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [formLoading, setFormLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    useEffect(() => {
        loadData();
        loadCatalogs();
        loadPreviousRecords();
    }, [payrollId, userId]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await payrollEmployeeApi.getDetail(payrollId, userId);
            setPayroll(data.payroll);
            setEmployee(data.employee);
            setPayrollEmployee(data.payroll_employee);
            setEarnings(data.payroll_employee.earnings ?? []);
            setDeductions(data.payroll_employee.deductions ?? []);
            populateLaborForm(data.payroll_employee, data.employee);
            // Load previous records for copy feature
            try {
                const prev = await payrollEmployeeApi.getPreviousRecords(data.employee.id);
                setPreviousRecords(prev);
            } catch {
                // Non-critical, silently ignore
            }
        } catch (err: any) {
            setError(err?.message || "Error al cargar los datos.");
        } finally {
            setLoading(false);
        }
    };

    const loadCatalogs = async () => {
        try {
            const data = await payrollApi.getCatalogs();
            setCatalogs(data);
        } catch {
            // Catalogs are optional for viewing, silently ignore
        }
    };

    const loadPreviousRecords = async () => {
        try {
            const records = await payrollEmployeeApi.getPreviousRecords(userId);
            // Filter out the current payroll's record
            setPreviousRecords(records.filter((r) => r.payroll_id !== payrollId));
        } catch {
            // Silently ignore
        }
    };

    const populateLaborForm = (pe: PayrollEmployeeData, emp: BranchUserData) => {
        setLaborForm({
            type_document_identification_id: pe.type_document_identification_id ? String(pe.type_document_identification_id) : "",
            identification_number: pe.identification_number || "",
            surname: pe.surname || "",
            second_surname: pe.second_surname || "",
            first_name: pe.first_name || "",
            other_names: pe.other_names || "",
            type_worker_id: pe.type_worker_id ? String(pe.type_worker_id) : "1",
            subtype_worker_id: pe.subtype_worker_id ? String(pe.subtype_worker_id) : "1",
            type_contract_id: pe.type_contract_id ? String(pe.type_contract_id) : "2",
            integral_salary: pe.integral_salary || false,
            high_risk_pension: pe.high_risk_pension || false,
            admission_date: pe.admission_date ? String(pe.admission_date).split("T")[0] : "",
            salary: pe.salary ? String(pe.salary) : "",
            municipality_id: pe.municipality_id ? String(pe.municipality_id) : "",
            address: pe.address || emp.address || "",
            payment_form_id: pe.payment_form_id ? String(pe.payment_form_id) : "1",
            payment_method_id: pe.payment_method_id ? String(pe.payment_method_id) : "42",
            bank: pe.bank || "",
            account_type: pe.account_type || "",
            account_number: pe.account_number || "",
        });
    };

    const [copyingData, setCopyingData] = useState(false);
    const [copyDialogOpen, setCopyDialogOpen] = useState(false);
    const [pendingCopyRecord, setPendingCopyRecord] = useState<PayrollEmployeeData | null>(null);
    const [hasCopiedData, setHasCopiedData] = useState(false);

    const requestCopy = (record: PayrollEmployeeData) => {
        setPendingCopyRecord(record);
        setCopyDialogOpen(true);
    };

    const confirmCopy = () => {
        setCopyDialogOpen(false);
        if (pendingCopyRecord) handleCopyFromPrevious(pendingCopyRecord);
    };

    const clearCopiedData = async () => {
        if (!payrollEmployee) return;
        setCopyingData(true);
        try {
            for (const e of earnings) {
                await payrollEmployeeApi.deleteEarning(e.id);
            }
            for (const d of deductions) {
                await payrollEmployeeApi.deleteDeduction(d.id);
            }
            setEarnings([]);
            setDeductions([]);
            setHasCopiedData(false);
            toast({ title: "Datos limpiados", description: "Se eliminaron los devengados y deducciones copiados." });
        } catch {
            toast({ title: "Error", description: "No se pudieron limpiar los datos.", variant: "destructive" });
        } finally {
            setCopyingData(false);
        }
    };

    const handleCopyFromPrevious = async (record: PayrollEmployeeData) => {
        setLaborForm({
            type_document_identification_id: record.type_document_identification_id ? String(record.type_document_identification_id) : "",
            identification_number: record.identification_number || "",
            surname: record.surname || "",
            second_surname: record.second_surname || "",
            first_name: record.first_name || "",
            other_names: record.other_names || "",
            type_worker_id: record.type_worker_id ? String(record.type_worker_id) : "1",
            subtype_worker_id: record.subtype_worker_id ? String(record.subtype_worker_id) : "1",
            type_contract_id: record.type_contract_id ? String(record.type_contract_id) : "2",
            integral_salary: record.integral_salary || false,
            high_risk_pension: record.high_risk_pension || false,
            admission_date: record.admission_date ? String(record.admission_date).split("T")[0] : "",
            salary: record.salary ? String(record.salary) : "",
            municipality_id: record.municipality_id ? String(record.municipality_id) : "",
            address: record.address || "",
            payment_form_id: record.payment_form_id ? String(record.payment_form_id) : "1",
            payment_method_id: record.payment_method_id ? String(record.payment_method_id) : "42",
            bank: record.bank || "",
            account_type: record.account_type || "",
            account_number: record.account_number || "",
        });

        if (!payrollEmployee) {
            toast({ title: "Datos copiados", description: "Se copiaron los datos laborales. Recuerda guardar los cambios." });
            return;
        }

        // Copy earnings and deductions
        const prevEarnings = (record as any).earnings ?? [];
        const prevDeductions = (record as any).deductions ?? [];

        if (prevEarnings.length === 0 && prevDeductions.length === 0) {
            toast({ title: "Datos copiados", description: "Se copiaron los datos laborales. No había devengados ni deducciones para copiar." });
            return;
        }

        setCopyingData(true);
        try {
            // Delete existing earnings and deductions first
            for (const e of earnings) {
                await payrollEmployeeApi.deleteEarning(e.id);
            }
            for (const d of deductions) {
                await payrollEmployeeApi.deleteDeduction(d.id);
            }

            // Create new earnings from previous record
            const newEarnings: PayrollEmployeeEarningData[] = [];
            for (const e of prevEarnings) {
                const created = await payrollEmployeeApi.createEarning(payrollEmployee.id, {
                    concept: e.concept,
                    data: e.data ?? null,
                    payment: Number(e.payment),
                });
                newEarnings.push(created);
            }
            setEarnings(newEarnings);

            // Create new deductions from previous record
            const newDeductions: PayrollEmployeeDeductionData[] = [];
            for (const d of prevDeductions) {
                const created = await payrollEmployeeApi.createDeduction(payrollEmployee.id, {
                    concept: d.concept,
                    data: d.data ?? null,
                    payment: Number(d.payment),
                });
                newDeductions.push(created);
            }
            setDeductions(newDeductions);

            setHasCopiedData(true);
            toast({ title: "Datos copiados", description: `Se copiaron datos laborales, ${newEarnings.length} devengado(s) y ${newDeductions.length} deducción(es). Recuerda guardar los cambios.` });
        } catch (err: any) {
            toast({ title: "Error", description: "Se copiaron los datos laborales pero hubo un error al copiar devengados/deducciones.", variant: "destructive" });
        } finally {
            setCopyingData(false);
        }
    };

    const handleLaborFieldChange = (key: string, value: string | boolean) => {
        setLaborForm((prev) => ({ ...prev, [key]: value }));
    };

    const handleSaveLaborData = async () => {
        if (!payrollEmployee) return;

        // Validate required fields
        if (!laborForm.first_name.trim()) {
            toast({ title: "Error", description: "El primer nombre es obligatorio.", variant: "destructive" });
            return;
        }
        if (!laborForm.surname.trim()) {
            toast({ title: "Error", description: "El primer apellido es obligatorio.", variant: "destructive" });
            return;
        }
        if (!laborForm.type_document_identification_id) {
            toast({ title: "Error", description: "El tipo de documento es obligatorio.", variant: "destructive" });
            return;
        }
        if (!laborForm.identification_number.trim()) {
            toast({ title: "Error", description: "El número de identificación es obligatorio.", variant: "destructive" });
            return;
        }

        setLaborSaving(true);
        try {
            const payload: Record<string, any> = {
                type_document_identification_id: laborForm.type_document_identification_id ? Number(laborForm.type_document_identification_id) : null,
                identification_number: laborForm.identification_number,
                surname: laborForm.surname,
                second_surname: laborForm.second_surname || null,
                first_name: laborForm.first_name,
                other_names: laborForm.other_names || null,
                type_worker_id: Number(laborForm.type_worker_id) || 1,
                subtype_worker_id: Number(laborForm.subtype_worker_id) || 1,
                type_contract_id: Number(laborForm.type_contract_id) || 2,
                integral_salary: laborForm.integral_salary,
                high_risk_pension: laborForm.high_risk_pension,
                admission_date: laborForm.admission_date || null,
                salary: laborForm.salary ? Number(laborForm.salary) : 0,
                municipality_id: laborForm.municipality_id ? Number(laborForm.municipality_id) : null,
                address: laborForm.address,
                payment_form_id: Number(laborForm.payment_form_id) || 1,
                payment_method_id: Number(laborForm.payment_method_id) || 42,
                bank: laborForm.bank || null,
                account_type: laborForm.account_type || null,
                account_number: laborForm.account_number || null,
            };
            const updated = await payrollEmployeeApi.updateLaborData(payrollEmployee.id, payload);
            setPayrollEmployee((prev) => prev ? { ...prev, ...updated } : prev);
            if (updated.earnings) {
                setEarnings(updated.earnings);
            }
            if (updated.deductions) {
                setDeductions(updated.deductions);
            }
            toast({ title: "Guardado", description: "Datos del empleado actualizados correctamente." });
        } catch (err: any) {
            toast({ title: "Error", description: err?.message || "Error al guardar los datos.", variant: "destructive" });
        } finally {
            setLaborSaving(false);
        }
    };

    const handleEmitPayroll = async () => {
        if (!payrollEmployee || !payroll) return;
        setEmitting(true);
        try {
            const result = await payrollApi.sendEmployee(payroll.id, payrollEmployee.id);
            if (result.is_mock && result.request_payload) {
                setMockPayload(result.request_payload);
                toast({ title: "[MOCK] Nómina emitida", description: "Modo de prueba. Revisa el JSON enviado." });
            } else {
                toast({ title: "Nómina emitida", description: `UUID: ${result.uuid || "Procesada exitosamente"}` });
            }
            loadData();
        } catch (err: any) {
            const msg = err?.message || "Error al emitir la nómina.";
            toast({ title: "Error al emitir", description: msg, variant: "destructive" });
        } finally {
            setEmitting(false);
        }
    };

    const handleCheckPayrollStatus = async () => {
        if (!payrollEmployee?.uuid) return;
        setCheckingStatus(true);
        try {
            const result = await electronicInvoicingApi.checkDocumentStatus("payroll", payrollEmployee.id);
            if (result.success) {
                toast({ title: "Estado consultado", description: result.data?.status_description || "Consulta exitosa" });
                loadData();
            } else {
                toast({ title: "Error", description: result.message || "No se pudo consultar el estado.", variant: "destructive" });
            }
        } catch (err: any) {
            toast({ title: "Error", description: err?.message || "Error al consultar estado.", variant: "destructive" });
        } finally {
            setCheckingStatus(false);
        }
    };

    const getMonthLabel = (dateString: string): string => {
        const raw = dateString.split("T")[0];
        const date = new Date(raw + "T12:00:00");
        return format(date, "MMMM yyyy", { locale: es });
    };

    const formatDate = (dateString: string): string => {
        const raw = dateString.split("T")[0];
        return raw;
    };

    const getNumeracion = (): string => {
        if (!payroll) return "-";
        if (payroll.prefix && payroll.number !== null) {
            return `${payroll.prefix}-${String(payroll.number).padStart(4, "0")}`;
        }
        return payroll.number !== null ? String(payroll.number) : "-";
    };

    const employeeName = useMemo(() => {
        if (!employee) return "";
        return employee.name || `${employee.first_name || ""} ${employee.last_name || ""}`.trim();
    }, [employee]);

    const earningsTotal = useMemo(() => {
        return earnings.filter((e) => e.is_active).reduce((sum, e) => sum + Number(e.payment), 0);
    }, [earnings]);

    const deductionsTotal = useMemo(() => {
        return deductions.filter((d) => d.is_active).reduce((sum, d) => sum + Number(d.payment), 0);
    }, [deductions]);

    // ======= Dialog handlers =======

    const openAddDialog = (type: "earning" | "deduction") => {
        setDialogType(type);
        setEditingItem(null);
        setFormConcept("");
        setFormData({});
        setFormErrors({});
        setDialogOpen(true);
    };

    const openEditDialog = (type: "earning" | "deduction", item: PayrollEmployeeEarningData | PayrollEmployeeDeductionData) => {
        setDialogType(type);
        setEditingItem(item);
        setFormConcept(item.concept);

        // Populate form data from item.data and payment
        const conceptDef = type === "earning" ? earningConceptMap.get(item.concept) : deductionConceptMap.get(item.concept);
        const populated: Record<string, string> = {};
        if (conceptDef) {
            for (const field of conceptDef.fields) {
                const val = item.data?.[field.key];
                populated[field.key] = val !== undefined && val !== null ? String(val) : "";
            }
        }
        // For basic concept, worker_salary maps to payment
        if (item.concept === "basic" && !populated.worker_salary) {
            populated.worker_salary = String(item.payment || 0);
        }
        setFormData(populated);
        setFormErrors({});
        setDialogOpen(true);
    };

    const getConceptDef = (): ConceptDef | undefined => {
        const concepts = dialogType === "earning" ? EARNING_CONCEPTS : DEDUCTION_CONCEPTS;
        return concepts.find((c) => c.key === formConcept);
    };

    const handleConceptChange = (value: string) => {
        setFormConcept(value);
        setFormData({});
    };

    const handleFieldChange = (key: string, value: string) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
        if (formErrors[key]) {
            setFormErrors((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        }
    };

    const validateForm = (): boolean => {
        const def = getConceptDef();
        if (!def) return false;

        const errors: Record<string, string> = {};
        for (const field of def.fields) {
            const val = (formData[field.key] ?? "").trim();
            if (!val) {
                errors[field.key] = "Este campo es obligatorio";
            } else if (field.type === "number" && isNaN(Number(val))) {
                errors[field.key] = "Debe ser un número válido";
            }
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!payrollEmployee || !formConcept) return;

        const conceptDef = getConceptDef();
        if (!conceptDef) return;

        if (!validateForm()) return;

        setFormLoading(true);
        try {
            // Build data object from form
            const dataObj: Record<string, any> = {};
            for (const field of conceptDef.fields) {
                const val = formData[field.key] ?? "";
                if (field.type === "number") {
                    dataObj[field.key] = val ? Number(val) : 0;
                } else {
                    dataObj[field.key] = val;
                }
            }

            // Calculate the main payment amount
            const payment = getPaymentFromConcept(conceptDef, dataObj, Number(formData.payment) || 0);

            if (editingItem) {
                // Update
                if (dialogType === "earning") {
                    const updated = await payrollEmployeeApi.updateEarning(editingItem.id, {
                        concept: formConcept,
                        data: dataObj,
                        payment,
                    });
                    setEarnings((prev) => prev.map((e) => (e.id === editingItem.id ? { ...e, ...updated, data: dataObj, payment } : e)));
                } else {
                    const updated = await payrollEmployeeApi.updateDeduction(editingItem.id, {
                        concept: formConcept,
                        data: dataObj,
                        payment,
                    });
                    setDeductions((prev) => prev.map((d) => (d.id === editingItem.id ? { ...d, ...updated, data: dataObj, payment } : d)));
                }
                toast({ title: "Actualizado", description: `${dialogType === "earning" ? "Devengado" : "Deducción"} actualizado correctamente.` });
            } else {
                // Create
                if (dialogType === "earning") {
                    const created = await payrollEmployeeApi.createEarning(payrollEmployee.id, {
                        concept: formConcept,
                        data: dataObj,
                        payment,
                    });
                    setEarnings((prev) => [...prev, created]);
                } else {
                    const created = await payrollEmployeeApi.createDeduction(payrollEmployee.id, {
                        concept: formConcept,
                        data: dataObj,
                        payment,
                    });
                    setDeductions((prev) => [...prev, created]);
                }
                toast({ title: "Creado", description: `${dialogType === "earning" ? "Devengado" : "Deducción"} creado correctamente.` });
            }

            setDialogOpen(false);
            // Reload to get recalculated totals
            loadData();
        } catch (err: any) {
            toast({ title: "Error", description: err?.message || "Error al guardar.", variant: "destructive" });
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (type: "earning" | "deduction", id: number) => {
        setDeletingId(id);
        try {
            if (type === "earning") {
                await payrollEmployeeApi.deleteEarning(id);
                setEarnings((prev) => prev.filter((e) => e.id !== id));
            } else {
                await payrollEmployeeApi.deleteDeduction(id);
                setDeductions((prev) => prev.filter((d) => d.id !== id));
            }
            toast({ title: "Eliminado", description: `${type === "earning" ? "Devengado" : "Deducción"} eliminado correctamente.` });
            loadData();
        } catch (err: any) {
            toast({ title: "Error", description: err?.message || "Error al eliminar.", variant: "destructive" });
        } finally {
            setDeletingId(null);
        }
    };

    // ======= Render =======

    if (loading) {
        return (
            <AppLayout title="Editar Nómina">
                <Head title="Editar Nómina" />
                <div className="flex items-center justify-center py-20 gap-2">
                    <Spinner className="mr-2" />
                    <span className="text-muted-foreground">Cargando datos del empleado...</span>
                </div>
            </AppLayout>
        );
    }

    if (error || !payroll || !employee || !payrollEmployee) {
        return (
            <AppLayout title="Editar Nómina">
                <Head title="Editar Nómina" />
                <div className="space-y-4">
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error || "No se encontraron los datos."}</AlertDescription>
                    </Alert>
                    <Button variant="outline" onClick={() => router.visit(`/admin/payroll/${payrollId}`)}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Volver
                    </Button>
                </div>
            </AppLayout>
        );
    }

    const conceptDef = getConceptDef();
    const availableConcepts = dialogType === "earning" ? EARNING_CONCEPTS : DEDUCTION_CONCEPTS;

    return (
        <AppLayout title="Editar Nómina Empleado">
            <Head title={`Nómina - ${employeeName}`} />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.visit(`/admin/payroll/${payrollId}`)}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="bg-primary h-12 w-12 rounded-full flex items-center justify-center text-primary-foreground text-xl font-bold">
                        {(payroll.prefix || "N").charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">
                            {getNumeracion()}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Editar nómina del empleado
                        </p>
                    </div>
                </div>

                <Separator />

                {/* Copy from previous payroll - Global (only if not yet emitted) */}
                {previousRecords.length > 0 && !payrollEmployee?.accepted && (
                    <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                        <Copy className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">Copiar datos de nómina anterior</p>
                            <p className="text-xs text-muted-foreground">Selecciona una nómina para copiar datos, devengados y deducciones</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Select disabled={copyingData} onValueChange={(v) => {
                                const record = previousRecords.find((r) => String(r.id) === v);
                                if (record) requestCopy(record);
                            }}>
                                <SelectTrigger className="w-full sm:w-[280px] h-9 bg-background">
                                    <SelectValue placeholder="Seleccionar nómina..." />
                                </SelectTrigger>
                                <SelectContent className="bg-card z-50">
                                    {previousRecords.map((record) => {
                                        const p = record.payroll;
                                        const label = p
                                            ? `${p.prefix}-${String(p.number).padStart(4, "0")} — ${format(new Date(p.settlement_start_date.split("T")[0] + "T12:00:00"), "MMM yyyy", { locale: es })}`
                                            : `Nómina #${record.payroll_id}`;
                                        return (
                                            <SelectItem key={record.id} value={String(record.id)}>
                                                {label}
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                            {hasCopiedData && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 text-destructive hover:text-destructive"
                                    disabled={copyingData}
                                    onClick={clearCopiedData}
                                >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Limpiar
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* Employee Info */}
                <Card>
                    <CardContent className="pt-6 pb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">Empleado</p>
                                    <p className="font-medium">{employeeName}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Número de identificación</p>
                                    <p className="font-medium">{employee.document_id || "-"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Mes</p>
                                    <p className="font-medium capitalize">{getMonthLabel(payroll.settlement_start_date)}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">Fecha de emisión</p>
                                    <p className="font-medium">{formatDate(payroll.issue_date)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Fecha inicio liquidación</p>
                                    <p className="font-medium">{formatDate(payroll.settlement_start_date)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Fecha fin liquidación</p>
                                    <p className="font-medium">{formatDate(payroll.settlement_end_date)}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Labor & Payment Data Section */}
                <Card>
                    <CardHeader
                        className="cursor-pointer select-none"
                        onClick={() => setLaborSectionOpen(!laborSectionOpen)}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                <CardTitle className="text-base">Datos del empleado para nómina DIAN</CardTitle>
                            </div>
                            {laborSectionOpen ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                        </div>
                    </CardHeader>
                    {laborSectionOpen && (
                        <CardContent className="space-y-6">
                            {/* Copy from previous payroll */}
                            {previousRecords.length > 0 && (
                                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                                    <Copy className="h-4 w-4 text-primary shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">Copiar datos de nómina anterior</p>
                                        <p className="text-xs text-muted-foreground">Selecciona una nómina para copiar los datos del empleado</p>
                                    </div>
                                    <Select onValueChange={(v) => {
                                        const record = previousRecords.find((r) => String(r.id) === v);
                                        if (record) handleCopyFromPrevious(record);
                                    }}>
                                        <SelectTrigger className="w-full sm:w-[280px] h-9 bg-background">
                                            <SelectValue placeholder="Seleccionar nómina..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card z-50">
                                            {previousRecords.map((record) => {
                                                const p = record.payroll;
                                                const label = p
                                                    ? `${p.prefix}-${String(p.number).padStart(4, "0")} — ${format(new Date(p.settlement_start_date.split("T")[0] + "T12:00:00"), "MMM yyyy", { locale: es })}`
                                                    : `Nómina #${record.payroll_id}`;
                                                return (
                                                    <SelectItem key={record.id} value={String(record.id)}>
                                                        {label}
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {/* Identity */}
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Identificación</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tipo documento</Label>
                                        <Select
                                            value={laborForm.type_document_identification_id}
                                            onValueChange={(v) => handleLaborFieldChange("type_document_identification_id", v)}
                                        >
                                            <SelectTrigger className="h-10 bg-background">
                                                <SelectValue placeholder="Seleccionar..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card z-50 max-h-60">
                                                {(catalogs?.type_document_identifications ?? []).map((item) => (
                                                    <SelectItem key={item.id} value={String(item.id)}>
                                                        {item.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Nro. identificación</Label>
                                        <Input
                                            value={laborForm.identification_number}
                                            onChange={(e) => handleLaborFieldChange("identification_number", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Primer apellido *</Label>
                                        <Input
                                            value={laborForm.surname}
                                            onChange={(e) => handleLaborFieldChange("surname", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Segundo apellido</Label>
                                        <Input
                                            value={laborForm.second_surname}
                                            onChange={(e) => handleLaborFieldChange("second_surname", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Primer nombre *</Label>
                                        <Input
                                            value={laborForm.first_name}
                                            onChange={(e) => handleLaborFieldChange("first_name", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Otros nombres</Label>
                                        <Input
                                            value={laborForm.other_names}
                                            onChange={(e) => handleLaborFieldChange("other_names", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Labor info */}
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Datos laborales</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Tipo trabajador</Label>
                                        <Select
                                            value={laborForm.type_worker_id}
                                            onValueChange={(v) => handleLaborFieldChange("type_worker_id", v)}
                                        >
                                            <SelectTrigger className="h-10 bg-background">
                                                <SelectValue placeholder="Seleccionar..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card z-50 max-h-60">
                                                {(catalogs?.type_workers ?? []).map((item) => (
                                                    <SelectItem key={item.id} value={String(item.id)}>
                                                        {item.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Subtipo trabajador</Label>
                                        <Select
                                            value={laborForm.subtype_worker_id}
                                            onValueChange={(v) => handleLaborFieldChange("subtype_worker_id", v)}
                                        >
                                            <SelectTrigger className="h-10 bg-background">
                                                <SelectValue placeholder="Seleccionar..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card z-50 max-h-60">
                                                {(catalogs?.sub_type_workers ?? []).map((item) => (
                                                    <SelectItem key={item.id} value={String(item.id)}>
                                                        {item.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tipo contrato</Label>
                                        <Select
                                            value={laborForm.type_contract_id}
                                            onValueChange={(v) => handleLaborFieldChange("type_contract_id", v)}
                                        >
                                            <SelectTrigger className="h-10 bg-background">
                                                <SelectValue placeholder="Seleccionar..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card z-50 max-h-60">
                                                {(catalogs?.type_contracts ?? []).map((item) => (
                                                    <SelectItem key={item.id} value={String(item.id)}>
                                                        {item.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Salario *</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            value={laborForm.salary}
                                            onChange={(e) => handleLaborFieldChange("salary", e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Fecha de ingreso *</Label>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className={cn("h-10 w-full justify-start text-left font-normal text-sm", !laborForm.admission_date && "text-muted-foreground")}>
                                                    <CalendarIcon className="h-3.5 w-3.5 mr-2" />
                                                    {laborForm.admission_date ? new Date(laborForm.admission_date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : "Seleccionar fecha"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <DatePickerReport
                                                    selected={laborForm.admission_date ? new Date(laborForm.admission_date + 'T12:00:00') : undefined}
                                                    onSelect={(date) => {
                                                        if (date) {
                                                            const y = date.getFullYear();
                                                            const m = String(date.getMonth() + 1).padStart(2, '0');
                                                            const d = String(date.getDate()).padStart(2, '0');
                                                            handleLaborFieldChange("admission_date", `${y}-${m}-${d}`);
                                                        }
                                                    }}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Municipio</Label>
                                        <Combobox
                                            options={municipalityOptions}
                                            value={laborForm.municipality_id}
                                            onValueChange={(v) => handleLaborFieldChange("municipality_id", v)}
                                            placeholder="Seleccionar..."
                                            searchPlaceholder="Buscar municipio..."
                                            emptyText="No se encontró el municipio."
                                            className="h-10 bg-background"
                                        />
                                    </div>
                                    <div className="space-y-2 md:col-span-2">
                                        <Label>Dirección</Label>
                                        <Input
                                            value={laborForm.address}
                                            onChange={(e) => handleLaborFieldChange("address", e.target.value)}
                                            placeholder="Dirección del empleado"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 mt-4">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="integral_salary"
                                            checked={laborForm.integral_salary}
                                            onCheckedChange={(checked) => handleLaborFieldChange("integral_salary", !!checked)}
                                        />
                                        <Label htmlFor="integral_salary" className="cursor-pointer">Salario integral</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            id="high_risk_pension"
                                            checked={laborForm.high_risk_pension}
                                            onCheckedChange={(checked) => handleLaborFieldChange("high_risk_pension", !!checked)}
                                        />
                                        <Label htmlFor="high_risk_pension" className="cursor-pointer">Pensión alto riesgo</Label>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Payment info */}
                            <div>
                                <div className="flex items-center gap-2 mb-3">
                                    <CreditCard className="h-4 w-4 text-primary" />
                                    <h3 className="text-sm font-semibold text-muted-foreground">Datos de pago</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Forma de pago</Label>
                                        <Select
                                            value={laborForm.payment_form_id}
                                            onValueChange={(v) => handleLaborFieldChange("payment_form_id", v)}
                                        >
                                            <SelectTrigger className="h-10 bg-background">
                                                <SelectValue placeholder="Seleccionar..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card z-50">
                                                {(catalogs?.payment_forms ?? []).map((item) => (
                                                    <SelectItem key={item.id} value={String(item.id)}>
                                                        {item.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Método de pago</Label>
                                        <Select
                                            value={laborForm.payment_method_id}
                                            onValueChange={(v) => handleLaborFieldChange("payment_method_id", v)}
                                        >
                                            <SelectTrigger className="h-10 bg-background">
                                                <SelectValue placeholder="Seleccionar..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card z-50">
                                                {(catalogs?.payment_methods ?? []).map((item) => (
                                                    <SelectItem key={item.id} value={String(item.id)}>
                                                        {item.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Banco</Label>
                                        <Input
                                            value={laborForm.bank}
                                            onChange={(e) => handleLaborFieldChange("bank", e.target.value)}
                                            placeholder="Nombre del banco"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Tipo de cuenta</Label>
                                        <Select
                                            value={laborForm.account_type}
                                            onValueChange={(v) => handleLaborFieldChange("account_type", v)}
                                        >
                                            <SelectTrigger className="h-10 bg-background">
                                                <SelectValue placeholder="Seleccionar..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-card z-50">
                                                {(catalogs?.account_types ?? []).map((item) => (
                                                    <SelectItem key={item.id} value={item.name}>
                                                        {item.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Nro. cuenta</Label>
                                        <Input
                                            value={laborForm.account_number}
                                            onChange={(e) => handleLaborFieldChange("account_number", e.target.value)}
                                            placeholder="Número de cuenta"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Save button */}
                            <div className="flex justify-end pt-2">
                                <Button onClick={handleSaveLaborData} disabled={laborSaving}>
                                    {laborSaving ? (
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    ) : (
                                        <Save className="h-4 w-4 mr-2" />
                                    )}
                                    Guardar datos empleado
                                </Button>
                            </div>
                        </CardContent>
                    )}
                </Card>

                <Separator />

                {/* DEDUCCIONES Table */}
                <div>
                    <h2 className="text-lg font-semibold text-foreground mb-4">DEDUCCIONES</h2>
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="h-12 px-4">Concepto</TableHead>
                                        <TableHead className="h-12 px-4 text-right">Valor</TableHead>
                                        <TableHead className="h-12 px-4 text-right w-24">Opción</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {deductions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="p-4 text-center text-muted-foreground">
                                                No hay deducciones registradas
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        deductions.map((ded) => {
                                            const def = deductionConceptMap.get(ded.concept);
                                            return (
                                                <TableRow key={ded.id}>
                                                    <TableCell className="p-4">
                                                        {def?.label || ded.concept}
                                                    </TableCell>
                                                    <TableCell className="p-4 text-right font-mono">
                                                        {formatCurrency(Number(ded.payment))}
                                                    </TableCell>
                                                    <TableCell className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0"
                                                                onClick={() => openEditDialog("deduction", ded)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                                                disabled={deletingId === ded.id}
                                                                onClick={() => handleDelete("deduction", ded.id)}
                                                            >
                                                                {deletingId === ded.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                            <div className="flex items-center justify-between p-4 border-t">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openAddDialog("deduction")}
                                    className="rounded-full"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Nueva deducción
                                </Button>
                                <p className="font-mono font-bold">
                                    {formatCurrency(deductionsTotal)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* DEVENGADOS Table */}
                <div>
                    <h2 className="text-lg font-semibold text-foreground mb-4">DEVENGADOS</h2>
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="h-12 px-4">Concepto</TableHead>
                                        <TableHead className="h-12 px-4 text-right">Valor</TableHead>
                                        <TableHead className="h-12 px-4 text-right w-24">Opción</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {earnings.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="p-4 text-center text-muted-foreground">
                                                No hay devengados registrados
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        earnings.map((earn) => {
                                            const def = earningConceptMap.get(earn.concept);
                                            return (
                                                <TableRow key={earn.id}>
                                                    <TableCell className="p-4">
                                                        {def?.label || earn.concept}
                                                    </TableCell>
                                                    <TableCell className="p-4 text-right font-mono">
                                                        {formatCurrency(Number(earn.payment))}
                                                    </TableCell>
                                                    <TableCell className="p-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0"
                                                                onClick={() => openEditDialog("earning", earn)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                                                disabled={deletingId === earn.id}
                                                                onClick={() => handleDelete("earning", earn.id)}
                                                            >
                                                                {deletingId === earn.id ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                            <div className="flex items-center justify-between p-4 border-t">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openAddDialog("earning")}
                                    className="rounded-full"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Nuevo devengado
                                </Button>
                                <p className="font-mono font-bold">
                                    {formatCurrency(earningsTotal)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Separator />

                {/* Summary Bar */}
                <Card>
                    <CardContent className="pt-4 pb-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-8">
                                <div>
                                    <p className="text-xs text-muted-foreground">Total devengados</p>
                                    <p className="text-lg font-bold text-emerald-600">{formatCurrency(earningsTotal)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Total deducciones</p>
                                    <p className="text-lg font-bold text-red-600">{formatCurrency(deductionsTotal)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Neto a pagar</p>
                                    <p className="text-lg font-bold">{formatCurrency(earningsTotal - deductionsTotal)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => router.visit(`/admin/payroll/${payrollId}`)}
                                >
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Volver
                                </Button>
                                {payrollEmployee && !payrollEmployee.accepted && (
                                    <Button
                                        onClick={handleEmitPayroll}
                                        disabled={emitting || earnings.length === 0}
                                    >
                                        {emitting ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Send className="h-4 w-4 mr-2" />
                                        )}
                                        Emitir nómina
                                    </Button>
                                )}
                                {payrollEmployee?.accepted && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                            Emitida
                                        </span>
                                        {payrollEmployee.has_pdf && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => window.open(`/api/electronic-invoicing/payrolls/employees/${payrollEmployee.id}/pdf`, '_blank')}
                                            >
                                                <FileDown className="h-4 w-4 mr-1" />
                                                PDF
                                            </Button>
                                        )}
                                        {payrollEmployee.qr_link && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => window.open(payrollEmployee.qr_link!, '_blank')}
                                            >
                                                <ExternalLink className="h-4 w-4 mr-1" />
                                                DIAN
                                            </Button>
                                        )}
                                        {payrollEmployee.uuid && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={checkingStatus}
                                                onClick={handleCheckPayrollStatus}
                                            >
                                                {checkingStatus ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                                                Estado
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingItem ? "Editar" : "Nuevo"}{" "}
                            {dialogType === "earning" ? "devengado" : "deducción"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingItem
                                ? "Modifica los valores de este concepto."
                                : `Selecciona el concepto de ${dialogType === "earning" ? "devengado" : "deducción"} y completa los campos.`}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Concept selector */}
                        <div className="space-y-2">
                            <Label>Concepto *</Label>
                            <Select
                                value={formConcept}
                                onValueChange={handleConceptChange}
                                disabled={!!editingItem}
                            >
                                <SelectTrigger className="h-10 bg-background">
                                    <SelectValue placeholder="Seleccionar concepto..." />
                                </SelectTrigger>
                                <SelectContent className="bg-card z-50 max-h-60">
                                    {availableConcepts.map((c) => (
                                        <SelectItem key={c.key} value={c.key}>
                                            {c.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Dynamic fields based on concept */}
                        {conceptDef && (
                            <div className="grid gap-4 md:grid-cols-2">
                                {conceptDef.fields.map((field) => (
                                    <div key={field.key} className="space-y-2">
                                        <Label htmlFor={`field-${field.key}`}>{field.label} *</Label>
                                        {field.type === "select" ? (
                                            <Select
                                                value={formData[field.key] || ""}
                                                onValueChange={(val) => handleFieldChange(field.key, val)}
                                            >
                                                <SelectTrigger className={`h-10 bg-background ${formErrors[field.key] ? "border-red-500 ring-red-500" : ""}`}>
                                                    <SelectValue placeholder="Seleccionar..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-card z-50">
                                                    {field.options?.map((opt) => (
                                                        <SelectItem key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Input
                                                id={`field-${field.key}`}
                                                type={field.type}
                                                value={formData[field.key] || ""}
                                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                                placeholder={field.type === "number" ? "0" : ""}
                                                step={field.type === "number" ? "any" : undefined}
                                                className={formErrors[field.key] ? "border-red-500 ring-red-500" : ""}
                                                required
                                            />
                                        )}
                                        {formErrors[field.key] && (
                                            <p className="text-xs text-red-500">{formErrors[field.key]}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!formConcept || formLoading}
                        >
                            {formLoading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4 mr-2" />
                            )}
                            {editingItem ? "Actualizar" : "Crear"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Mock Payload Dialog */}
            <Dialog open={mockPayload !== null} onOpenChange={(open) => { if (!open) setMockPayload(null); }}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>[MOCK] JSON enviado a la DIAN</DialogTitle>
                        <DialogDescription>
                            Este es el payload que se enviaría a la API de nómina electrónica.
                        </DialogDescription>
                    </DialogHeader>
                    <pre className="p-3 bg-muted rounded text-xs overflow-x-auto max-h-96 overflow-y-auto">
                        {JSON.stringify(mockPayload, null, 2)}
                    </pre>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(mockPayload, null, 2));
                                toast({ title: "Copiado", description: "JSON copiado al portapapeles." });
                            }}
                        >
                            Copiar JSON
                        </Button>
                        <Button onClick={() => setMockPayload(null)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Copy confirmation dialog */}
            <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Copy className="h-5 w-5 text-primary" />
                            Confirmar copia
                        </DialogTitle>
                        <DialogDescription>
                            Se copiarán los datos laborales, devengados y deducciones de la nómina seleccionada. Los devengados y deducciones actuales serán reemplazados.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={confirmCopy}>
                            Copiar datos
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
