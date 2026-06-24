"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type ViewState = "login" | "signup" | "admin";

export function LoginForm() {
  const router = useRouter();
  const [view, setView] = useState<ViewState>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Signup state
  const [licenseKey, setLicenseKey] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Admin state
  const [adminPassword, setAdminPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (data.success) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error);
      }
    } catch {
      setError("An error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (signupPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          licenseKey,
          username: signupUsername,
          password: signupPassword,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Account created successfully!");
        // Auto login
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: signupUsername, password: signupPassword }),
        });
        const loginData = await loginRes.json();
        
        if (loginData.success) {
          router.push("/settings");
          router.refresh();
        } else {
          setView("login");
          setUsername(signupUsername);
        }
      } else {
        setError(data.error);
      }
    } catch {
      setError("An error occurred during signup.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });
      const data = await res.json();

      if (data.success) {
        router.push("/admin");
        router.refresh();
      } else {
        setError(data.error);
      }
    } catch {
      setError("An error occurred during admin login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4 relative">
      {/* Hidden Admin Dot */}
      <div 
        className="fixed bottom-4 left-4 w-1.5 h-1.5 rounded-full bg-foreground opacity-20 cursor-default"
        onClick={() => setView("admin")}
        title="Admin Access"
      />

      <Card className="w-full max-w-[400px] shadow-lg">
        {view === "login" && (
          <>
            <CardHeader className="text-center pb-6">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" />
                  <path d="M13 5v2" />
                  <path d="M13 17v2" />
                  <path d="M13 11v2" />
                </svg>
              </div>
              <CardTitle className="text-2xl font-bold">Billing System</CardTitle>
              <CardDescription>Invoice Manager</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input 
                    id="username" 
                    placeholder="Enter your username" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                </div>
                {error && <p className="text-sm text-destructive font-medium">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </form>

              <div className="mt-6 flex items-center justify-center">
                <Separator className="flex-1" />
                <span className="mx-2 text-xs text-muted-foreground uppercase">or</span>
                <Separator className="flex-1" />
              </div>

              <div className="mt-6 space-y-3 text-center">
                <button 
                  onClick={() => setView("signup")}
                  className="text-sm font-medium hover:underline text-primary"
                >
                  Have a license key? Sign up →
                </button>
                <div className="pt-2 flex flex-col gap-2 text-sm text-muted-foreground">
                  <a 
                    href="https://api.whatsapp.com/send?phone=919422880355&text=Hi,%20I%20forgot%20my%20billing%20system%20password."
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    Forgot password? Contact admin →
                  </a>
                  <a 
                    href="https://api.whatsapp.com/send?phone=919422880355&text=Hi,%20I%20would%20like%20to%20get%20a%20license%20key%20for%20the%20billing%20system."
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-colors"
                  >
                    Don&apos;t have a license? Get one →
                  </a>
                </div>
              </div>
            </CardContent>
          </>
        )}

        {view === "signup" && (
          <>
            <CardHeader>
              <CardTitle>Create Account</CardTitle>
              <CardDescription>Enter your license key to register.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="licenseKey">License Key</Label>
                  <Input 
                    id="licenseKey" 
                    placeholder="LIC-XXXX-XXXX-XXXX" 
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signupUsername">Username</Label>
                  <Input 
                    id="signupUsername" 
                    placeholder="3-30 chars, letters/numbers/_" 
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signupPassword">Password</Label>
                  <Input 
                    id="signupPassword" 
                    type="password" 
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required 
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required 
                    minLength={6}
                  />
                </div>
                {error && <p className="text-sm text-destructive font-medium">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button 
                  onClick={() => { setView("login"); setError(""); }}
                  className="text-sm font-medium hover:underline text-muted-foreground hover:text-foreground"
                >
                  ← Back to Login
                </button>
              </div>
            </CardContent>
          </>
        )}

        {view === "admin" && (
          <>
            <CardHeader>
              <CardTitle>Admin Access</CardTitle>
              <CardDescription>Enter admin password to continue.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Password</Label>
                  <Input 
                    id="adminPassword" 
                    type="password" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    required 
                  />
                </div>
                {error && <p className="text-sm text-destructive font-medium">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Verifying..." : "Enter"}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <button 
                  onClick={() => { setView("login"); setError(""); }}
                  className="text-sm font-medium hover:underline text-muted-foreground hover:text-foreground"
                >
                  ← Back to Login
                </button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
