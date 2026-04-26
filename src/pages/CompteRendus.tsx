import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Calendar,
  Building2,
  Search,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { getAllCompteRendus } from "@/lib/queries";
import type { CompteRenduAvecDossier } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string): string {
  // date_rdv est au format "YYYY-MM-DD"
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

/** Supprime les balises HTML et renvoie le texte brut tronqué. */
function preview(html: string | null | undefined, maxChars = 120): string {
  if (!html) return "";
  const text = html
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxChars ? text.slice(0, maxChars) + "…" : text;
}

/** Première section non vide du CR (pour l'aperçu). */
function firstSection(cr: CompteRenduAvecDossier): string {
  const candidates = [
    cr.besoins_exprimes,
    cr.contexte_existant,
    cr.pistes_solution,
    cr.actions_next_steps,
    cr.metriques_cles,
  ];
  for (const c of candidates) {
    const p = preview(c);
    if (p) return p;
  }
  return "";
}

// ─── Carte compte-rendu ───────────────────────────────────────────────────────

function CRCard({
  cr,
  onClick,
}: {
  cr: CompteRenduAvecDossier;
  onClick: () => void;
}) {
  const apercu = firstSection(cr);

  return (
    <button
      onClick={onClick}
      className="group w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/30 hover:bg-accent/40 hover:shadow-sm"
    >
      {/* Ligne 1 : titre + flèche */}
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
          {cr.titre}
        </p>
        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>

      {/* Ligne 2 : dossier + client + date */}
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1 font-medium text-foreground/70">
          <FileText className="h-3 w-3 shrink-0" />
          {cr.dossier_titre}
        </span>

        {cr.client_nom && (
          <>
            <span className="text-muted-foreground/30">·</span>
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3 shrink-0" />
              {cr.client_nom}
            </span>
          </>
        )}

        <span className="text-muted-foreground/30">·</span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3 shrink-0" />
          {formatDate(cr.date_rdv)}
        </span>
      </div>

      {/* Ligne 3 : aperçu contenu */}
      {apercu && (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground/70 line-clamp-2">
          {apercu}
        </p>
      )}
    </button>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function CompteRendus() {
  const navigate = useNavigate();
  const [crs, setCrs] = useState<CompteRenduAvecDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    getAllCompteRendus()
      .then(setCrs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return crs;
    return crs.filter(
      (cr) =>
        cr.titre.toLowerCase().includes(q) ||
        cr.dossier_titre.toLowerCase().includes(q) ||
        (cr.client_nom ?? "").toLowerCase().includes(q)
    );
  }, [crs, search]);

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Comptes-rendus</h1>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Tous les comptes-rendus — cliquez pour ouvrir la fiche dossier
        </p>
      </div>

      {/* ── Compteur ────────────────────────────────────────────────────── */}
      {!loading && crs.length > 0 && (
        <div className="border-b border-border px-6 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-input bg-input/30 px-3 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
              placeholder="Rechercher par titre, dossier ou client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="text-xs text-muted-foreground/50 hover:text-foreground"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Contenu ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary/60" />
          </div>
        ) : crs.length === 0 ? (
          /* ── État vide global ── */
          <div className="flex flex-col items-center gap-3 py-20 text-center px-6">
            <div className="rounded-full bg-primary/10 p-4">
              <FileText className="h-8 w-8 text-primary/40" />
            </div>
            <div>
              <p className="font-medium">Aucun compte-rendu</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Créez-en depuis la fiche d'un dossier, onglet{" "}
                <span className="font-medium text-foreground/70">
                  Comptes-rendus
                </span>
                .
              </p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          /* ── Pas de résultat de recherche ── */
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Search className="h-6 w-6 text-muted-foreground/30" />
            <p className="text-sm font-medium">Aucun résultat</p>
            <p className="text-xs text-muted-foreground">
              Modifiez votre recherche.
            </p>
          </div>
        ) : (
          /* ── Liste des CRs ── */
          <div className="space-y-2.5 p-4">
            {filtered.map((cr) => (
              <CRCard
                key={cr.id}
                cr={cr}
                onClick={() =>
                  navigate(`/dossiers/${cr.dossier_id}`, {
                    state: { tab: "comptes-rendus" },
                  })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
