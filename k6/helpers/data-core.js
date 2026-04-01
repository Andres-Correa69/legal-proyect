/**
 * Payloads de ejemplo reutilizables para los endpoints core de la aplicacion.
 * Los IDs se obtienen dinamicamente via setup().
 */

export function salePayload(productId, clientId, cashRegisterId, paymentMethodId, amount = 119000) {
  return {
    client_id: clientId,
    seller_id: null,
    type: 'pos',
    invoice_date: new Date().toISOString().split('T')[0],
    items: [
      {
        product_id: productId,
        description: 'Producto prueba k6',
        quantity: 1,
        unit_price: 100000,
        discount_percentage: 0,
        tax_rate: 19,
      },
    ],
    payments: [
      {
        cash_register_id: cashRegisterId,
        payment_method_id: paymentMethodId,
        amount: amount,
        date: new Date().toISOString().split('T')[0],
      },
    ],
  };
}

export function journalEntryPayload(debitAccountId, creditAccountId, amount = 100000) {
  return {
    date: new Date().toISOString().split('T')[0],
    description: 'Asiento de prueba k6 - stress test',
    auto_post: false,
    lines: [
      { account_id: debitAccountId, debit: amount, credit: 0, description: 'Debito k6' },
      { account_id: creditAccountId, debit: 0, credit: amount, description: 'Credito k6' },
    ],
  };
}

export function incomePaymentPayload(saleId, cashRegisterId, paymentMethodId, amount = 50000) {
  return {
    sale_id: saleId,
    cash_register_id: cashRegisterId,
    payment_method_id: paymentMethodId,
    amount: amount,
    notes: 'Pago ingreso k6 stress test',
  };
}

export function expensePaymentPayload(purchaseId, cashRegisterId, paymentMethodId, amount = 50000) {
  return {
    purchase_id: purchaseId,
    cash_register_id: cashRegisterId,
    payment_method_id: paymentMethodId,
    amount: amount,
    notes: 'Pago egreso k6 stress test',
  };
}

export function purchasePayload(supplierId, warehouseId, productId) {
  return {
    supplier_id: supplierId,
    warehouse_id: warehouseId,
    is_credit: false,
    notes: 'Compra k6 stress test',
    items: [
      {
        product_id: productId,
        quantity_ordered: 5,
        unit_cost: 50000,
        tax_rate: 19,
      },
    ],
  };
}

export function dateRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  return {
    date_from: from.toISOString().split('T')[0],
    date_to: now.toISOString().split('T')[0],
  };
}
