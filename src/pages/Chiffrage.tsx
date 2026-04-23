import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calculator, Search, Building2, ArrowRight } from "lucide-react";
import { getAllDevisAvecTotal } from "@/lib/queries";
import type { DevisAvecTotal } from "@/lib/types";
import { StatutBadge } from "@/components/dossiers/StatutBadge";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEur(v: number): string {
  if (v === 0) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

function formatDatetime(d: string): string {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Chiffrage() {
  const navigate = useNavigate();
  const [devis, setDevis] = useState<DevisAvecTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    getAllDevisAvecTotal()
      .then(setDevis)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return devis;
    return devis.filter(
      (d) =>
        d.dossier_titre.toLowerCase().includes(q) ||
        (d.client_nom ?? "").toLowerCase().includes(q)
    );
  }, [devis, search]);

  // Stats globales
  const totalGlobal = devis.reduce((s, d) => s + d.total_ht, 0);
  const devisAvecMarge = devis.filter((d) => d.marge_globale !== null);
  const margeMoyenne =
    devisAvecMarge.length > 0
      ? devisAvecMarge.reduce((s, d) => s + (d.marge_globale ?? 0), 0) /
        devisAvecMarge.length
      : null;

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Chiffrage</h1>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Vue transversale de tous les devis — cliquez pour ouvrir la fiche dossier
        </p>
      </div>

      {/* ── Stats globales ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 border-b border-border px-6 py-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Devis actifs</p>
          <p className="mt-0.5 text-2xl font-bold">{devis.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Total pipeline HT</p>
          <p className="mt-0.5 text-2xl font-bold">
            {new Intl.NumberFormat("fr-FR", {
              style: "currency",
              currency: "EUR",
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(totalGlobal)}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs text-muted-foreground">Marge moyenne</p>
          <p
            className={cn(
              "mt-0.5 text-2xl font-bold",
              margeMoyenne === null
                ? "text-muted-foreground"
                : margeMoyenne >= 30
                ? "text-emerald-600 dark:text-emerald-400"
                : margeMoyenne >= 15
                ? "text-amber-600 dark:text-amber-400"
                : "text-destructive"
            )}
          >
            {margeMoyenne !== null ? `${margeMoyenne.toFixed(1)} %` : "—"}
          </p>
        </div>
      </div>

      {/* ── Recherche ───────────────────────────────────────────────────── */}
      <div className="border-b border-border px-6 py-3">
        <div className="flex items-center gap-2 rounded-lg border border-input bg-input/30 px-3 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            placeholder="Rechercher par dossier ou client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ── Liste ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Calculator className="h-8 w-8 text-muted-foreground/30" />
            <div>
              <p className="text-sm font-medium">
                {devis.length === 0
                  ? "Aucun devis"
                  : "Aucun résultat"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {devis.length === 0
                  ? "Les devis apparaissent ici dès que vous ouvrez l'onglet Chiffrage d'un dossier."
                  : "Modifiez votre recherche."}
              </p>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 border-b border-border bg-background/95 backdrop-blur">
              <tr>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Dossier
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Client
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                  Statut
                </th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                  Total HT
                </th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                  Marge
                </th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                  Mis à jour
                </th>
                <th className="w-10 px-5 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  className="group cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() =>
                    navigate(`/dossiers/${d.dossier_id}`, {
                      state: { tab: "chiffrage" },
                    })
                  }
                >
                  <td className="px-5 py-3 font-medium group-hover:text-primary transition-colors">
                    {d.dossier_titre}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">
                    {d.client_nom ? (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        {d.client_nom}
                      </span>
                    ) : (
                      <span className="italic text-muted-foreground/40 text-xs">
                        Sans client
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <StatutBadge statut={d.dossier_statut} size="sm" />
                  </td>
                  <td className="px-5 py-3 text-right font-semibold">
                    {formatEur(d.total_ht)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {d.marge_globale !== null ? (
                      <span
                        className={cn(
                          "font-medium",
                          d.marge_globale >= 30
                            ? "text-emerald-600 dark:text-emerald-400"
                            : d.marge_globale >= 15
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-destructive"
                        )}
                      >
                        {d.marge_globale.toFixed(1)} %
                      </span>
                    ) : (
                      <span className="text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right text-muted-foreground">
                    {formatDatetime(d.updated_at)}
                  </td>
                  <td className="px-5 py-3">
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
