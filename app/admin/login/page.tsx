"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoText } from "@/components/logo-text";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function login(formData: FormData) {
    setError("");
    startTransition(async () => {
      const result = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false
      });
      if (result?.error) {
        setError("Invalid admin credentials.");
        return;
      }
      router.push("/admin");
      router.refresh();
    });
  }

  return (
    <main className="grid min-h-[calc(100vh-4rem)] place-items-center px-4">
      <form action={login} className="glass w-full max-w-md p-6">
        <div className="mb-5">
          <LogoText className="text-4xl" />
        </div>
        <p className="text-sm font-black uppercase text-splatt-pink">Admin</p>
        <h1 className="font-space text-4xl font-black">Login</h1>
        <div className="mt-6 grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <Button type="submit" disabled={isPending}>{isPending ? "Checking..." : "Sign in"}</Button>
        </div>
      </form>
    </main>
  );
}
