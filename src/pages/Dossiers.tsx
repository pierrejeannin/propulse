import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderOpen,
  Plus,
  Search,
  Calendar,
  Euro,
  ArrowRight,
  Building2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatutBadge } from "@/components/dossiers/StatutBadge";
import { DossierFormDialog } from "@/components/dossiers/DossierFormDialog";
import { getDossiers } from "@/lib/queries";
import { STATUTS, type DossierWithClient, type Statut } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatMontant(v: number | null): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

function relativeDateLabel(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const diff = Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return "En retard";
  if (diff === 0) return "Aujourd'hui";
  if (diff <= 7) return `J-${diff}`;
  return null;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60)
  );
  if (diff < 60) return `Il y a ${diff}min`;
  if (diff < 1440) return `Il y a ${Math.floor(diff / 60)}h`;
  const days = Math.floor(diff / 1440);
  if (days < 30) return `Il y a ${days}j`;
  return formatDate(dateStr);
}

// ─── Carte Dossier ────────────────────────────────────────────────────────────

function DossierCard({ dossier }: { dossier: DossierWithClient }) {
  const navigate = useNavigate();
  const deadline = relativeDateLabel(dossier.date_rendu);
  const isLate = deadline === "En retard";
  return (
    <button
      onClick={() => navigate(`/dossiers/${dossier.id}`)}
      className="group w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/30 hover:bg-card/80 hover:shadow-md hover:shadow-primary/5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground group-hover:text-primary transition-colors">
            {dossier.titre}
          </p>
          {dossier.client_nom ? (
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3 shrink-0" />
              <span className="truncate">{dossier.client_nom}</span>
            </div>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground/50 italic">
              Sans client
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <StatutBadge statut={dossier.statut} size="sm" />
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
        {/* Date rendu */}
        <span
          className={cn(
            "flex items-center gap-1",
            isLate && "font-medium text-destructive",
            deadline === "Aujourd'hui" && "font-medium text-amber-600 dark:text-amber-400"
          )}
        >
          <Calendar className="h-3 w-3 shrink-0" />
          {dossier.date_rendu ? (
            <>
              {formatDate(dossier.date_rendu)}
              {deadline && (
                <span
                  className={cn(
                    "ml-1 rounded px-1 py-0.5 text-[10px] font-semibold",
                    isLate && "bg-destructive/15 text-destructive",
                    !isLate && "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  )}
                >
                  {deadline}
                </span>
              )}
            </>
          ) : (
            "Pas d'échéance"
          )}
        </span>

        {/* Montant */}
        <span className="flex items-center gap-1">
          <Euro className="h-3 w-3 shrink-0" />
          {formatMontant(dossier.montant_estime)}
        </span>

        {/* Activité */}
        <span className="ml-auto flex items-center gap-1 text-muted-foreground/50">
          <Clock className="h-3 w-3 shrink-0" />
          {timeAgo(dossier.updated_at)}
        </span>
      </div>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const ALL = "all" as const;
type Filter = typeof ALL | Statut;

export default function Dossiers() {
  const navigate = useNavigate();

  const [dossiers, setDossiers] = useState<DossierWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<Filter>(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);

  // ── Chargement ────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDossiers();
      setDossiers(data);
    } catch (e) {
      setError("Impossible de charger les dossiers.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ── Debug ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    console.log("[Dossiers] dialogOpen changed →", dialogOpen);
  }, [dialogOpen]);

  // ── Filtrage ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return dossiers.filter((d) => {
      const matchSearch =
        !search ||
        d.titre.toLowerCase().includes(search.toLowerCase()) ||
        (d.client_nom ?? "").toLowerCase().includes(search.toLowerCase());
      const matchStatut = filterStatut === ALL || d.statut === filterStatut;
      return matchSearch && matchStatut;
    });
  }, [dossiers, search, filterStatut]);

  const countByStatut = useMemo(() => {
    return STATUTS.reduce(
      (acc, s) => ({ ...acc, [s]: dossiers.filter((d) => d.statut === s).length }),
      {} as Record<Statut, number>
    );
  }, [dossiers]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSuccess = (id: number) => {
    setDialogOpen(false);
    navigate(`/dossiers/${id}`);
  };

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Dossiers & Opportunités</h1>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => { console.log("[Dossiers] clic Nouveau dossier → setDialogOpen(true)"); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" />
            Nouveau dossier
          </Button>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {dossiers.length} dossier{dossiers.length !== 1 ? "s" : ""} au total
        </p>
      </div>

      {/* ── Barre de recherche + filtres ────────────────────────────────── */}
      <div className="space-y-2 border-b border-border px-6 py-3">
        {/* Recherche */}
        <div className="flex items-center gap-2 rounded-lg border border-input bg-input/30 px-3 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            placeholder="Rechercher par titre ou client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Filtres statut */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
          <button
            onClick={() => setFilterStatut(ALL)}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              filterStatut === ALL
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            Tous ({dossiers.length})
          </button>
          {STATUTS.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatut(s)}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                filterStatut === s
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {s} ({countByStatut[s] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenu ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={load}>
              Réessayer
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            hasFilter={!!search || filterStatut !== ALL}
            onNew={() => setDialogOpen(true)}
            onClear={() => {
              setSearch("");
              setFilterStatut(ALL);
            }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {filtered.map((d) => (
              <DossierCard key={d.id} dossier={d} />
            ))}
          </div>
        )}
      </div>

      {/* ── Dialog ──────────────────────────────────────────────────────── */}
      <DossierFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  hasFilter,
  onNew,
  onClear,
}: {
  hasFilter: boolean;
  onNew: () => void;
  onClear: () => void;
}) {
  if (hasFilter) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <Search className="h-8 w-8 text-muted-foreground/30" />
        <div>
          <p className="font-medium">Aucun résultat</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Aucun dossier ne correspond à votre recherche.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onClear}>
          Effacer les filtres
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="rounded-full bg-primary/10 p-4">
        <FolderOpen className="h-8 w-8 text-primary/60" />
      </div>
      <div>
        <p className="font-medium">Aucun dossier</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Créez votre premier dossier pour commencer à suivre une opportunité.
        </p>
      </div>
      <Button size="sm" className="mt-2 gap-1.5" onClick={onNew}>
        <Plus className="h-4 w-4" />
        Créer un dossier
      </Button>
    </div>
  );
}
