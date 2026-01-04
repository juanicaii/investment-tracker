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
  return new Intl.NumberFormat("en-US", {
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
    case "crypto": return "CRYPTO";
    case "stablecoin": return "STABLE";
    default: return type.toUpperCase();
  }
}

const typeFilters = [
  { value: "all", label: "All" },
  { value: "cedear", label: "CEDEARs" },
  { value: "arg_stock", label: "ARG" },
  { value: "stock", label: "US" },
  { value: "crypto", label: "Crypto" },
  { value: "stablecoin", label: "Stable" },
];

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [activeFilter, setActiveFilter] = useState("all");

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
      toast.error("Failed to load assets");
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
        toast.warning(`Synced with ${data.errors.length} errors`);
      } else {
        toast.success(`Updated ${data.updated} quotes`);
      }
      await fetchAssets();
    } catch (error) {
      console.error("Error syncing quotes:", error);
      toast.error("Failed to sync");
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

      toast.success("Asset created");
      setIsDialogOpen(false);
      setFormData({
        ticker: "", name: "", type: "cedear", currency: "ARS",
        yahooTicker: "", coingeckoId: "", underlyingTicker: "", conversionRatio: "",
      });
      fetchAssets();
    } catch (error) {
      console.error("Error creating asset:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create");
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

      toast.success("Asset updated");
      setIsEditDialogOpen(false);
      setEditingAsset(null);
      fetchAssets();
    } catch (error) {
      console.error("Error updating asset:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this asset?")) return;

    try {
      const res = await fetch(`/api/assets?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete");
      }
      toast.success("Asset deleted");
      fetchAssets();
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  const filteredAssets = activeFilter === "all" 
    ? assets 
    : assets.filter(a => a.type === activeFilter);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

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
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ticker</Label>
          <Input
            value={data.ticker}
            onChange={(e) => setData((f) => ({ ...f, ticker: e.target.value.toUpperCase() }))}
            placeholder="AAPL"
            required
            />
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Type</Label>
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
              <SelectItem value="arg_stock">ARG Stock</SelectItem>
              <SelectItem value="stock">US Stock</SelectItem>
              <SelectItem value="crypto">Crypto</SelectItem>
              <SelectItem value="stablecoin">Stablecoin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Name</Label>
        <Input
          value={data.name}
          onChange={(e) => setData((f) => ({ ...f, name: e.target.value }))}
          placeholder="Apple Inc."
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Currency</Label>
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
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Yahoo Finance Ticker</Label>
          <Input
            value={data.yahooTicker}
            onChange={(e) => setData((f) => ({ ...f, yahooTicker: e.target.value }))}
            placeholder={data.type === "stock" ? data.ticker || "AAPL" : `${data.ticker || "AAPL"}.BA`}
            />
          <p className="text-xs text-muted-foreground">Leave empty to auto-generate</p>
        </div>
      )}

      {data.type === "cedear" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Underlying Ticker</Label>
            <Input
              value={data.underlyingTicker}
              onChange={(e) => setData((f) => ({ ...f, underlyingTicker: e.target.value }))}
              placeholder="AAPL"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Ratio</Label>
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
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">CoinGecko ID</Label>
          <Input
            value={data.coingeckoId}
            onChange={(e) => setData((f) => ({ ...f, coingeckoId: e.target.value }))}
            placeholder="bitcoin"
            />
        </div>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 animate-fade-up">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            Asset Library
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter">
            {assets.length}
            <span className="text-muted-foreground font-normal text-2xl ml-2">assets</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={syncQuotes} disabled={isSyncing} className="gap-2">
            <svg className={cn("w-4 h-4", isSyncing && "animate-spin")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isSyncing ? "Syncing..." : "Sync"}
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Asset</DialogTitle>
                <DialogDescription>Add an asset to track</DialogDescription>
              </DialogHeader>
              <AssetForm data={formData} setData={setFormData} onSubmit={handleSubmit} submitLabel="Create Asset" />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 animate-fade-up stagger-1">
        {typeFilters.map((filter) => {
          const count = filter.value === "all" 
            ? assets.length 
            : assets.filter(a => a.type === filter.value).length;
          
          return (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={cn(
                "px-3 py-1.5 text-sm transition-colors border rounded-full",
                activeFilter === filter.value
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground"
              )}
            >
              {filter.label}
              <span className="ml-1.5 text-xs opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Assets Grid */}
      {filteredAssets.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl animate-fade-up stagger-2">
          <p className="text-muted-foreground mb-2">No assets in this category</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 animate-fade-up stagger-2">
          {filteredAssets.map((asset, index) => (
            <div
              key={asset.id}
              className="group bg-secondary/30 rounded-xl p-5 hover:bg-secondary/50 transition-colors animate-fade-up"
              style={{ animationDelay: `${0.2 + index * 0.02}s` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 bg-background rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {asset.ticker.slice(0, 3)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{asset.ticker}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {getTypeLabel(asset.type)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{asset.name}</p>
                  </div>
                </div>
                
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(asset)}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Button>
                  <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(asset.id)}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground uppercase tracking-wide">Price</span>
                  <span className="font-semibold tabular-nums">
                    {asset.latestPrice ? formatCurrency(asset.latestPrice, asset.currency) : "—"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Asset</DialogTitle>
            <DialogDescription>Modify asset details</DialogDescription>
          </DialogHeader>
          <AssetForm data={editFormData} setData={setEditFormData} onSubmit={handleEditSubmit} submitLabel="Save Changes" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
