import { useEffect, useMemo, useState } from "react";
import {
  Package,
  Plus,
  Search,
  Pencil,
  Trash2,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArticleFormDialog } from "@/components/catalogue/ArticleFormDialog";
import { FamillesPanel } from "@/components/catalogue/FamillesPanel";
import {
  getCatalogueArticles,
  getCatalogueFamilles,
  deleteCatalogueArticle,
} from "@/lib/queries";
import {
  ARTICLE_TYPES,
  type ArticleType,
  type CatalogueArticle,
  type CatalogueFamille,
} from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
                    className="group hover:bg-accent/30 transition-colors"
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
    </div>
  );
}
