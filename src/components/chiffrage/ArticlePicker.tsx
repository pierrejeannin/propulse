/**
 * Custom combobox sans Radix Portal — compatible Tauri WebView2.
 * Affiche un champ texte + dropdown absolu dans un conteneur relatif.
 */
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { getCatalogueArticles } from "@/lib/queries";
import type { CatalogueArticle } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ArticlePickerProps {
  value: CatalogueArticle | null;
  onChange: (article: CatalogueArticle | null) => void;
  placeholder?: string;
}

export function ArticlePicker({
  value,
  onChange,
  placeholder = "Rechercher un article du catalogue…",
}: ArticlePickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [articles, setArticles] = useState<CatalogueArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  // Chargement des articles filtrés
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const q = query.trim();
    getCatalogueArticles({ search: q || undefined })
      .then(setArticles)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [query, open]);

  function select(a: CatalogueArticle) {
    onChange(a);
    setOpen(false);
    setQuery("");
  }

  function clear() {
    onChange(null);
    setQuery("");
  }

  // Fermer si clic à l'extérieur
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-input bg-input/30 px-3 py-2">
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium">{value.nom}</p>
          {value.reference && (
            <p className="text-xs text-muted-foreground">{value.reference}</p>
          )}
        </div>
        <button
          type="button"
          onClick={clear}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 rounded-md border border-input bg-input/30 px-3 py-2 focus-within:ring-1 focus-within:ring-ring">
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <input
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            closeTimer.current = setTimeout(() => setOpen(false), 150);
          }}
        />
      </div>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg"
          onMouseDown={() => clearTimeout(closeTimer.current)}
        >
          {loading ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              Chargement…
            </div>
          ) : articles.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              Aucun article trouvé
            </div>
          ) : (
            articles.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => select(a)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent",
                  "border-b border-border/50 last:border-0"
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{a.nom}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.reference && <span className="mr-2">{a.reference}</span>}
                    {a.famille_nom && <span>{a.famille_nom}</span>}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium text-foreground">
                    {a.prix_vente > 0
                      ? new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                          minimumFractionDigits: 2,
                        }).format(a.prix_vente)
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">{a.type}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
