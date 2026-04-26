import { useEffect, useMemo, useRef, useState } from "react";
import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  Settings2,
  Download,
  Upload,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArticleFormDialog } from "@/components/catalogue/ArticleFormDialog";
import { FamillesPanel } from "@/components/catalogue/FamillesPanel";
import { save as saveDialog, open as openDialog } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile } from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";
import {
  getCatalogueArticles,
  getCatalogueFamilles,
  deleteCatalogueArticle,
  deleteAllCatalogueArticles,
  createCatalogueFamille,
  createCatalogueArticle,
} from "@/lib/queries";
import {
  ARTICLE_TYPES,
  type ArticleType,
  type CatalogueArticle,
  type CatalogueFamille,
} from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Helpers affichage ────────────────────────────────────────────────────────

function formatPrix(v: number): string {
  if (v === 0) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(v);
}

function typeBadge(t: ArticleType) {
  const map: Record<ArticleType, string> = {
    Licence:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
    Matériel:
      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30",
    Service:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        map[t]
      )}
    >
      {t}
    </span>
  );
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function splitCSVLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let current = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === sep && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(raw: string): { headers: string[]; rows: string[][] } {
  const text = raw.startsWith("﻿") ? raw.slice(1) : raw;
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };
  const firstLine = lines[0];
  const sep = firstLine.split(";").length > firstLine.split(",").length ? ";" : ",";
  const headers = splitCSVLine(firstLine, sep).map((h) => h.toLowerCase());
  const rows = lines.slice(1).map((l) => splitCSVLine(l, sep));
  return { headers, rows };
}

