import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border border-border/50 hover:border-border transition-colors duration-300",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-lg font-semibold tracking-tight", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 pb-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 pb-6 pt-0 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

// New distinctive card variants
function MetricCard({ 
  className, 
  label,
  value,
  subValue,
  trend,
  icon,
  ...props 
}: React.ComponentProps<"div"> & {
  label: string;
  value: string;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "group relative p-6 bg-card rounded-xl border border-border/50 hover:border-border transition-all duration-300",
        className
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {label}
          </p>
          <p className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums">
            {value}
          </p>
          {subValue && (
            <p className="text-sm text-muted-foreground tabular-nums">
              {subValue}
            </p>
          )}
        </div>
        {icon && (
          <div className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
            {icon}
          </div>
        )}
      </div>
      {trend && trend !== "neutral" && (
        <div 
          className={cn(
            "absolute top-0 right-0 w-1 h-full rounded-r-xl transition-all duration-300",
            trend === "up" ? "bg-gain" : "bg-loss"
          )}
        />
      )}
    </div>
  )
}

function StatCard({
  className,
  label,
  value,
  change,
  changeLabel,
  ...props
}: React.ComponentProps<"div"> & {
  label: string;
  value: string;
  change?: number;
  changeLabel?: string;
}) {
  const isPositive = change !== undefined && change >= 0;
  
  return (
    <div
      className={cn(
        "p-5 bg-secondary/50 rounded-xl transition-all duration-300 hover:bg-secondary",
        className
      )}
      {...props}
    >
      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </p>
      <p className="text-2xl font-bold tracking-tight tabular-nums mb-1">
        {value}
      </p>
      {change !== undefined && (
        <p className={cn(
          "text-sm font-medium tabular-nums",
          isPositive ? "text-gain" : "text-loss"
        )}>
          {isPositive ? "+" : ""}{change.toFixed(2)}%
          {changeLabel && <span className="text-muted-foreground font-normal ml-1">{changeLabel}</span>}
        </p>
      )}
    </div>
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  MetricCard,
  StatCard,
}
