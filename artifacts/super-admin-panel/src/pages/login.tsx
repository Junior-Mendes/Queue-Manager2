import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, AlertCircle } from "lucide-react";

interface LoginPageProps {
  onLogin: (user: { id: string; email: string; name: string; role: string }, token: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/admin/login" : "/api/auth/admin/register";
      const body = mode === "login"
        ? { email, password }
        : { email, password, name };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to authenticate");
      }

      onLogin(data.user, data.token);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">SaaS Admin</CardTitle>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "Entre com sua conta" : "Crie sua conta de administrador"}
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@empresa.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="******"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Carregando..." : mode === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            {mode === "login" ? (
              <>
                Ainda não tem conta?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("register"); setError(""); }}
                  className="text-primary hover:underline font-medium"
                >
                  Criar conta
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(""); }}
                  className="text-primary hover:underline font-medium"
                >
                  Entrar
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
