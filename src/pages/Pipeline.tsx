import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  KanbanSquare,
  Search,
  X,
  Building2,
  Calendar,
  Euro,
  Clock,
  AlertTriangle,
  TrendingUp,
  Target,
  Eye,
  EyeOff,
  Plus,
  Loader2,
} from "lucide-react";
import { getDossiers } from "@/lib/queries";
import { DossierFormDialog } from "@/components/dossiers/DossierFormDialog";
import { STATUTS, STATUT_CONFIG, type DossierWithClient, type Statut } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Constantes ───────────────────────────────────────────────────────────────

const STATUTS_CLOTURES = new Set<Statut>(["Gagné", "Perdu", "Abandonné"]);

// Couleur de la bordure supérieure de chaque colonne, calquée sur le dotColor de StatutBadge
const COLUMN_BORDER: Record<Statut, string> = {
  Découverte:    "border-t-slate-400   dark:border-t-slate-500",
  Qualification: "border-t-blue-500   dark:border-t-blue-400",
  Proposition:   "border-t-amber-500  dark:border-t-amber-400",
  Soutenance:    "border-t-violet-500 dark:border-t-violet-400",
  Gagné:         "border-t-emerald-500 dark:border-t-emerald-400",
  Perdu:         "border-t-red-500    dark:border-t-red-400",
  Abandonné:     "border-t-zinc-400   dark:border-t-zinc-500",
};

const COLUMN_BG: Record<Statut, string> = {
  Découverte:    "bg-slate-50/60   dark:bg-slate-900/20",
  Qualification: "bg-blue-50/40    dark:bg-blue-950/15",
  Proposition:   "bg-amber-50/40   dark:bg-amber-950/15",
  Soutenance:    "bg-violet-50/40  dark:bg-violet-950/15",
  Gagné:         "bg-emerald-50/40 dark:bg-emerald-950/15",
  Perdu:         "bg-red-50/30     dark:bg-red-950/10",
  Abandonné:     "bg-zinc-50/60    dark:bg-zinc-900/20",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function deadlineInfo(dateStr: string | null): {
  label: string | null;
  urgent: boolean;
  late: boolean;
} {
  if (!dateStr) return { label: null, urgent: false, late: false };
  const diff = Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0)  return { label: "En retard", urgent: true,  late: true  };
  if (diff === 0) return { label: "Aujourd'hui", urgent: true, late: false };
  if (diff <= 7)  return { label: `J-${diff}`,  urgent: true,  late: false };
  return { label: null, urgent: false, late: false };
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / (1000 * 60)
  );
  if (diff < 60) return `Il y a ${diff} min`;
  if (diff < 1440) return `Il y a ${Math.floor(diff / 60)} h`;
  const days = Math.floor(diff / 1440);
  if (days < 30) return `Il y a ${days} j`;
  return formatDate(dateStr);
}

// ─── Carte pipeline ───────────────────────────────────────────────────────────

function PipelineCard({ dossier }: { dossier: DossierWithClient }) {
  const navigate = useNavigate();
  const { label: deadlineLabel, urgent, late } = deadlineInfo(dossier.date_rendu);
  const config = STATUT_CONFIG[dossier.statut];

  return (
    <button
      type="button"
      onClick={() => navigate(`/dossiers/${dossier.id}`)}
      className="group w-full rounded-lg border border-border bg-card p-3 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Titre */}
      <p className="truncate text-sm font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
        {dossier.titre}
      </p>

      {/* Client */}
      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <Building2 className="h-3 w-3 shrink-0" />
        <span className="truncate">
          {dossier.client_nom ?? <em className="opacity-50">Sans client</em>}
        </span>
      </div>

      {/* Date de rendu + montant */}
      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
        {/* Date */}
        <span
          className={cn(
            "flex items-center gap-1 text-xs",
            urgent ? (late ? "text-destructive" : "text-amber-600 dark:text-amber-400") : "text-muted-foreground"
          )}
        >
          <Calendar className="h-3 w-3 shrink-0" />
          {dossier.date_rendu ? formatDate(dossier.date_rendu) : "Sans échéance"}
          {deadlineLabel && (
            <span
              className={cn(
                "rounded px-1 py-0.5 text-[10px] font-semibold",
                late
                  ? "bg-destructive/15 text-destructive"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
              )}
            >
              {deadlineLabel}
            </span>
          )}
        </span>

        {/* Montant */}
        {dossier.montant_estime != null && (
          <span className="ml-auto flex items-center gap-0.5 text-xs font-medium text-foreground/70">
            <Euro className="h-3 w-3 text-muted-foreground" />
            {formatMontant(dossier.montant_estime)}
          </span>
        )}
      </div>

      {/* Dernière activité */}
      <div className="mt-1.5 flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium",
            config.className
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", config.dotColor)} />
          {dossier.statut}
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
          <Clock className="h-2.5 w-2.5" />
          {timeAgo(dossier.updated_at)}
        </span>
      </div>
    </button>
  );
}

// ─── Colonne Kanban ───────────────────────────────────────────────────────────

