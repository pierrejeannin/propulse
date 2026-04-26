import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2, Search, X, Loader2, Lock, AlertTriangle } from "lucide-react";
import {
  getCatalogueArticles,
  getPrestationLignes,
  createPrestationLigne,
  updatePrestationLigne,
  deletePrestationLigne,
  getDefaultCpArticle,
  getDevisCpPourcentage,
  updateDevisCpPourcentage,
} from "@/lib/queries";
import type { CatalogueArticle, PrestationLigne } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(v);
}

function fmtJours(j: number): string {
  return j % 1 === 0 ? `${j} j` : `${j.toFixed(1)} j`;
}

function parseNum(s: string): number {
  return parseFloat(s.replace(",", ".")) || 0;
}

/** Arrondit au 0.5 le plus proche. */
function roundHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

// ─── Row state ────────────────────────────────────────────────────────────────

interface RowState {
  id: number;
  tache: string;
  description: string;
  profil_label: string;
  article_id: number | null;
  tjm: string;
  jours: string;
  ordre: number;
}

function ligneToRow(l: PrestationLigne): RowState {
  return {
    id: l.id,
    tache: l.tache,
    description: l.description ?? "",
    profil_label: l.profil_label,
    article_id: l.article_id,
    tjm: l.tjm > 0 ? String(l.tjm) : "",
    jours: l.jours > 0 ? String(l.jours) : "1",
    ordre: l.ordre,
  };
}

// ─── InlineProfilCell ─────────────────────────────────────────────────────────

interface InlineProfilCellProps {
  value: string;
  articleId: number | null;
  onChange: (label: string, article: CatalogueArticle | null) => void;
  onBlur: () => void;
}

