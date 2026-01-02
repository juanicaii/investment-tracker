"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
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

      toast.success(editingTransaction ? "Transaccion actualizada" : "Transaccion creada");
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
    if (!confirm("Estas seguro que queres eliminar esta transaccion?")) return;

    try {
      const res = await fetch(`/api/transactions?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      toast.success("Transaccion eliminada");
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
      toast.error("Selecciona un archivo");
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
        toast.warning(
          `Importadas ${data.imported}/${data.total} transacciones`,
          {
            description: data.errors.slice(0, 3).join("\n"),
          }
        );
      } else {
        toast.success(`Importadas ${data.imported} transacciones`);
      }

      setIsImportDialogOpen(false);
      fetchTransactions();
    } catch (error) {
      console.error("Error importing CSV:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to import CSV"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Transacciones</h1>
          <p className="text-muted-foreground text-sm">
            {transactions.length} transacciones registradas
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="hidden sm:inline">Importar</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importar desde CSV</DialogTitle>
                <DialogDescription>
                  Subi un archivo CSV con las columnas: date, ticker, type, quantity, unit_price, fee, notes
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleImport} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file">Archivo CSV</Label>
                  <Input
                    id="file"
                    name="file"
                    type="file"
                    accept=".csv"
                    required
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Ejemplo:</p>
                  <pre className="mt-1 rounded-lg bg-muted p-3 text-xs overflow-x-auto">
                    date,ticker,type,quantity,unit_price,fee,notes{"\n"}
                    2024-01-15,AAPL,buy,10,15000,50,Primera compra
                  </pre>
                </div>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? "Importando..." : "Importar"}
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingTransaction ? "Editar Transaccion" : "Nueva Transaccion"}
                </DialogTitle>
                <DialogDescription>
                  {editingTransaction 
                    ? "Modifica los detalles de la transaccion" 
                    : "Registra una compra o venta"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="asset">Activo</Label>
                  <Select
                    value={formData.assetId}
                    onValueChange={(v) =>
                      setFormData((f) => ({ ...f, assetId: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un activo" />
                    </SelectTrigger>
                    <SelectContent>
                      {assets.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          {asset.ticker} ({asset.type.toUpperCase()}) - {asset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Fecha</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, date: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Tipo</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v: "buy" | "sell") =>
                        setFormData((f) => ({ ...f, type: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buy">Compra</SelectItem>
                        <SelectItem value="sell">Venta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Cantidad</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="any"
                      min="0"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, quantity: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitPrice">Precio Unitario</Label>
                    <Input
                      id="unitPrice"
                      type="number"
                      step="any"
                      min="0"
                      value={formData.unitPrice}
                      onChange={(e) =>
                        setFormData((f) => ({ ...f, unitPrice: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fee">Comision (opcional)</Label>
                  <Input
                    id="fee"
                    type="number"
                    step="any"
                    min="0"
                    value={formData.fee}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, fee: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas (opcional)</Label>
                  <Input
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, notes: e.target.value }))
                    }
                    placeholder="Ej: Primera compra"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.assetId}
                  className="w-full"
                >
                  {isSubmitting 
                    ? "Guardando..." 
                    : editingTransaction 
                      ? "Actualizar" 
                      : "Crear Transaccion"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Historial
          </CardTitle>
          <CardDescription>Todas tus compras y ventas</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-muted-foreground">
                No hay transacciones todavia.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Crea tu primera transaccion para comenzar.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => {
                const total = parseFloat(tx.quantity) * parseFloat(tx.unitPrice);
                const qty = parseFloat(tx.quantity);
                const isBuy = tx.type === "buy";
                
                return (
                  <div
                    key={tx.id}
                    className="p-3 sm:p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group"
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                          isBuy 
                            ? "bg-red-500/10 text-red-600 dark:text-red-400" 
                            : "bg-green-500/10 text-green-600 dark:text-green-400"
                        )}>
                          {isBuy ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{tx.asset.ticker}</span>
                            <Badge variant="outline" className={cn(
                              "text-xs",
                              isBuy ? "border-red-500/30 text-red-600" : "border-green-500/30 text-green-600"
                            )}>
                              {isBuy ? "Compra" : "Venta"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(tx.date)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-bold text-base sm:text-lg">
                            {formatCurrency(total, tx.asset.currency)}
                          </p>
                        </div>
                        
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditDialog(tx)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(tx.id)}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Details row */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50 mt-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Cantidad</p>
                        <p className="font-medium text-sm">
                          {formatQuantity(qty)} {qty === 1 ? "unidad" : "unidades"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Precio unitario</p>
                        <p className="font-medium text-sm">
                          {formatCurrency(parseFloat(tx.unitPrice), tx.asset.currency)}
                        </p>
                      </div>
                    </div>
                    
                    {tx.notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        {tx.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
