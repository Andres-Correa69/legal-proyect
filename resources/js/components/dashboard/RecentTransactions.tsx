import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardTransaction } from "@/lib/api";

type TransactionType = "expense" | "income" | "invoice";

const typeConfig: Record<TransactionType, { icon: LucideIcon; className: string }> = {
  expense: { icon: ShoppingCart, className: "bg-destructive/10 text-destructive" },
  income: { icon: Receipt, className: "bg-success/10 text-success" },
  invoice: { icon: FileText, className: "bg-primary/10 text-primary" },
};

const formatAmount = (amount: number) => {
  const absAmount = Math.abs(amount);
  const formatted = absAmount.toLocaleString("es-CO");
  return amount >= 0 ? `+$ ${formatted}` : `-$ ${formatted}`;
};

function TransactionItem({ transaction }: { transaction: DashboardTransaction }) {
  const type: TransactionType = transaction.type === 'income' ? 'income' : 'expense';
  const { icon: Icon, className } = typeConfig[type];
  const isPositive = transaction.amount >= 0;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={cn("p-2 rounded-lg shrink-0", className)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm truncate">{transaction.title}</p>
            {transaction.status === "pending" && (
              <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                Pendiente
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{transaction.subtitle}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-2">
        {isPositive ? (
          <ArrowUpRight className="h-4 w-4 text-success" />
        ) : (
          <ArrowDownLeft className="h-4 w-4 text-destructive" />
        )}
        <span className={cn(
          "font-semibold text-sm",
          isPositive ? "text-success" : "text-destructive"
        )}>
          {formatAmount(transaction.amount)}
        </span>
      </div>
    </div>
  );
}

interface RecentTransactionsProps {
  transactions?: DashboardTransaction[];
}

export function RecentTransactions({ transactions = [] }: RecentTransactionsProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Transacciones Recientes</CardTitle>
            <CardDescription>Últimos movimientos</CardDescription>
          </div>
          <Badge variant="secondary" className="font-normal">
            {transactions.length} movimientos
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No hay transacciones recientes
          </p>
        ) : (
          <div className="space-y-1">
            {transactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