function InlineProfilCell({ value, onChange, onBlur }: InlineProfilCellProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [articles, setArticles] = useState<CatalogueArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getCatalogueArticles({ search: query.trim() || undefined, type: "Service" })
      .then(setArticles)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [query, open]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function handleSelect(a: CatalogueArticle) {
    setQuery(a.nom);
    onChange(a.nom, a);
    setOpen(false);
    clearTimeout(closeTimer.current);
  }

  return (
    <div ref={containerRef} className="relative min-w-[140px]">
      <div className="flex items-center gap-1">
        <Search className="h-3 w-3 shrink-0 text-muted-foreground/40" />
        <input
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/30"
          placeholder="Profil…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value, null); }}
          onFocus={() => setOpen(true)}
          onBlur={() => { closeTimer.current = setTimeout(() => { setOpen(false); onBlur(); }, 150); }}
        />
        {query && (
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setQuery(""); onChange("", null); }}
            className="shrink-0 text-muted-foreground/40 hover:text-muted-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-0.5 max-h-52 min-w-[200px] overflow-y-auto rounded-md border border-border bg-card shadow-lg"
          onMouseDown={() => clearTimeout(closeTimer.current)}
        >
          {loading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            </div>
          ) : articles.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">Aucun profil trouvé</p>
          ) : (
            articles.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => handleSelect(a)}
                className="flex w-full items-center justify-between border-b border-border/40 px-3 py-2 text-left last:border-0 hover:bg-accent"
              >
                <span className="truncate text-sm">{a.nom}</span>
                {a.prix_vente > 0 && (
                  <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                    {fmt(a.prix_vente)}/j
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── PrestationRowCells ───────────────────────────────────────────────────────

interface PrestationRowProps {
  row: RowState;
  onChange: (patch: Partial<RowState>) => void;
  onSave: () => void;
  onDelete: () => void;
}

function PrestationRowCells({ row, onChange, onSave, onDelete }: PrestationRowProps) {
  const total = parseNum(row.jours) * parseNum(row.tjm);

  return (
    <tr className="group border-b border-border/50 hover:bg-accent/10 transition-colors align-top">
      {/* Tâche */}
      <td className="px-2 py-1.5 w-[180px]">
        <input
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/30 focus:bg-accent/30 rounded px-1 py-0.5"
          placeholder="Tâche…"
          value={row.tache}
          onChange={(e) => onChange({ tache: e.target.value })}
          onBlur={onSave}
        />
      </td>

      {/* Description */}
      <td className="px-2 py-1.5 align-top">
        <textarea
          rows={1}
          className="w-full bg-transparent text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/30 focus:bg-accent/30 rounded px-1 py-0.5 leading-snug"
          style={{ resize: "none", overflow: "hidden" }}
          placeholder="Description…"
          value={row.description}
          onChange={(e) => {
            onChange({ description: e.target.value });
            const el = e.target;
            el.style.height = "auto";
            el.style.height = `${el.scrollHeight}px`;
          }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${el.scrollHeight}px`;
          }}
          onBlur={onSave}
        />
      </td>

      {/* Profil */}
      <td className="px-2 py-1.5 w-[200px]">
        <InlineProfilCell
          value={row.profil_label}
          articleId={row.article_id}
          onChange={(label, article) => {
            const patch: Partial<RowState> = {
              profil_label: label,
              article_id: article?.id ?? null,
            };
            if (article && article.prix_vente > 0 && !parseNum(row.tjm)) {
              patch.tjm = String(article.prix_vente);
            }
            onChange(patch);
          }}
          onBlur={onSave}
        />
      </td>

      {/* Jours */}
      <td className="px-2 py-1.5 w-[80px]">
        <input
          type="number"
          min="0.5"
          step="0.5"
          className="w-full bg-transparent text-right text-sm outline-none placeholder:text-muted-foreground/30 focus:bg-accent/30 rounded px-1 py-0.5"
          placeholder="1"
          value={row.jours}
          onChange={(e) => onChange({ jours: e.target.value })}
          onBlur={onSave}
        />
      </td>

      {/* TJM */}
      <td className="px-2 py-1.5 w-[120px]">
        <div className="flex items-center gap-0.5">
          <input
            type="number"
            min="0"
            step="50"
            className="w-full bg-transparent text-right text-sm outline-none placeholder:text-muted-foreground/30 focus:bg-accent/30 rounded px-1 py-0.5"
            placeholder="0"
            value={row.tjm}
            onChange={(e) => onChange({ tjm: e.target.value })}
            onBlur={onSave}
          />
          <span className="text-xs text-muted-foreground/50 shrink-0">€</span>
        </div>
      </td>

      {/* Total HT */}
      <td className="px-3 py-1.5 text-right w-[120px]">
        <span className={cn("text-sm font-semibold", total > 0 ? "" : "text-muted-foreground/30")}>
          {total > 0 ? fmt(total) : "—"}
        </span>
      </td>

      {/* Actions */}
      <td className="px-2 py-1.5 w-[40px]">
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-1 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 transition-opacity"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}

// ─── CpRow — ligne Pilotage projet calculée ───────────────────────────────────

interface CpRowProps {
  cpArticle: CatalogueArticle;
  cpJours: number;
  cpTotal: number;
  pourcentage: string;
  onPourcentageChange: (v: string) => void;
  onPourcentageBlur: () => void;
}

function CpRow({
  cpArticle,
  cpJours,
  cpTotal,
  pourcentage,
  onPourcentageChange,
  onPourcentageBlur,
}: CpRowProps) {
  return (
    <tr className="border-t-2 border-violet-200 dark:border-violet-800/50 bg-violet-50/60 dark:bg-violet-950/20 align-middle">
      {/* Tâche + % inline */}
      <td className="px-3 py-2 w-[180px]">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Lock className="h-3 w-3 shrink-0 text-violet-400 dark:text-violet-500" />
          <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
            Pilotage projet
          </span>
          <span className="text-violet-400 dark:text-violet-600 text-xs select-none">·</span>
          <div className="flex items-center gap-0.5">
            <input
              type="number"
              min="0"
              max="100"
              step="5"
              value={pourcentage}
              onChange={(e) => onPourcentageChange(e.target.value)}
              onBlur={onPourcentageBlur}
              className="w-9 bg-transparent text-right text-xs font-medium text-violet-600 dark:text-violet-400 outline-none focus:bg-violet-100 dark:focus:bg-violet-900/40 rounded px-0.5"
              title="Pourcentage du total jours"
            />
            <span className="text-xs text-violet-500 dark:text-violet-500">%</span>
          </div>
        </div>
      </td>

      {/* Description */}
      <td className="px-3 py-2 text-sm text-muted-foreground">—</td>

      {/* Profil */}
      <td className="px-3 py-2 w-[200px] text-sm text-muted-foreground">
        {cpArticle.nom}
      </td>

      {/* Jours (calculés, lecture seule) */}
      <td className="px-3 py-2 w-[80px] text-right">
        <span className="text-sm font-medium">{fmtJours(cpJours)}</span>
      </td>

      {/* TJM */}
      <td className="px-3 py-2 w-[120px] text-right text-sm text-muted-foreground">
        {cpArticle.prix_vente > 0 ? `${fmt(cpArticle.prix_vente)} /j` : "—"}
      </td>

      {/* Total */}
      <td className="px-3 py-2 w-[120px] text-right">
        <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">
          {fmt(cpTotal)}
        </span>
      </td>

      {/* Pas d'action */}
      <td className="px-2 py-2 w-[40px]" />
    </tr>
  );
}

// ─── PrestationTab ────────────────────────────────────────────────────────────

interface PrestationTabProps {
  devisId: number;
  onTotalChange: (total: number) => void;
}

export function PrestationTab({ devisId, onTotalChange }: PrestationTabProps) {
  const [rows, setRows] = useState<RowState[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // CP state
  const [cpArticle, setCpArticle] = useState<CatalogueArticle | null>(null);
  const [cpPourcentage, setCpPourcentage] = useState("20");

  const load = useCallback(async () => {
    const [lignes, cp, pct] = await Promise.all([
      getPrestationLignes(devisId),
      getDefaultCpArticle(),
      getDevisCpPourcentage(devisId),
    ]);
    setRows(lignes.map(ligneToRow));
    setCpArticle(cp);
    setCpPourcentage(String(pct));
  }, [devisId]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  // ── CP calculs ────────────────────────────────────────────────────────────

  const totalJoursPrestation = rows.reduce((s, r) => s + parseNum(r.jours), 0);
  const showCpLine = totalJoursPrestation > 2 && cpArticle !== null;
  const showCpWarning = totalJoursPrestation > 2 && cpArticle === null;

  const cpJours = showCpLine
    ? roundHalf(totalJoursPrestation * (parseNum(cpPourcentage) / 100))
    : 0;
  const cpTjm = cpArticle?.prix_vente ?? 0;
  const cpTotal = cpJours * cpTjm;

  async function saveCpPourcentage() {
    const pct = parseNum(cpPourcentage);
    if (pct >= 0) {
      await updateDevisCpPourcentage(devisId, pct);
    }
  }

  // ── Notifier le parent du total (prestation + CP) ─────────────────────────

  useEffect(() => {
    const prestTotal = rows.reduce(
      (s, r) => s + parseNum(r.jours) * parseNum(r.tjm),
      0
    );
    onTotalChange(prestTotal + (showCpLine ? cpTotal : 0));
  }, [rows, showCpLine, cpTotal, onTotalChange]);

  // ── Mutation helpers ──────────────────────────────────────────────────────

  function patchRow(id: number, patch: Partial<RowState>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function saveRow(id: number) {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    try {
      await updatePrestationLigne(id, {
        tache: row.tache,
        description: row.description || null,
        profil_label: row.profil_label,
        article_id: row.article_id,
        tjm: parseNum(row.tjm),
        jours: parseNum(row.jours) || 1,
      });
    } catch (err) {
      console.error("Erreur sauvegarde ligne prestation", err);
    }
  }

  async function handleAdd() {
    setAdding(true);
    try {
      const id = await createPrestationLigne({
        devis_id: devisId,
        tache: "",
        description: null,
        profil_label: "",
        article_id: null,
        tjm: 0,
        jours: 1,
        ordre: rows.length,
      });
      setRows((prev) => [
        ...prev,
        { id, tache: "", description: "", profil_label: "", article_id: null, tjm: "", jours: "1", ordre: prev.length },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: number) {
    const row = rows.find((r) => r.id === id);
    const label = row?.tache || row?.profil_label || "cette ligne";
    if (!window.confirm(`Supprimer « ${label} » ?`)) return;
    await deletePrestationLigne(id);
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  // ── Synthèse par profil (lignes + CP) ────────────────────────────────────

  const profilMap = new Map<string, { jours: number; total: number }>();
  for (const r of rows) {
    if (!r.profil_label) continue;
    const j = parseNum(r.jours);
    const t = j * parseNum(r.tjm);
    const ex = profilMap.get(r.profil_label);
    if (ex) { ex.jours += j; ex.total += t; }
    else profilMap.set(r.profil_label, { jours: j, total: t });
  }
  // Ajouter la ligne CP dans la synthèse
  if (showCpLine && cpArticle) {
    const cpLabel = cpArticle.nom;
    const ex = profilMap.get(cpLabel);
    if (ex) { ex.jours += cpJours; ex.total += cpTotal; }
    else profilMap.set(cpLabel, { jours: cpJours, total: cpTotal });
  }

  const profilTotaux = Array.from(profilMap.entries()).sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const totalJours = totalJoursPrestation + (showCpLine ? cpJours : 0);
  const totalEur =
    rows.reduce((s, r) => s + parseNum(r.jours) * parseNum(r.tjm), 0) +
    (showCpLine ? cpTotal : 0);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-4 w-4 animate-spin text-primary/50" />
      </div>
    );
  }

  const hasTableContent = rows.length > 0 || showCpLine;

  return (
    <div className="space-y-4">
      {/* Avertissement si CP non configuré */}
      {showCpWarning && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/30 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Configurer un profil Chef de projet par défaut dans le catalogue pour activer la ligne de pilotage automatique.
        </div>
      )}

      {/* Tableau inline */}
      {!hasTableContent ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-sm font-medium">Aucune ligne de prestation</p>
          <p className="text-xs text-muted-foreground">
            Ajoutez des lignes pour chiffrer la charge de travail.
          </p>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-50"
          >
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Ajouter une ligne
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-[180px]">Tâche</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Description</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-[200px]">Profil</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-[80px]">Jours</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-[120px]">TJM</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground w-[120px]">Total HT</th>
                <th className="w-[40px] px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <PrestationRowCells
                  key={row.id}
                  row={row}
                  onChange={(patch) => patchRow(row.id, patch)}
                  onSave={() => saveRow(row.id)}
                  onDelete={() => handleDelete(row.id)}
                />
              ))}

              {/* Ligne CP automatique */}
              {showCpLine && cpArticle && (
                <CpRow
                  cpArticle={cpArticle}
                  cpJours={cpJours}
                  cpTotal={cpTotal}
                  pourcentage={cpPourcentage}
                  onPourcentageChange={setCpPourcentage}
                  onPourcentageBlur={saveCpPourcentage}
                />
              )}
            </tbody>
          </table>

          {/* Footer : + Ajouter */}
          <div className="border-t border-border/50 px-3 py-2">
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              Ajouter une ligne
            </button>
          </div>
        </div>
      )}

      {/* Synthèse par profil */}
      {profilTotaux.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="border-b border-border/50 bg-muted/20 px-4 py-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Synthèse par profil
            </span>
          </div>
          <table className="w-full">
            <tbody>
              {profilTotaux.map(([label, { jours, total }]) => (
                <tr key={label} className="border-b border-border/30 last:border-0">
                  <td className="px-4 py-2 text-sm">{label}</td>
                  <td className="px-4 py-2 text-right text-sm text-muted-foreground">
                    {fmtJours(jours)}
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-medium">
                    {fmt(total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-muted/20">
                <td className="px-4 py-2 text-sm font-semibold">Total prestation</td>
                <td className="px-4 py-2 text-right text-sm font-semibold text-muted-foreground">
                  {fmtJours(totalJours)}
                </td>
                <td className="px-4 py-2 text-right text-sm font-bold">
                  {fmt(totalEur)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
