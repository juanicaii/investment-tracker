"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Asset {
  id: string;
  ticker: string;
  name: string;
  type: string;
  currency: string;
}

interface Transaction {
  id: string;
  date: string;
  type: "buy" | "sell";
  quantity: string;
  unitPrice: string;
  fee: string;
  notes: string | null;
  asset: Asset;
}

function formatCurrency(value: number, currency: string = "ARS"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [formData, setFormData] = useState({
    assetId: "",
    date: new Date().toISOString().split("T")[0],
    type: "buy" as "buy" | "sell",
    quantity: "",
    unitPrice: "",
    fee: "0",
    notes: "",
  });

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setTransactions(data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    }
  }, []);

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch("/api/assets");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAssets(data);
    } catch (error) {
      console.error("Error fetching assets:", error);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchTransactions(), fetchAssets()]).finally(() =>
      setIsLoading(false)
    );
  }, [fetchTransactions, fetchAssets]);

  const resetForm = () => {
    setFormData({
      assetId: "",
      date: new Date().toISOString().split("T")[0],
      type: "buy",
      quantity: "",
      unitPrice: "",
      fee: "0",
      notes: "",
    });
    setEditingTransaction(null);
  };

  const openEditDialog = (tx: Transaction) => {
    setEditingTransaction(tx);
    setFormData({
      assetId: tx.asset.id,
      date: tx.date,
      type: tx.type,
      quantity: tx.quantity,
      unitPrice: tx.unitPrice,
      fee: tx.fee || "0",
      notes: tx.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        quantity: parseFloat(formData.quantity),
        unitPrice: parseFloat(formData.unitPrice),
        fee: parseFloat(formData.fee || "0"),
      };

      let res;
      if (editingTransaction) {
        res = await fetch(`/api/transactions?id=${editingTransaction.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save transaction");
      }

      toast.success(editingTransaction ? "Transaction updated" : "Transaction created");
      setIsDialogOpen(false);
      resetForm();
      fetchTransactions();
    } catch (error) {
      console.error("Error saving transaction:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save transaction"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;

    try {
      const res = await fetch(`/api/transactions?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      toast.success("Transaction deleted");
      fetchTransactions();
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction");
    }
  };

  const handleImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const file = formData.get("file") as File;

    if (!file) {
      toast.error("Select a file");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/transactions/import-csv", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to import");
      }

      if (data.errors?.length > 0) {
        toast.warning(`Imported ${data.imported}/${data.total} transactions`);
      } else {
        toast.success(`Imported ${data.imported} transactions`);
      }

      setIsImportDialogOpen(false);
      fetchTransactions();
    } catch (error) {
      console.error("Error importing CSV:", error);
      toast.error(error instanceof Error ? error.message : "Failed to import CSV");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Group transactions by month
  const groupedTransactions = transactions.reduce((acc, tx) => {
    const month = new Date(tx.date).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
    if (!acc[month]) acc[month] = [];
    acc[month].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-up">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Transaction History
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter">
            {transactions.length}
            <span className="text-muted-foreground font-normal text-2xl ml-2">entries</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import from CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV with columns: date, ticker, type, quantity, unit_price, fee, notes
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleImport} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">CSV File</Label>
                  <Input
                    name="file"
                    type="file"
                    accept=".csv"
                    required
                  />
                </div>
                <div className="text-sm text-muted-foreground bg-secondary rounded-lg p-4">
                  <p className="font-medium mb-2">Example format:</p>
                  <code className="text-xs block overflow-x-auto">
                    date,ticker,type,quantity,unit_price,fee,notes<br />
                    2024-01-15,AAPL,buy,10,15000,50,First buy
                  </code>
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Importing..." : "Import"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog 
            open={isDialogOpen} 
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                New
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTransaction ? "Edit Transaction" : "New Transaction"}
                </DialogTitle>
                <DialogDescription>
                  {editingTransaction ? "Modify transaction details" : "Record a buy or sell"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Asset</Label>
                  <Select
                    value={formData.assetId}
                    onValueChange={(v) => setFormData((f) => ({ ...f, assetId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.ticker} - {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Date</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData((f) => ({ ...f, date: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Type</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v: "buy" | "sell") => setFormData((f) => ({ ...f, type: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buy">Buy</SelectItem>
                        <SelectItem value="sell">Sell</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Quantity</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData((f) => ({ ...f, quantity: e.target.value }))}
                      required
                      className="tabular-nums"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Unit Price</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData((f) => ({ ...f, unitPrice: e.target.value }))}
                      required
                      className="tabular-nums"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Fee (optional)</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    value={formData.fee}
                    onChange={(e) => setFormData((f) => ({ ...f, fee: e.target.value }))}
                    className="tabular-nums"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes (optional)</Label>
                  <Input
                    value={formData.notes}
                    onChange={(e) => setFormData((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="e.g. First purchase"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.assetId}
                  className="w-full"
                >
                  {isSubmitting ? "Saving..." : editingTransaction ? "Update" : "Create"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border animate-fade-up stagger-1">
          <p className="text-muted-foreground mb-2">No transactions yet</p>
          <p className="text-sm text-muted-foreground">Create your first transaction to get started</p>
        </div>
      ) : (
        <div className="space-y-8 animate-fade-up stagger-1">
          {Object.entries(groupedTransactions).map(([month, txs]) => (
            <section key={month}>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground">{month}</h3>
                <span className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{txs.length}</span>
              </div>
              
              <div className="space-y-1">
                {txs.map((tx) => {
                  const total = parseFloat(tx.quantity) * parseFloat(tx.unitPrice);
                  const qty = parseFloat(tx.quantity);
                  const isBuy = tx.type === "buy";
                  
                  return (
                    <div
                      key={tx.id}
                      className="group grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 p-4 hover:bg-secondary/50 transition-colors border-b border-border/50"
                    >
                      {/* Date and type indicator */}
                      <div className="sm:col-span-1 flex items-center gap-3 sm:gap-0">
                        <div className={cn(
                          "w-1 h-8 sm:w-full sm:h-1 rounded-full",
                          isBuy ? "bg-loss/50" : "bg-gain/50"
                        )} />
                        <span className="sm:hidden text-xs text-muted-foreground">{formatDate(tx.date)}</span>
                      </div>
                      
                      {/* Asset */}
                      <div className="sm:col-span-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center font-bold text-xs">
                          {tx.asset.ticker.slice(0, 3)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{tx.asset.ticker}</span>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px] px-1.5 py-0",
                                isBuy ? "border-loss/30 text-loss" : "border-gain/30 text-gain"
                              )}
                            >
                              {isBuy ? "BUY" : "SELL"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">{tx.asset.name}</p>
                        </div>
                      </div>
                      
                      {/* Date - desktop */}
                      <div className="hidden sm:flex sm:col-span-2 items-center text-muted-foreground text-sm">
                        {formatDate(tx.date)}
                      </div>
                      
                      {/* Quantity and price */}
                      <div className="sm:col-span-3 flex items-center justify-between sm:justify-start sm:gap-4 text-sm">
                        <span className="tabular-nums">{formatQuantity(qty)}</span>
                        <span className="text-muted-foreground">@</span>
                        <span className="tabular-nums text-muted-foreground">{formatCurrency(parseFloat(tx.unitPrice), tx.asset.currency)}</span>
                      </div>
                      
                      {/* Total and actions */}
                      <div className="sm:col-span-2 flex items-center justify-between">
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(total, tx.asset.currency)}
                        </span>
                        
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEditDialog(tx)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(tx.id)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                      
                      {/* Notes */}
                      {tx.notes && (
                        <div className="sm:col-span-12 sm:col-start-2 text-xs text-muted-foreground italic pl-0 sm:pl-13">
                          {tx.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
