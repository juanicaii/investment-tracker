"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Asset {
  id: string;
  ticker: string;
  name: string;
  type: "cedear" | "arg_stock" | "stock" | "crypto" | "stablecoin";
  currency: string;
  yahooTicker: string | null;
  coingeckoId: string | null;
  underlyingTicker: string | null;
  conversionRatio: string | null;
  latestPrice: number | null;
  quoteDate: string | null;
}

function formatCurrency(value: number, currency: string = "ARS"): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "cedear": return "CEDEAR";
    case "arg_stock": return "ARG";
    case "stock": return "US";
    case "crypto": return "Crypto";
    case "stablecoin": return "Stable";
    default: return type;
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case "cedear": return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
    case "arg_stock": return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20";
    case "stock": return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
    case "crypto": return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
    case "stablecoin": return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
    default: return "bg-gray-500/10 text-gray-600 border-gray-500/20";
  }
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);

  const [formData, setFormData] = useState({
    ticker: "",
    name: "",
    type: "cedear" as Asset["type"],
    currency: "ARS",
    yahooTicker: "",
    coingeckoId: "",
    underlyingTicker: "",
    conversionRatio: "",
  });

  const [editFormData, setEditFormData] = useState({
    ticker: "",
    name: "",
    type: "cedear" as Asset["type"],
    currency: "ARS",
    yahooTicker: "",
    coingeckoId: "",
    underlyingTicker: "",
    conversionRatio: "",
  });

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch("/api/assets");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAssets(data);
    } catch (error) {
      console.error("Error fetching assets:", error);
      toast.error("Error al cargar activos");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const syncQuotes = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/quotes/sync", { method: "POST" });
      if (!res.ok) throw new Error("Failed to sync quotes");
      const data = await res.json();

      if (data.errors?.length > 0) {
        toast.warning(`Sincronizado con ${data.errors.length} errores`);
      } else {
        toast.success(`Actualizadas ${data.updated} cotizaciones`);
      }
      await fetchAssets();
    } catch (error) {
      console.error("Error syncing quotes:", error);
      toast.error("Error al sincronizar");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload: Record<string, string | undefined> = {
        ticker: formData.ticker,
        name: formData.name,
        type: formData.type,
        currency: formData.currency,
      };

      if (formData.type === "cedear" || formData.type === "arg_stock" || formData.type === "stock") {
        payload.yahooTicker = formData.yahooTicker || undefined;
        if (formData.type === "cedear") {
          payload.underlyingTicker = formData.underlyingTicker || undefined;
          payload.conversionRatio = formData.conversionRatio || undefined;
        }
      } else {
        payload.coingeckoId = formData.coingeckoId || undefined;
      }

      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create asset");
      }

      toast.success("Activo creado");
      setIsDialogOpen(false);
      setFormData({
        ticker: "", name: "", type: "cedear", currency: "ARS",
        yahooTicker: "", coingeckoId: "", underlyingTicker: "", conversionRatio: "",
      });
      fetchAssets();
    } catch (error) {
      console.error("Error creating asset:", error);
      toast.error(error instanceof Error ? error.message : "Error al crear");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (asset: Asset) => {
    setEditingAsset(asset);
    setEditFormData({
      ticker: asset.ticker,
      name: asset.name,
      type: asset.type,
      currency: asset.currency,
      yahooTicker: asset.yahooTicker || "",
      coingeckoId: asset.coingeckoId || "",
      underlyingTicker: asset.underlyingTicker || "",
      conversionRatio: asset.conversionRatio || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;
    setIsSubmitting(true);

    try {
      const payload: Record<string, string | undefined> = {
        ticker: editFormData.ticker,
        name: editFormData.name,
        type: editFormData.type,
        currency: editFormData.currency,
      };

      if (editFormData.type === "cedear" || editFormData.type === "arg_stock" || editFormData.type === "stock") {
        payload.yahooTicker = editFormData.yahooTicker || undefined;
        if (editFormData.type === "cedear") {
          payload.underlyingTicker = editFormData.underlyingTicker || undefined;
          payload.conversionRatio = editFormData.conversionRatio || undefined;
        }
      } else {
        payload.coingeckoId = editFormData.coingeckoId || undefined;
      }

      const res = await fetch(`/api/assets?id=${editingAsset.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update asset");
      }

      toast.success("Activo actualizado");
      setIsEditDialogOpen(false);
      setEditingAsset(null);
      fetchAssets();
    } catch (error) {
      console.error("Error updating asset:", error);
      toast.error(error instanceof Error ? error.message : "Error al actualizar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Estas seguro que queres eliminar este activo?")) return;

    try {
      const res = await fetch(`/api/assets?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete");
      }
      toast.success("Activo eliminado");
      fetchAssets();
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast.error(error instanceof Error ? error.message : "Error al eliminar");
    }
  };

  const filterAssetsByType = (type: string) => assets.filter((a) => a.type === type);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const AssetCard = ({ asset }: { asset: Asset }) => (
    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0",
          getTypeColor(asset.type)
        )}>
          {asset.ticker.slice(0, 2)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{asset.ticker}</span>
            <Badge variant="outline" className={cn("text-xs", getTypeColor(asset.type))}>
              {getTypeLabel(asset.type)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground truncate">{asset.name}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="text-right">
          <p className="font-semibold text-sm sm:text-base">
            {asset.latestPrice ? formatCurrency(asset.latestPrice, asset.currency) : "-"}
          </p>
          <p className="text-xs text-muted-foreground">{asset.currency}</p>
        </div>
        
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(asset)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(asset.id)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );

  const AssetForm = ({ 
    data, 
    setData, 
    onSubmit, 
    submitLabel 
  }: { 
    data: typeof formData; 
    setData: React.Dispatch<React.SetStateAction<typeof formData>>;
    onSubmit: (e: React.FormEvent) => Promise<void>;
    submitLabel: string;
  }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Ticker</Label>
          <Input
            value={data.ticker}
            onChange={(e) => setData((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))}
            placeholder="AAPL"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select
            value={data.type}
            onValueChange={(v: Asset["type"]) => {
              setData((f) => ({
                ...f,
                type: v,
                currency: v === "crypto" || v === "stablecoin" || v === "stock" ? "USD" : "ARS",
              }));
            }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cedear">CEDEAR</SelectItem>
              <SelectItem value="arg_stock">Accion Argentina</SelectItem>
              <SelectItem value="stock">Accion US</SelectItem>
              <SelectItem value="crypto">Crypto</SelectItem>
              <SelectItem value="stablecoin">Stablecoin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Nombre</Label>
        <Input
          value={data.name}
          onChange={(e) => setData((f) => ({ ...f, name: e.target.value }))}
          placeholder="Apple Inc."
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label>Moneda</Label>
        <Select value={data.currency} onValueChange={(v) => setData((f) => ({ ...f, currency: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ARS">ARS</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(data.type === "cedear" || data.type === "arg_stock" || data.type === "stock") && (
        <div className="space-y-2">
          <Label>Yahoo Finance Ticker</Label>
          <Input
            value={data.yahooTicker}
            onChange={(e) => setData((f) => ({ ...f, yahooTicker: e.target.value }))}
            placeholder={data.type === "stock" ? data.ticker || "AAPL" : `${data.ticker || "AAPL"}.BA`}
          />
          <p className="text-xs text-muted-foreground">
            Dejar vacio para auto-generar
          </p>
        </div>
      )}

      {data.type === "cedear" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Ticker Subyacente</Label>
            <Input
              value={data.underlyingTicker}
              onChange={(e) => setData((f) => ({ ...f, underlyingTicker: e.target.value }))}
              placeholder="AAPL"
            />
          </div>
          <div className="space-y-2">
            <Label>Ratio</Label>
            <Input
              value={data.conversionRatio}
              onChange={(e) => setData((f) => ({ ...f, conversionRatio: e.target.value }))}
              placeholder="10"
            />
          </div>
        </div>
      )}

      {(data.type === "crypto" || data.type === "stablecoin") && (
        <div className="space-y-2">
          <Label>CoinGecko ID</Label>
          <Input
            value={data.coingeckoId}
            onChange={(e) => setData((f) => ({ ...f, coingeckoId: e.target.value }))}
            placeholder="bitcoin"
          />
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Guardando..." : submitLabel}
      </Button>
    </form>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Activos</h1>
          <p className="text-muted-foreground text-sm">{assets.length} activos disponibles</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={syncQuotes} disabled={isSyncing} className="gap-2">
            <svg className={cn("w-4 h-4", isSyncing && "animate-spin")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">{isSyncing ? "Sincronizando..." : "Sincronizar"}</span>
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo Activo</DialogTitle>
                <DialogDescription>Agrega un activo para trackear</DialogDescription>
              </DialogHeader>
              <AssetForm data={formData} setData={setFormData} onSubmit={handleSubmit} submitLabel="Crear Activo" />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Assets List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Activos Disponibles
          </CardTitle>
          <CardDescription>Activos que podes trackear en tu portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0 mb-4">
              <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-3 py-1 text-sm">
                Todos ({assets.length})
              </TabsTrigger>
              <TabsTrigger value="cedear" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-full px-3 py-1 text-sm">
                CEDEARs ({filterAssetsByType("cedear").length})
              </TabsTrigger>
              <TabsTrigger value="arg_stock" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white rounded-full px-3 py-1 text-sm">
                ARG ({filterAssetsByType("arg_stock").length})
              </TabsTrigger>
              <TabsTrigger value="stock" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white rounded-full px-3 py-1 text-sm">
                US ({filterAssetsByType("stock").length})
              </TabsTrigger>
              <TabsTrigger value="crypto" className="data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-full px-3 py-1 text-sm">
                Crypto ({filterAssetsByType("crypto").length})
              </TabsTrigger>
              <TabsTrigger value="stablecoin" className="data-[state=active]:bg-green-500 data-[state=active]:text-white rounded-full px-3 py-1 text-sm">
                Stable ({filterAssetsByType("stablecoin").length})
              </TabsTrigger>
            </TabsList>
            
            {["all", "cedear", "arg_stock", "stock", "crypto", "stablecoin"].map((tab) => (
              <TabsContent key={tab} value={tab} className="space-y-2">
                {(tab === "all" ? assets : filterAssetsByType(tab)).length === 0 ? (
                  <div className="text-center py-12">
                    <svg className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p className="text-muted-foreground">No hay activos en esta categoria</p>
                  </div>
                ) : (
                  (tab === "all" ? assets : filterAssetsByType(tab)).map((asset) => (
                    <AssetCard key={asset.id} asset={asset} />
                  ))
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Activo</DialogTitle>
            <DialogDescription>Modifica los detalles del activo</DialogDescription>
          </DialogHeader>
          <AssetForm data={editFormData} setData={setEditFormData} onSubmit={handleEditSubmit} submitLabel="Guardar Cambios" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
