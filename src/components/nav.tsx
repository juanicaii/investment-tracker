"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Home" },
  { href: "/transactions", label: "Transactions", shortLabel: "Txns" },
  { href: "/assets", label: "Assets", shortLabel: "Assets" },
  { href: "/chat", label: "AI Advisor", shortLabel: "AI" },
];

export function Nav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
              <span className="text-background font-bold text-sm">IT</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-gain rounded-full" />
          </div>
          <span className="font-semibold tracking-tight hidden sm:block group-hover:opacity-70 transition-opacity">
            InvestTracker
          </span>
        </Link>

        {/* Desktop Nav - Minimal underline style */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative py-1 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
              {pathname === item.href && (
                <span className="absolute bottom-0 left-0 w-full h-px bg-foreground" />
              )}
            </Link>
          ))}
        </nav>

        {/* Desktop Account */}
        <div className="hidden md:flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 px-2">
                <div className="w-7 h-7 rounded-full border border-border flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Menu */}
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="relative">
              <div className="flex flex-col gap-1.5 w-5">
                <span className={cn(
                  "block h-px bg-foreground transition-all duration-300",
                  isOpen && "rotate-45 translate-y-[5px]"
                )} />
                <span className={cn(
                  "block h-px bg-foreground transition-all duration-300",
                  isOpen && "opacity-0"
                )} />
                <span className={cn(
                  "block h-px bg-foreground transition-all duration-300",
                  isOpen && "-rotate-45 -translate-y-[5px]"
                )} />
              </div>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full max-w-sm">
            <SheetHeader className="text-left border-b border-border pb-6">
              <SheetTitle className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 bg-foreground rounded-lg flex items-center justify-center">
                    <span className="text-background font-bold text-sm">IT</span>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-gain rounded-full" />
                </div>
                InvestTracker
              </SheetTitle>
            </SheetHeader>
            
            <nav className="flex flex-col mt-8">
              {navItems.map((item, index) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center justify-between py-4 border-b border-border text-lg font-medium transition-all animate-slide-in",
                    pathname === item.href
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:pl-2"
                  )}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {item.label}
                  {pathname === item.href && (
                    <span className="w-2 h-2 bg-foreground rounded-full" />
                  )}
                </Link>
              ))}
            </nav>
            
            <div className="absolute bottom-8 left-6 right-6">
              <Button
                variant="outline"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