function quoteField(v: string): string {
  const s = String(v ?? "");
  if (s.includes('"') || s.includes(";") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// ─── Import types ─────────────────────────────────────────────────────────────

interface ParsedArticle {
  reference: string;
  nom: string;
  type: ArticleType;
  famille: string;
  prix_achat: number;
  prix_vente: number;
  description: string;
}

interface ImportPreview {
  articles: ParsedArticle[];
  newFamilles: string[];
  invalidRows: number;
}

interface ImportReport {
  articlesCreated: number;
  famillesCreated: number;
  errors: number;
}

type ImportMode = "ajouter" | "remplacer";

// ─── Page ─────────────────────────────────────────────────────────────────────

const ALL = "Tous" as const;
type TypeFilter = typeof ALL | ArticleType;

export default function Catalogue() {
  const [articles, setArticles] = useState<CatalogueArticle[]>([]);
  const [familles, setFamilles] = useState<CatalogueFamille[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(ALL);
  const [familleFilter, setFamilleFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editArticle, setEditArticle] = useState<CatalogueArticle | null>(null);
  const [famillesOpen, setFamillesOpen] = useState(false);

  // ── CSV Export / Import ──────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("ajouter");
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const importModalRef = useRef<HTMLDivElement>(null);

  // ── Chargement ────────────────────────────────────────────────────────────

  const reload = async () => {
    setLoading(true);
    try {
      const [arts, fams] = await Promise.all([
        getCatalogueArticles(),
        getCatalogueFamilles(),
      ]);
      setArticles(arts);
      setFamilles(fams);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    return articles.filter((a) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        a.nom.toLowerCase().includes(q) ||
        (a.reference ?? "").toLowerCase().includes(q) ||
        (a.famille_nom ?? "").toLowerCase().includes(q);
      const matchType = typeFilter === ALL || a.type === typeFilter;
      const matchFamille =
        familleFilter === "all"
          ? true
          : familleFilter === "none"
          ? a.famille_id === null
          : String(a.famille_id) === familleFilter;
      return matchSearch && matchType && matchFamille;
    });
  }, [articles, search, typeFilter, familleFilter]);

  // ── Suppression article ───────────────────────────────────────────────────

  async function handleDelete(a: CatalogueArticle) {
    if (
      !window.confirm(
        `Supprimer l'article « ${a.nom} » ?\n\nLes lignes de devis utilisant cet article seront conservées.`
      )
    )
      return;
    try {
      await deleteCatalogueArticle(a.id);
      await reload();
    } catch (e) {
      console.error(e);
    }
  }

  // ── Export CSV ────────────────────────────────────────────────────────────

  async function handleExport() {
    if (articles.length === 0) return;
    setExporting(true);
    try {
      const sep = ";";
      const header = ["reference", "nom", "type", "famille", "prix_achat", "prix_vente", "description"];
      const rows = articles.map((a) =>
        [
          a.reference ?? "",
          a.nom,
          a.type,
          a.famille_nom ?? "",
          String(a.prix_achat),
          String(a.prix_vente),
          a.description ?? "",
        ]
          .map(quoteField)
          .join(sep)
      );
      const csv = [header.join(sep), ...rows].join("\n");

      const date = new Date().toISOString().split("T")[0];
      const savePath = await saveDialog({
        defaultPath: `Propulse_Catalogue_${date}.csv`,
        filters: [{ name: "CSV", extensions: ["csv"] }],
      });
      if (!savePath) return;

      // UTF-8 with BOM for Excel compatibility
      const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
      const body = new TextEncoder().encode(csv);
      const out = new Uint8Array(bom.length + body.length);
      out.set(bom);
      out.set(body, bom.length);

      await writeFile(savePath, out);
      await openPath(savePath);
    } catch (e) {
      console.error("[Catalogue] Erreur export CSV:", e);
    } finally {
      setExporting(false);
    }
  }

  // ── Import CSV ────────────────────────────────────────────────────────────

  async function handleImportPick() {
    const filePath = await openDialog({
      multiple: false,
      directory: false,
      filters: [{ name: "CSV", extensions: ["csv", "txt"] }],
    });
    if (!filePath || typeof filePath !== "string") return;

    try {
      const bytes = await readFile(filePath);
      const text = new TextDecoder("utf-8").decode(bytes);
      const { headers, rows } = parseCSV(text);

      const idx = (name: string) =>
        headers.findIndex((h) => h === name || h === name.replace("_", " "));
      const iRef = idx("reference");
      const iNom = Math.max(idx("nom"), idx("designation"), idx("désignation"));
      const iType = idx("type");
      const iFam = idx("famille");
      const iPa = idx("prix_achat");
      const iPv = idx("prix_vente");
      const iDesc = Math.max(idx("description"), idx("desc"));

      if (iNom === -1) {
        window.alert(
          "Colonne « nom » introuvable dans le fichier CSV.\n\nColonnes attendues : reference, nom, type, famille, prix_achat, prix_vente, description"
        );
        return;
      }

      const parsed: ParsedArticle[] = [];
      let invalidRows = 0;
      const famillesVues = new Set<string>();

      for (const row of rows) {
        const nom = row[iNom] ?? "";
        if (!nom.trim()) { invalidRows++; continue; }

        const rawType = (row[iType] ?? "").trim();
        const type: ArticleType = (ARTICLE_TYPES as readonly string[]).includes(rawType)
          ? (rawType as ArticleType)
          : "Service";

        const famille = iFam >= 0 ? (row[iFam] ?? "").trim() : "";
        if (famille) famillesVues.add(famille);

        const prix_achat = iPa >= 0 ? parseFloat((row[iPa] ?? "0").replace(",", ".")) || 0 : 0;
        const prix_vente = iPv >= 0 ? parseFloat((row[iPv] ?? "0").replace(",", ".")) || 0 : 0;

        parsed.push({
          reference: iRef >= 0 ? (row[iRef] ?? "").trim() : "",
          nom: nom.trim(),
          type,
          famille,
          prix_achat,
          prix_vente,
          description: iDesc >= 0 ? (row[iDesc] ?? "").trim() : "",
        });
      }

      const existingFamilleNames = new Set(familles.map((f) => f.nom));
      const newFamilles = [...famillesVues].filter((f) => !existingFamilleNames.has(f));

      setImportPreview({ articles: parsed, newFamilles, invalidRows });
      setImportMode("ajouter");
      setImportReport(null);
    } catch (e) {
      console.error("[Catalogue] Erreur lecture CSV:", e);
      window.alert("Impossible de lire le fichier CSV. Vérifiez le format du fichier.");
    }
  }

  async function doImport() {
    if (!importPreview) return;
    setImporting(true);
    let articlesCreated = 0;
    let famillesCreated = 0;
    let errors = 0;

    try {
      // Reload familles fraîches pour avoir les IDs à jour
      const currentFamilles = await getCatalogueFamilles();
      const familleMap = new Map<string, number>(
        currentFamilles.map((f) => [f.nom, f.id])
      );

      // Créer les familles manquantes
      for (const nom of importPreview.newFamilles) {
        if (!familleMap.has(nom)) {
          try {
            const id = await createCatalogueFamille(nom);
            familleMap.set(nom, id);
            famillesCreated++;
          } catch (e) {
            console.error("[Catalogue] Erreur création famille:", nom, e);
          }
        }
      }

      // Si mode Remplacer, vider le catalogue
      if (importMode === "remplacer") {
        await deleteAllCatalogueArticles();
      }

      // Créer les articles
      for (const a of importPreview.articles) {
        try {
          await createCatalogueArticle({
            nom: a.nom,
            reference: a.reference || null,
            description: a.description || null,
            type: a.type,
            famille_id: a.famille ? (familleMap.get(a.famille) ?? null) : null,
            prix_achat: a.prix_achat,
            prix_vente: a.prix_vente,
          });
          articlesCreated++;
        } catch (e) {
          console.error("[Catalogue] Erreur création article:", a.nom, e);
          errors++;
        }
      }

      setImportReport({ articlesCreated, famillesCreated, errors });
      await reload();
    } catch (e) {
      console.error("[Catalogue] Erreur import:", e);
    } finally {
      setImporting(false);
    }
  }

  function closeImportModal() {
    setImportPreview(null);
    setImportReport(null);
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Catalogue articles</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Import CSV */}
            <button
              type="button"
              onClick={handleImportPick}
              className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent hover:text-foreground"
              title="Importer depuis un fichier CSV"
            >
              <Upload className="h-3.5 w-3.5" />
              Importer CSV
            </button>

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || articles.length === 0}
              className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent hover:text-foreground disabled:opacity-40"
              title="Exporter le catalogue en CSV"
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Exporter CSV
            </button>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => setFamillesOpen(true)}
            >
              <Settings2 className="h-3.5 w-3.5" />
              Familles
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setEditArticle(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nouvel article
            </Button>
          </div>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {articles.length} article{articles.length !== 1 ? "s" : ""} au total
        </p>
      </div>

      {/* ── Filtres ─────────────────────────────────────────────────────── */}
      <div className="space-y-2 border-b border-border px-6 py-3">
        {/* Recherche */}
        <div className="flex items-center gap-2 rounded-lg border border-input bg-input/30 px-3 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            placeholder="Rechercher par désignation, référence ou famille..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Type + Famille */}
        <div className="flex items-center gap-3">
          {/* Type pills */}
          <div className="flex items-center gap-1">
            {([ALL, ...ARTICLE_TYPES] as TypeFilter[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  typeFilter === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          <span className="text-border">|</span>

          {/* Famille select */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="shrink-0">Famille :</span>
            <select
              value={familleFilter}
              onChange={(e) => setFamilleFilter(e.target.value)}
              className="rounded border border-input bg-transparent px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">Toutes</option>
              <option value="none">Sans famille</option>
              {familles.map((f) => (
                <option key={f.id} value={String(f.id)}>
                  {f.nom}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Contenu ─────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Package className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {search || typeFilter !== ALL || familleFilter !== "all"
                  ? "Aucun article ne correspond à votre recherche."
                  : "Aucun article dans le catalogue."}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                    Référence
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                    Désignation
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                    Type
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                    Famille
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">
                    PU vente HT
                  </th>
                  <th className="w-20 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    className="group transition-colors hover:bg-accent/30"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {a.reference || "—"}
                    </td>
                    <td className="px-4 py-3 font-medium">{a.nom}</td>
                    <td className="px-4 py-3">{typeBadge(a.type)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {a.famille_nom || "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatPrix(a.prix_vente)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => {
                            setEditArticle(a);
                            setDialogOpen(true);
                          }}
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          title="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(a)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Panneau Familles (slide-in) ──────────────────────────────── */}
        {famillesOpen && (
          <div className="w-72 shrink-0 border-l border-border bg-card">
            <FamillesPanel
              onClose={() => setFamillesOpen(false)}
              onChanged={reload}
            />
          </div>
        )}
      </div>

      {/* ── Dialog article ──────────────────────────────────────────────── */}
      <ArticleFormDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditArticle(null);
        }}
        onSuccess={() => {
          setDialogOpen(false);
          setEditArticle(null);
          reload();
        }}
        initialData={editArticle}
      />

      {/* ── Modal import CSV ─────────────────────────────────────────────── */}
      {importPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (importModalRef.current && !importModalRef.current.contains(e.target as Node)) {
              if (!importing) closeImportModal();
            }
          }}
        >
          <div
            ref={importModalRef}
            className="mx-4 w-full max-w-md rounded-xl border border-border bg-card shadow-xl"
          >
            {/* Header */}
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold">
                {importReport ? "Import terminé" : "Importer le catalogue CSV"}
              </h2>
            </div>

            <div className="space-y-4 px-5 py-4">
              {importReport ? (
                /* ── Rapport ───────────────────────────────────────────── */
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div className="text-sm text-emerald-700 dark:text-emerald-300">
                      <span className="font-semibold">{importReport.articlesCreated}</span> article
                      {importReport.articlesCreated !== 1 ? "s" : ""} importé
                      {importReport.articlesCreated !== 1 ? "s" : ""}
                      {importReport.famillesCreated > 0 && (
                        <>, <span className="font-semibold">{importReport.famillesCreated}</span> famille
                        {importReport.famillesCreated !== 1 ? "s" : ""} créée
                        {importReport.famillesCreated !== 1 ? "s" : ""}</>
                      )}
                    </div>
                  </div>
                  {importReport.errors > 0 && (
                    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        <span className="font-semibold">{importReport.errors}</span> ligne
                        {importReport.errors !== 1 ? "s" : ""} non importée
                        {importReport.errors !== 1 ? "s" : ""} (erreur)
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Aperçu ────────────────────────────────────────────── */
                <div className="space-y-4">
                  {/* Résumé */}
                  <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
                    <p className="font-medium">
                      {importPreview.articles.length} article
                      {importPreview.articles.length !== 1 ? "s" : ""} détecté
                      {importPreview.articles.length !== 1 ? "s" : ""}
                    </p>
                    {importPreview.invalidRows > 0 && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {importPreview.invalidRows} ligne
                        {importPreview.invalidRows !== 1 ? "s" : ""} ignorée
                        {importPreview.invalidRows !== 1 ? "s" : ""} (nom vide)
                      </p>
                    )}
                  </div>

                  {/* Nouvelles familles */}
                  {importPreview.newFamilles.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Nouvelles familles à créer
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {importPreview.newFamilles.map((f) => (
                          <span
                            key={f}
                            className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs text-primary"
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mode */}
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Mode d'import
                    </p>
                    <div className="space-y-2">
                      {(["ajouter", "remplacer"] as ImportMode[]).map((m) => (
                        <label
                          key={m}
                          className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-accent/50 has-[:checked]:border-primary/40 has-[:checked]:bg-primary/5"
                        >
                          <input
                            type="radio"
                            name="importMode"
                            value={m}
                            checked={importMode === m}
                            onChange={() => setImportMode(m)}
                            className="mt-0.5 accent-primary"
                          />
                          <div>
                            <p className="text-sm font-medium capitalize">{m}</p>
                            <p className="text-xs text-muted-foreground">
                              {m === "ajouter"
                                ? "Ajoute les articles importés au catalogue existant."
                                : "Supprime tous les articles existants avant l'import."}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Avertissement Remplacer */}
                  {importMode === "remplacer" && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Tous les articles actuels du catalogue seront supprimés.
                        Les lignes de devis existantes ne sont pas affectées.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
              {importReport ? (
                <Button size="sm" onClick={closeImportModal}>
                  Fermer
                </Button>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeImportModal}
                    disabled={importing}
                  >
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    onClick={doImport}
                    disabled={importing || importPreview.articles.length === 0}
                    className="gap-1.5"
                  >
                    {importing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {importMode === "remplacer" ? "Remplacer le catalogue" : "Ajouter au catalogue"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
