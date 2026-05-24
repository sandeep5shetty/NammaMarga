"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, LoaderIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";

const BbmpSignInForm = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Email and password are required!");
      return;
    }

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password");
        } else {
          toast.error(error.message);
        }
        return;
      }

      const meRes = await fetch("/api/me");
      const meJson = await meRes.json();
      const role = meJson.data?.role;

      if (!["AUTHORITY", "ADMIN"].includes(role)) {
        await supabase.auth.signOut();
        toast.error("Access denied. This portal is for BBMP officials only.");
        return;
      }

      router.push("/bbmp");
    } catch {
      toast.error("An error occurred. Please try again");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-y-6 py-8 w-full px-0.5">
      <div>
        <h2 className="text-2xl font-semibold">Sign in to BBMP Console</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Authorized BBMP personnel only. Citizens should use the{" "}
          <Link href="/auth/sign-in" className="text-primary hover:underline">
            citizen portal
          </Link>
          .
        </p>
      </div>

      <form onSubmit={handleSignIn} className="w-full">
        <div className="space-y-2 w-full">
          <Label htmlFor="bbmp-email">Email</Label>
          <Input
            id="bbmp-email"
            type="email"
            value={email}
            disabled={isLoading}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your official email"
            className="w-full focus-visible:border-foreground"
          />
        </div>
        <div className="mt-4 space-y-2">
          <Label htmlFor="bbmp-password">Password</Label>
          <div className="relative w-full">
            <Input
              id="bbmp-password"
              type={showPassword ? "text" : "password"}
              value={password}
              disabled={isLoading}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full focus-visible:border-foreground"
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={isLoading}
              className="absolute top-1 right-1"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <div className="mt-4 w-full">
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <LoaderIcon className="w-5 h-5 animate-spin" />
            ) : (
              "Sign in with email"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default BbmpSignInForm;
