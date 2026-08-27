"use client";

import { FormEvent, useState } from "react";
import { useMutation } from "convex/react";
import { AlertCircle, ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ADMIN_KEY = "queries-war-admin-token";

export default function AdminLoginPage() {
  const login = useMutation(api.admin.login);
  const [adminId, setAdminId] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [isSessionExpired] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("expired") === "1";
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(undefined);
    try {
      const token = await login({ adminId, password });
      localStorage.setItem(ADMIN_KEY, token);
      location.assign("/admin");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck />
          </div>
          <CardTitle className="font-heading text-2xl">Admin control room</CardTitle>
          <CardDescription>Sign in to manage and monitor SQL contests.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSessionExpired && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="size-4 shrink-0" />
              <span>Your previous admin session has expired. Please sign in again.</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            <label className="grid gap-2 text-sm font-medium">
              Admin ID
              <input
                required
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                className="h-10 rounded-md border bg-background px-3 font-normal"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Password
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-10 rounded-md border bg-background px-3 font-normal"
              />
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" disabled={loading}>
              {loading ? <LoaderCircle className="animate-spin" /> : <ArrowRight />} Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
