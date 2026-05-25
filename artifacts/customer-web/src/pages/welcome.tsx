import { useState } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Scissors, Search, ArrowRight } from "lucide-react";
import { useGetPublicBusiness } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export default function WelcomePage() {
  const [code, setCode] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const trimmed = code.trim().toLowerCase();
  const { data: business, isLoading, error } = useGetPublicBusiness(
    trimmed,
    { query: { enabled: submitted && !!trimmed, retry: false, queryKey: ["/public/businesses", trimmed] } }
  );

  const handleLookup = () => {
    if (!trimmed) {
      toast({ title: "Digite o código do estabelecimento" });
      return;
    }
    setSubmitted(true);
  };

  if (business && submitted) {
    navigate(`/${trimmed}`);
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Scissors className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Fila Digital</h1>
          <p className="text-muted-foreground">
            Digite o código do estabelecimento para entrar na fila ou agendar um horário
          </p>
        </div>

        <div className="space-y-3">
          <div className="relative">
            <Input
              placeholder="ex: barbearia-central"
              value={code}
              onChange={(e) => { setCode(e.target.value); setSubmitted(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
              className="h-12 pr-12 text-base"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          </div>

          {error && submitted && (
            <p className="text-sm text-destructive text-center">
              Estabelecimento não encontrado. Verifique o código.
            </p>
          )}

          <Button
            onClick={handleLookup}
            disabled={!trimmed || isLoading}
            className="w-full h-12 text-base"
          >
            {isLoading ? "Buscando..." : "Buscar Estabelecimento"}
            <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Ou escaneie o QR code do estabelecimento
        </p>
      </div>
    </div>
  );
}
