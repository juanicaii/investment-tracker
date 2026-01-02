"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${formatNumber(value)}%`;
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "cedear":
      return "CEDEAR";
    case "arg_stock":
      return "ARG";
    case "stock":
      return "US";
    case "crypto":
      return "Crypto";
    case "stablecoin":
      return "Stable";
    default:
      return type;
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case "cedear":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "arg_stock":
      return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400";
    case "stock":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "crypto":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";
    case "stablecoin":
      return "bg-green-500/10 text-green-600 dark:text-green-400";
    default:
      return "bg-gray-500/10 text-gray-600";
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
        toast.warning(`Synced with ${data.errors.length} errors`, {
          description: data.errors.slice(0, 3).join("\n"),
        });
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const isPositive = (portfolio?.totalReturnPct ?? 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Resumen de tu portfolio
          </p>
        </div>
        <Button 
          onClick={syncQuotes} 
          disabled={isSyncing}
          className="gap-2"
        >
          <svg className={cn("w-4 h-4", isSyncing && "animate-spin")} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isSyncing ? "Sincronizando..." : "Sincronizar"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        {/* Total Invested */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Total Invertido
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-bold">
              {formatCurrency(portfolio?.totalCostUsd ?? 0, "USD")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(portfolio?.totalCostArs ?? 0, "ARS")}
            </p>
          </CardContent>
        </Card>

        {/* Current Value */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Valor Actual
            </CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-bold">
              {formatCurrency(portfolio?.totalValueUsd ?? 0, "USD")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(portfolio?.totalValueArs ?? 0, "ARS")}
            </p>
          </CardContent>
        </Card>

        {/* Total Return */}
        <Card className={cn(
          "relative overflow-hidden",
          isPositive ? "border-green-500/20" : "border-red-500/20"
        )}>
          <div className={cn(
            "absolute top-0 right-0 w-32 h-32 rounded-full -translate-y-1/2 translate-x-1/2",
            isPositive ? "bg-gradient-to-br from-green-500/10 to-transparent" : "bg-gradient-to-br from-red-500/10 to-transparent"
          )} />
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              {isPositive ? (
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              )}
              Rendimiento
            </CardDescription>
            <CardTitle className={cn(
              "text-2xl sm:text-3xl font-bold",
              isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              {formatPercent(portfolio?.totalReturnPct ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-sm font-medium",
              isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              <p>{isPositive ? "+" : ""}{formatCurrency(portfolio?.totalReturnAbs ?? 0, "USD")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dollar Rates - Mobile Friendly */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cotizaciones del Dolar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Oficial</p>
              <p className="text-lg font-bold mt-1">
                ${formatNumber(portfolio?.dollarRates?.oficial ?? 0, 0)}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">MEP</p>
              <p className="text-lg font-bold mt-1">
                ${formatNumber(portfolio?.dollarRates?.mep ?? 0, 0)}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Blue</p>
              <p className="text-lg font-bold mt-1">
                ${formatNumber(portfolio?.dollarRates?.blue ?? 0, 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holdings - Card Layout for Mobile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Holdings
          </CardTitle>
          <CardDescription>
            Tus posiciones actuales
          </CardDescription>
        </CardHeader>
        <CardContent>
          {portfolio?.holdings.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <p className="text-muted-foreground">
                No tenes posiciones todavia.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Agrega tu primera transaccion para comenzar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {portfolio?.holdings.map((holding) => (
                <div
                  key={`${holding.ticker}-${holding.type}`}
                  className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm",
                        getTypeColor(holding.type)
                      )}>
                        {holding.ticker.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{holding.ticker}</span>
                          <Badge variant="outline" className={cn("text-xs", getTypeColor(holding.type))}>
                            {getTypeLabel(holding.type)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-none">
                          {holding.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {formatCurrency(holding.valueUsd, "USD")}
                      </p>
                      <p className={cn(
                        "text-sm font-semibold",
                        holding.returnPct >= 0 
                          ? "text-green-600 dark:text-green-400" 
                          : "text-red-600 dark:text-red-400"
                      )}>
                        {formatPercent(holding.returnPct)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Details row */}
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Cantidad</p>
                      <p className="font-medium text-sm mt-0.5">
                        {formatNumber(holding.quantity, holding.quantity < 1 ? 6 : 2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Precio Prom.</p>
                      <p className="font-medium text-sm mt-0.5">
                        {formatCurrency(holding.avgPrice, holding.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Precio Actual</p>
                      <p className="font-medium text-sm mt-0.5">
                        {formatCurrency(holding.currentPrice, holding.currency)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
