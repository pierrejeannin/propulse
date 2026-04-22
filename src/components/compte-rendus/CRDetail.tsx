import { useState } from "react";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Calendar,
  Users,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteCompteRendu } from "@/lib/queries";
import type { CompteRendu } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

/** Rendu HTML d'une section avec gestion de l'état vide */
function SectionBlock({
  title,
  html,
}: {
  title: string;
  html: string | null;
}) {
  if (!html || html === "<p></p>") return null;
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h4>
      <div
        className="cr-prose rounded-lg border border-border/50 bg-card/50 px-4 py-3 text-sm"
        // biome-ignore lint — HTML from TipTap (our own editor, trusted)
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

// ─── CRDetail ─────────────────────────────────────────────────────────────────

interface CRDetailProps {
  cr: CompteRendu;
  onBack: () => void;
  onEdit: () => void;
  onDeleted: () => void;
}

export function CRDetail({ cr, onBack, onEdit, onDeleted }: CRDetailProps) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Supprimer définitivement le compte-rendu « ${cr.titre} » ?`
    );
    if (!confirmed) return;
    setDeleting(true);
    try {
      await deleteCompteRendu(cr.id);
      onDeleted();
    } catch (e) {
      console.error(e);
      setDeleting(false);
    }
  }

  const hasSections =
    [
      cr.contexte_existant,
      cr.besoins_exprimes,
      cr.metriques_cles,
      cr.pistes_solution,
      cr.actions_next_steps,
    ].some((s) => s && s !== "<p></p>");

  return (
    <div className="flex flex-col h-full">
      {/* Sub-header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à la liste
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
            Modifier
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Supprimer
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* En-tête CR */}
        <div>
          <h3 className="text-base font-bold leading-tight">{cr.titre}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(cr.date_rdv)}
            </span>
            {cr.participants && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {cr.participants}
              </span>
            )}
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Sections */}
        {hasSections ? (
          <div className="space-y-5">
            <SectionBlock title="1. Contexte & existant" html={cr.contexte_existant} />
            <SectionBlock title="2. Besoins exprimés" html={cr.besoins_exprimes} />
            <SectionBlock title="3. Métriques clés" html={cr.metriques_cles} />
            <SectionBlock title="4. Pistes de solution" html={cr.pistes_solution} />
            <SectionBlock title="5. Actions & next steps" html={cr.actions_next_steps} />
          </div>
        ) : (
          <p className="italic text-sm text-muted-foreground/50">
            Aucun contenu renseigné dans ce compte-rendu.
          </p>
        )}
      </div>
    </div>
  );
}