function KanbanColumn({
  statut,
  dossiers,
}: {
  statut: Statut;
  dossiers: DossierWithClient[];
}) {
  const config = STATUT_CONFIG[statut];
  const totalMontant = dossiers.reduce(
    (s, d) => s + (d.montant_estime ?? 0),
    0
  );
  const hasMontant = dossiers.some((d) => d.montant_estime != null);

  return (
    <div
      className={cn(
        "flex w-[272px] shrink-0 flex-col rounded-xl border border-border border-t-2",
        COLUMN_BORDER[statut],
        COLUMN_BG[statut]
      )}
    >
      {/* En-tête colonne */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn("h-2 w-2 shrink-0 rounded-full", config.dotColor)}
          />
          <span className="truncate text-sm font-semibold">{statut}</span>
        </div>
        <span className="ml-2 shrink-0 rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium text-muted-foreground border border-border/50">
          {dossiers.length}
        </span>
      </div>

      <div className="mx-3 h-px bg-border/40" />

      {/* Cartes scrollables */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {dossiers.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-xs text-muted-foreground/40 italic">Aucun dossier</p>
          </div>
        ) : (
          dossiers.map((d) => <PipelineCard key={d.id} dossier={d} />)
        )}
      </div>

      {/* Pied de colonne — total montant */}
      {hasMontant && (
        <>
          <div className="mx-3 h-px bg-border/40" />
          <div className="px-3 py-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Euro className="h-3 w-3" />
                Total estimé
              </span>
              <span className="font-semibold text-foreground/80">
                {formatMontant(totalMontant)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Indicateur KPI ───────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent?: "default" | "warning" | "success";
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <div
        className={cn(
          "rounded-lg p-2",
          accent === "warning" ? "bg-amber-100 dark:bg-amber-900/30" :
          accent === "success" ? "bg-emerald-100 dark:bg-emerald-900/30" :
          "bg-primary/10"
        )}
      >
        <Icon
          className={cn(
            "h-4 w-4",
            accent === "warning" ? "text-amber-600 dark:text-amber-400" :
            accent === "success" ? "text-emerald-600 dark:text-emerald-400" :
            "text-primary"
          )}
        />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={cn(
            "truncate text-lg font-bold leading-tight",
            accent === "warning" && "text-amber-600 dark:text-amber-400"
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Page Pipeline ────────────────────────────────────────────────────────────

export default function Pipeline() {
  const navigate = useNavigate();

  const [dossiers, setDossiers] = useState<DossierWithClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showClotures, setShowClotures] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  // ── Chargement ────────────────────────────────────────────────────────────

  const load = async () => {
    setLoading(true);
    try {
      setDossiers(await getDossiers());
    } catch (e) {
      console.error("Erreur chargement pipeline", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const kpis = useMemo(() => {
    const actifs = dossiers.filter((d) => !STATUTS_CLOTURES.has(d.statut));
    const enCours = actifs.length;
    const montantPipeline = actifs.reduce(
      (s, d) => s + (d.montant_estime ?? 0),
      0
    );
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const enRetard = actifs.filter(
      (d) => d.date_rendu && new Date(d.date_rendu) < today
    ).length;
    return { enCours, montantPipeline, enRetard };
  }, [dossiers]);

  // ── Filtrage ──────────────────────────────────────────────────────────────

  const q = search.trim().toLowerCase();

  const dossiersParStatut = useMemo(() => {
    const visibleStatuts = showClotures
      ? STATUTS
      : STATUTS.filter((s) => !STATUTS_CLOTURES.has(s));

    const result: Record<string, DossierWithClient[]> = {};
    for (const statut of visibleStatuts) {
      result[statut] = dossiers.filter(
        (d) =>
          d.statut === statut &&
          (!q ||
            d.titre.toLowerCase().includes(q) ||
            (d.client_nom ?? "").toLowerCase().includes(q))
      );
    }
    return result;
  }, [dossiers, showClotures, q]);

  const visibleStatuts = useMemo(
    () =>
      (showClotures ? STATUTS : STATUTS.filter((s) => !STATUTS_CLOTURES.has(s))) as Statut[],
    [showClotures]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* ── En-tête ────────────────────────────────────────────────────────── */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KanbanSquare className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Pipeline</h1>
          </div>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau dossier
          </button>
        </div>

        {/* KPIs */}
        <div className="mt-3 grid grid-cols-3 gap-3">
          <KpiCard
            icon={Target}
            label="Dossiers en cours"
            value={kpis.enCours}
            accent="default"
          />
          <KpiCard
            icon={TrendingUp}
            label="Montant pipeline HT"
            value={formatMontant(kpis.montantPipeline)}
            accent="success"
          />
          <KpiCard
            icon={AlertTriangle}
            label="Échéances dépassées"
            value={kpis.enRetard}
            accent={kpis.enRetard > 0 ? "warning" : "default"}
          />
        </div>
      </div>

      {/* ── Barre de filtres ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-2.5">
        {/* Recherche */}
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un dossier ou un client…"
            className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Toggle clôturés */}
        <button
          type="button"
          onClick={() => setShowClotures((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
            showClotures
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border bg-background text-muted-foreground hover:border-border hover:text-foreground"
          )}
        >
          {showClotures ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          {showClotures ? "Masquer les clôturés" : "Afficher Gagné / Perdu / Abandonné"}
        </button>
      </div>

      {/* ── Board Kanban ───────────────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary/50" />
          </div>
        ) : (
          <div className="flex h-full gap-3 overflow-x-auto px-6 py-4 pb-6">
            {visibleStatuts.map((statut) => (
              <KanbanColumn
                key={statut}
                statut={statut}
                dossiers={dossiersParStatut[statut] ?? []}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Dialog nouveau dossier ─────────────────────────────────────────── */}
      <DossierFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={(id) => {
          setDialogOpen(false);
          navigate(`/dossiers/${id}`);
        }}
      />
    </div>
  );
}
