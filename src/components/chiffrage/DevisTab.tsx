import { useEffect, useState, useCallback } from "react";
import { Loader2, Package, Users } from "lucide-react";
import { getOrCreateDevis } from "@/lib/queries";
import { FournituresTab } from "./FournituresTab";
import { PrestationTab } from "./PrestationTab";
import { cn } from "@/lib/utils";
import { margeLigne } from "@/lib/types";
import type { DevisLigne } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEur(v: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(v);
}

type SubTab = "fournitures" | "prestation";

// ─── DevisTab ─────────────────────────────────────────────────────────────────

interface DevisTabProps {
  dossierId: number;
}

export function DevisTab({ dossierId }: DevisTabProps) {
  const [devisId, setDevisId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SubTab>("fournitures");

  // Totaux remontés depuis les sous-onglets
  const [fournituresHT, setFournituresHT] = useState(0);
  const [prestationHT, setPrestationHT] = useState(0);

  // Marge articles (calculée à partir des lignes — remontée par FournituresTab)
  const [lignesSnap, setLignesSnap] = useState<DevisLigne[]>([]);

  useEffect(() => {
    setLoading(true);
    getOrCreateDevis(dossierId)
      .then((dv) => setDevisId(dv.id))
      .finally(() => setLoading(false));
  }, [dossierId]);

  const handleFournituresTotal = useCallback(
    (total: number, lignes: DevisLigne[]) => {
      setFournituresHT(total);
      setLignesSnap(lignes);
    },
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-primary/50" />
      </div>
    );
  }

  if (!devisId) return null;

  const totalHT = fournituresHT + prestationHT;

  // Marge articles (pondérée)
  const lignesAvecMarge = lignesSnap.filter(
    (l) => l.prix_achat > 0 && l.prix_unitaire > 0
  );
  const margeArticles =
    lignesAvecMarge.length > 0
      ? lignesAvecMarge.reduce((s, l) => {
          const m = margeLigne(l);
          return s + (m ?? 0);
        }, 0) / lignesAvecMarge.length
      : null;

  return (
    <div className="flex flex-col gap-4 p-6">
      {/* ── Sous-onglets ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("fournitures")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "fournitures"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Package className="h-3.5 w-3.5" />
          Fournitures
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("prestation")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            activeTab === "prestation"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Prestation
        </button>
      </div>

      {/* ── Contenu du sous-onglet actif ─────────────────────────────────── */}
      <div className={activeTab === "fournitures" ? "" : "hidden"}>
        <FournituresTab
          devisId={devisId}
          dossierId={dossierId}
          onTotalChange={handleFournituresTotal}
        />
      </div>
      <div className={activeTab === "prestation" ? "" : "hidden"}>
        <PrestationTab devisId={devisId} onTotalChange={setPrestationHT} />
      </div>

      {/* ── Barre de totaux globaux (toujours visible) ────────────────────── */}
      {(fournituresHT > 0 || prestationHT > 0) && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            {/* Détail */}
            <div className="flex items-center gap-6 text-sm">
              {fournituresHT > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Fournitures HT</p>
                  <p className="font-semibold">{formatEur(fournituresHT)}</p>
                </div>
              )}
              {prestationHT > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Prestation HT</p>
                  <p className="font-semibold">{formatEur(prestationHT)}</p>
                </div>
              )}
              {margeArticles !== null && (
                <div>
                  <p className="text-xs text-muted-foreground">Marge articles</p>
                  <p
                    className={cn(
                      "font-semibold",
                      margeArticles >= 30
                        ? "text-emerald-600 dark:text-emerald-400"
                        : margeArticles >= 15
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-destructive"
                    )}
                  >
                    {margeArticles.toFixed(1)} %
                  </p>
                </div>
              )}
            </div>

            {/* Total global */}
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Global HT</p>
              <p className="text-2xl font-bold">{formatEur(totalHT)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
