import type { BusinessRecord, BusinessTransactionType } from '@/types';

export interface CurrencySummary {
  currency: string;
  sales: number;
  received: number;
  receivable: number;
  purchases: number;
  paidToSuppliers: number;
  payable: number;
}

export interface InventorySummary {
  item: string;
  purchased: number;
  sold: number;
  remaining: number;
}

export function buildReportSummary(records: BusinessRecord[]) {
  const savedRecords = records.filter((record) => record.status === 'saved');
  const currencies = new Map<string, CurrencySummary>();
  const inventory = new Map<string, InventorySummary>();
  const transactions = savedRecords
    .filter((record) => (record.transactionType ?? 'other') !== 'other')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  for (const record of savedRecords) {
    const type: BusinessTransactionType = record.transactionType ?? 'other';
    if (type === 'other') continue;

    const currency = record.currency?.trim().toUpperCase() || 'Unspecified';
    let currencySummary = currencies.get(currency);
    if (!currencySummary) {
      currencySummary = {
        currency,
        sales: 0,
        received: 0,
        receivable: 0,
        purchases: 0,
        paidToSuppliers: 0,
        payable: 0,
      };
      currencies.set(currency, currencySummary);
    }

    const total = record.amount ?? 0;
    const paid = record.amountPaid ?? 0;
    const pending = Math.max(total - paid, 0);

    if (type === 'sale') {
      currencySummary.sales += total;
      currencySummary.received += paid;
      currencySummary.receivable += pending;
    } else {
      currencySummary.purchases += total;
      currencySummary.paidToSuppliers += paid;
      currencySummary.payable += pending;
    }

    const item = record.task?.trim();
    const quantity = record.quantity ?? 0;
    if (!item || quantity === 0) continue;

    const itemKey = item.toLocaleLowerCase();
    let itemSummary = inventory.get(itemKey);
    if (!itemSummary) {
      itemSummary = { item, purchased: 0, sold: 0, remaining: 0 };
      inventory.set(itemKey, itemSummary);
    }

    if (type === 'purchase') itemSummary.purchased += quantity;
    else itemSummary.sold += quantity;
    itemSummary.remaining = itemSummary.purchased - itemSummary.sold;
  }

  return {
    savedRecordCount: savedRecords.length,
    transactions,
    currencies: [...currencies.values()].sort((a, b) => a.currency.localeCompare(b.currency)),
    inventory: [...inventory.values()].sort((a, b) => a.item.localeCompare(b.item)),
  };
}
