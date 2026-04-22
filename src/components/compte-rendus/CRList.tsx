import { useEffect, useState } from "react";
import { Plus, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCompteRendus } from "@/lib/queries";
import type { CompteRendu } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

/** Extrait un aperçu texte brut depuis du HTML TipTap */
function htmlToPreview(html: string | null, maxLen = 120): string {
  if (!html) return "";
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
}

/** Première section non-vide parmi les 5 sections d'un CR */
function firstContent(cr: CompteRendu): string {
  const sections = [
    cr.contexte_existant,
    cr.besoins_exprimes,
    cr.metriques_cles,
    cr.pistes_solution,
    cr.actions_next_steps,
  ];
  for (const s of sections) {
    const preview = htmlToPreview(s);
    if (preview) return preview;
  }
  return "";
}

// ─── CRList ───────────────────────────────────────────────────────────────────

interface CRListProps {
  dossierId: number;
  onNew: () => void;
  onOpen: (cr: CompteRendu) => void;
}

export function CRList({ dossierId, onNew, onOpen }: CRListProps) {
  const [items, setItems] = useState<CompteRendu[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getCompteRendus(dossierId)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dossierId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-primary/50" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Comptes-rendus RDV
          {items.length > 0 && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({items.length})
            </span>
          )}
        </h3>
        <Button size="sm" className="gap-1.5" onClick={onNew}>
          <Plus className="h-3.5 w-3.5" />
          Nouveau
        </Button>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
          <div className="rounded-full bg-primary/10 p-3">
            <FileText className="h-6 w-6 text-primary/50" />
          </div>
          <div>
            <p className="text-sm font-medium">Aucun compte-rendu</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Créez le premier compte-rendu de ce dossier.
            </p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onNew}>
            <Plus className="h-3.5 w-3.5" />
            Créer un compte-rendu
          </Button>
        </div>
      )}

      {/* List */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((cr) => {
            const preview = firstContent(cr);
            return (
              <button
                key={cr.id}
                type="button"
                onClick={() => onOpen(cr)}
                className="group w-full rounded-lg border border-border bg-card/50 p-4 text-left transition-colors hover:border-primary/30 hover:bg-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium group-hover:text-primary">
                      {cr.titre}
                    </p>
                    {preview && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {preview}
                      </p>
                    )}
                  </div>
                  <time className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(cr.date_rdv)}
                  </time>
                </div>
                {cr.participants && (
                  <p className="mt-2 text-xs text-muted-foreground/70">
                    👥 {cr.participants}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
