"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Holding {
  ticker: string;
  name: string;
  type: string;
  currency: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  currentValue: number;
  costBasis: number;
  valueUsd: number;
  returnPct: number;
  returnAbs: number;
}

interface Portfolio {
  totalValueUsd: number;
  totalCostUsd: number;
  totalReturnAbs: number;
  totalReturnPct: number;
  totalValueArs: number;
  totalCostArs: number;
  totalReturnAbsArs: number;
  dollarRates: {
    oficial: number;
    mep: number;
    blue: number;
  };
  holdings: Holding[];
  updatedAt: string;
}

function formatCurrency(value: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${formatNumber(value)}%`;
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

export default function DashboardPage() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchPortfolio = async () => {
    try {
      const res = await fetch("/api/portfolio");
      if (!res.ok) throw new Error("Failed to fetch portfolio");
      const data = await res.json();
      setPortfolio(data);
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      toast.error("Failed to load portfolio");
    } finally {
      setIsLoading(false);
    }
  };

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

      await fetchPortfolio();
    } catch (error) {
      console.error("Error syncing quotes:", error);
      toast.error("Failed to sync quotes");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-48" />
        <div className="grid gap-px bg-border grid-cols-1 sm:grid-cols-3">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const isPositive = (portfolio?.totalReturnPct ?? 0) >= 0;

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <header className="space-y-6 animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
              Portfolio Overview
            </p>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tighter tabular-nums">
              {formatCurrency(portfolio?.totalValueUsd ?? 0, "USD")}
            </h1>
          </div>
          <Button 
            onClick={syncQuotes} 
            disabled={isSyncing}
            variant="outline"
            className="gap-2 self-start sm:self-auto"
          >
            <svg className={cn("w-4 h-4", isSyncing && "animate-spin")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isSyncing ? "Syncing..." : "Sync"}
          </Button>
        </div>
        
        {/* Return Badge */}
        <div className="flex items-center gap-4">
          <div className={cn(
            "inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium tabular-nums rounded-full",
            isPositive ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"
          )}>
            <svg className={cn("w-4 h-4", !isPositive && "rotate-180")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            {formatPercent(portfolio?.totalReturnPct ?? 0)}
          </div>
          <span className={cn(
            "text-sm tabular-nums",
            isPositive ? "text-gain" : "text-loss"
          )}>
            {isPositive ? "+" : ""}{formatCurrency(portfolio?.totalReturnAbs ?? 0, "USD")}
          </span>
        </div>
      </header>

      {/* Metrics Grid - Bento style */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 animate-fade-up stagger-1">
        <div className="bg-secondary/30 rounded-xl p-6 space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Invested</p>
          <p className="text-2xl font-bold tabular-nums">{formatCurrency(portfolio?.totalCostUsd ?? 0, "USD")}</p>
          <p className="text-sm text-muted-foreground tabular-nums">{formatCurrency(portfolio?.totalCostArs ?? 0, "ARS")}</p>
        </div>
        <div className="bg-secondary/30 rounded-xl p-6 space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Current Value</p>
          <p className="text-2xl font-bold tabular-nums">{formatCurrency(portfolio?.totalValueUsd ?? 0, "USD")}</p>
          <p className="text-sm text-muted-foreground tabular-nums">{formatCurrency(portfolio?.totalValueArs ?? 0, "ARS")}</p>
        </div>
        <div className={cn(
          "rounded-xl p-6 space-y-2 relative overflow-hidden",
          isPositive ? "bg-gain/5" : "bg-loss/5"
        )}>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Return</p>
          <p className={cn("text-2xl font-bold tabular-nums", isPositive ? "text-gain" : "text-loss")}>
            {formatPercent(portfolio?.totalReturnPct ?? 0)}
          </p>
          <p className={cn("text-sm tabular-nums", isPositive ? "text-gain" : "text-loss")}>
            {isPositive ? "+" : ""}{formatCurrency(portfolio?.totalReturnAbs ?? 0, "USD")}
          </p>
        </div>
      </div>

      {/* Dollar Rates - Horizontal strip */}
      <div className="animate-fade-up stagger-2">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">USD/ARS</span>
          <span className="flex-1 h-px bg-border" />
        </div>
        <div className="flex flex-wrap gap-6">
          {[
            { label: "Oficial", value: portfolio?.dollarRates?.oficial },
            { label: "MEP", value: portfolio?.dollarRates?.mep },
            { label: "Blue", value: portfolio?.dollarRates?.blue },
          ].map((rate) => (
            <div key={rate.label} className="flex items-baseline gap-2">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">{rate.label}</span>
              <span className="text-lg font-bold tabular-nums">${formatNumber(rate.value ?? 0, 0)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Holdings */}
      <section className="animate-fade-up stagger-3">
        <div className="flex items-center gap-2 mb-6">
          <h2 className="text-xs uppercase tracking-wider text-muted-foreground">Holdings</h2>
          <span className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">{portfolio?.holdings.length ?? 0} positions</span>
        </div>
        
        {portfolio?.holdings.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl">
            <p className="text-muted-foreground mb-2">No holdings yet</p>
            <p className="text-sm text-muted-foreground">Add your first transaction to get started</p>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Header row - desktop */}
            <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
              <div className="col-span-4">Asset</div>
              <div className="col-span-2 text-right">Quantity</div>
              <div className="col-span-2 text-right">Avg Price</div>
              <div className="col-span-2 text-right">Value</div>
              <div className="col-span-2 text-right">Return</div>
            </div>
            
            {portfolio?.holdings.map((holding, index) => {
              const isHoldingPositive = holding.returnPct >= 0;
              
              return (
                <div
                  key={`${holding.ticker}-${holding.type}`}
                  className={cn(
                    "group grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 p-4 hover:bg-secondary/50 transition-colors border-b border-border/50",
                    "animate-fade-up"
                  )}
                  style={{ animationDelay: `${0.3 + index * 0.03}s` }}
                >
                  {/* Asset info */}
                  <div className="sm:col-span-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center font-bold text-xs">
                      {holding.ticker.slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{holding.ticker}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {getTypeLabel(holding.type)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{holding.name}</p>
                    </div>
                  </div>
                  
                  {/* Mobile: Quantity and price inline */}
                  <div className="sm:hidden flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatNumber(holding.quantity, holding.quantity < 1 ? 6 : 2)} @ {formatCurrency(holding.avgPrice, holding.currency)}
                    </span>
                  </div>
                  
                  {/* Desktop: Quantity */}
                  <div className="hidden sm:flex sm:col-span-2 items-center justify-end">
                    <span className="tabular-nums">{formatNumber(holding.quantity, holding.quantity < 1 ? 6 : 2)}</span>
                  </div>
                  
                  {/* Desktop: Avg Price */}
                  <div className="hidden sm:flex sm:col-span-2 items-center justify-end">
                    <span className="tabular-nums text-muted-foreground">{formatCurrency(holding.avgPrice, holding.currency)}</span>
                  </div>
                  
                  {/* Value */}
                  <div className="sm:col-span-2 flex items-center justify-between sm:justify-end">
                    <span className="sm:hidden text-xs text-muted-foreground uppercase tracking-wide">Value</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(holding.valueUsd, "USD")}</span>
                  </div>
                  
                  {/* Return */}
                  <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2">
                    <span className="sm:hidden text-xs text-muted-foreground uppercase tracking-wide">Return</span>
                    <span className={cn(
                      "font-semibold tabular-nums",
                      isHoldingPositive ? "text-gain" : "text-loss"
                    )}>
                      {formatPercent(holding.returnPct)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
