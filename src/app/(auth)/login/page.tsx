"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });

      if (result?.error) {
        setError("Invalid email or password");
        setIsLoading(false);
      } else if (result?.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-foreground text-background flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center">
              <span className="text-foreground font-bold">IT</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-gain rounded-full" />
          </div>
          <span className="font-semibold text-xl tracking-tight">InvestTracker</span>
        </div>
        
        <div className="space-y-6 max-w-md">
          <h1 className="text-5xl font-bold tracking-tight leading-tight">
            Track your investments with precision
          </h1>
          <p className="text-background/60 text-lg">
            CEDEARs, crypto, and Argentine stocks. All in one place.
          </p>
        </div>
        
        <p className="text-background/40 text-sm">
          Built for Argentine investors
        </p>
      </div>
      
      {/* Right panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="relative">
              <div className="w-10 h-10 bg-foreground rounded-lg flex items-center justify-center">
                <span className="text-background font-bold">IT</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-gain rounded-full" />
            </div>
            <span className="font-semibold text-xl tracking-tight">InvestTracker</span>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Sign in</h2>
            <p className="text-muted-foreground">
              Enter your credentials to access your portfolio
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 border-border bg-transparent focus:border-foreground transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12 border-border bg-transparent focus:border-foreground transition-colors"
                />
              </div>
            </div>
            
            {error && (
              <div className="flex items-center gap-2 text-sm text-loss">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full h-12 text-base" 
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
