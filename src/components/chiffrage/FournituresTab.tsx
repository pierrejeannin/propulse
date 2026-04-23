import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LigneFormDialog } from "./LigneFormDialog";
import { PiecesJointes } from "./PiecesJointes";
import {
  getDevisSections,
  createDevisSection,
  updateDevisSection,
  deleteDevisSection,
  getDevisLignes,
  deleteDevisLigne,
} from "@/lib/queries";
import type { DevisLigne, DevisSection } from "@/lib/types";
import { totalLigne, margeLigne } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatEur(v: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(v);
}

// ─── Ligne row ────────────────────────────────────────────────────────────────

function LigneRow({
  ligne,
  onEdit,
  onDelete,
}: {
  ligne: DevisLigne;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const total = totalLigne(ligne);
  const marge = margeLigne(ligne);

  return (
    <tr className="group border-b border-border/50 hover:bg-accent/20 transition-colors">
      <td className="px-3 py-2.5 text-sm">{ligne.description}</td>
      <td className="px-3 py-2.5 text-center text-sm text-muted-foreground">
        {ligne.quantite}
      </td>
      <td className="px-3 py-2.5 text-right text-sm text-muted-foreground">
        {formatEur(ligne.prix_unitaire)}
      </td>
      <td className="px-3 py-2.5 text-right text-sm text-muted-foreground">
        {ligne.remise > 0 ? `${ligne.remise} %` : "—"}
      </td>
      <td className="px-3 py-2.5 text-right text-sm">
        {marge !== null ? (
          <span
            className={cn(
              "text-xs font-medium",
              marge >= 30
                ? "text-emerald-600 dark:text-emerald-400"
                : marge >= 15
                ? "text-amber-600 dark:text-amber-400"
                : "text-destructive"
            )}
          >
            {marge.toFixed(1)} %
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right text-sm font-semibold">
        {formatEur(total)}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Section block ────────────────────────────────────────────────────────────

function SectionBlock({
  section,
  lignes,
  onAddLigne,
  onEditLigne,
  onDeleteLigne,
  onRename,
  onDelete,
}: {
  section: DevisSection;
  lignes: DevisLigne[];
  onAddLigne: (sectionId: number) => void;
  onEditLigne: (ligne: DevisLigne) => void;
  onDeleteLigne: (ligne: DevisLigne) => void;
  onRename: (id: number, nom: string) => void;
  onDelete: (section: DevisSection) => void;
}) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editNom, setEditNom] = useState(section.nom);

  const total = lignes.reduce((s, l) => s + totalLigne(l), 0);

  function handleRename() {
    if (editNom.trim()) onRename(section.id, editNom.trim());
    setEditing(false);
  }

  return (
    <div className="group rounded-xl border border-border bg-card/30">
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-muted-foreground"
        >
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {editing ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              value={editNom}
              onChange={(e) => setEditNom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
                if (e.key === "Escape") {
                  setEditing(false);
                  setEditNom(section.nom);
                }
              }}
              autoFocus
              className="h-7 text-sm"
            />
            <button
              type="button"
              onClick={handleRename}
              className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setEditNom(section.nom);
              }}
              className="rounded p-1 text-muted-foreground hover:bg-accent"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <>
            <span className="flex-1 text-sm font-semibold">{section.nom}</span>
            <span className="mr-2 text-sm font-medium text-muted-foreground">
              {formatEur(total)}
            </span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded p-1 text-muted-foreground opacity-0 hover:bg-accent hover:text-foreground group-hover:opacity-100"
              title="Renommer"
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(section)}
              className="rounded p-1 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
              title="Supprimer la section"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </>
        )}
      </div>

      {open && (
        <div>
          {lignes.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Désignation</th>
                  <th className="px-3 py-1.5 text-center text-xs font-medium text-muted-foreground">Qté</th>
                  <th className="px-3 py-1.5 text-right text-xs font-medium text-muted-foreground">PU HT</th>
                  <th className="px-3 py-1.5 text-right text-xs font-medium text-muted-foreground">Remise</th>
                  <th className="px-3 py-1.5 text-right text-xs font-medium text-muted-foreground">Marge</th>
                  <th className="px-3 py-1.5 text-right text-xs font-medium text-muted-foreground">Total HT</th>
                  <th className="w-16 px-3 py-1.5" />
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => (
                  <LigneRow
                    key={l.id}
                    ligne={l}
                    onEdit={() => onEditLigne(l)}
                    onDelete={() => onDeleteLigne(l)}
                  />
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-4 py-3 text-xs text-muted-foreground/50 italic">
              Aucune ligne dans cette section.
            </p>
          )}

          <div className="border-t border-border/30 px-3 py-2">
            <button
              type="button"
              onClick={() => onAddLigne(section.id)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter une ligne
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FournituresTab ───────────────────────────────────────────────────────────

interface FournituresTabProps {
  devisId: number;
  dossierId: number;
  onTotalChange: (total: number, lignes: DevisLigne[]) => void;
}

export function FournituresTab({
  devisId,
  dossierId,
  onTotalChange,
}: FournituresTabProps) {
  const [sections, setSections] = useState<DevisSection[]>([]);
  const [lignes, setLignes] = useState<DevisLigne[]>([]);

  // Dialog ligne
  const [ligneDialogOpen, setLigneDialogOpen] = useState(false);
  const [editLigne, setEditLigne] = useState<DevisLigne | null>(null);
  const [addToSection, setAddToSection] = useState<number | undefined>();

  const reload = useCallback(async () => {
    const [secs, ligs] = await Promise.all([
      getDevisSections(devisId),
      getDevisLignes(devisId),
    ]);
    setSections(secs);
    setLignes(ligs);
  }, [devisId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Notifier le parent à chaque changement de lignes
  useEffect(() => {
    const total = lignes.reduce((s, l) => s + totalLigne(l), 0);
    onTotalChange(total, lignes);
  }, [lignes, onTotalChange]);

  // ── Sections CRUD ─────────────────────────────────────────────────────────

  async function handleAddSection() {
    const nom = window.prompt("Nom de la nouvelle section :");
    if (!nom?.trim()) return;
    await createDevisSection(devisId, nom.trim(), sections.length);
    await reload();
  }

  async function handleRenameSection(id: number, nom: string) {
    await updateDevisSection(id, nom);
    await reload();
  }

  async function handleDeleteSection(section: DevisSection) {
    const count = lignes.filter((l) => l.section_id === section.id).length;
    const msg = count > 0
      ? `Supprimer la section « ${section.nom} » et ses ${count} ligne(s) ?`
      : `Supprimer la section « ${section.nom} » ?`;
    if (!window.confirm(msg)) return;
    await deleteDevisSection(section.id);
    await reload();
  }

  // ── Lignes CRUD ───────────────────────────────────────────────────────────

  function openAddLigne(sectionId?: number) {
    setEditLigne(null);
    setAddToSection(sectionId);
    setLigneDialogOpen(true);
  }

  function openEditLigne(ligne: DevisLigne) {
    setEditLigne(ligne);
    setAddToSection(undefined);
    setLigneDialogOpen(true);
  }

  async function handleDeleteLigne(ligne: DevisLigne) {
    if (!window.confirm(`Supprimer la ligne « ${ligne.description} » ?`)) return;
    await deleteDevisLigne(ligne.id, devisId);
    await reload();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const lignesSansSection = lignes.filter((l) => l.section_id === null);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {lignes.length} ligne{lignes.length > 1 ? "s" : ""}
          {sections.length > 0 &&
            ` · ${sections.length} section${sections.length > 1 ? "s" : ""}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleAddSection}
          >
            <Plus className="h-3.5 w-3.5" />
            Section
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => openAddLigne()}
          >
            <Plus className="h-3.5 w-3.5" />
            Ligne
          </Button>
        </div>
      </div>

      {sections.length === 0 && lignes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-12 text-center">
          <p className="text-sm font-medium">Aucune fourniture</p>
          <p className="text-xs text-muted-foreground">
            Ajoutez des sections et des lignes pour composer le chiffrage.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleAddSection} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Section
            </Button>
            <Button size="sm" onClick={() => openAddLigne()} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Ligne
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sections.map((s) => (
            <SectionBlock
              key={s.id}
              section={s}
              lignes={lignes.filter((l) => l.section_id === s.id)}
              onAddLigne={openAddLigne}
              onEditLigne={openEditLigne}
              onDeleteLigne={handleDeleteLigne}
              onRename={handleRenameSection}
              onDelete={handleDeleteSection}
            />
          ))}

          {lignesSansSection.length > 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card/20">
              <div className="border-b border-border/30 px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground italic">
                  Sans section
                </span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="px-3 py-1.5 text-left text-xs font-medium text-muted-foreground">Désignation</th>
                    <th className="px-3 py-1.5 text-center text-xs font-medium text-muted-foreground">Qté</th>
                    <th className="px-3 py-1.5 text-right text-xs font-medium text-muted-foreground">PU HT</th>
                    <th className="px-3 py-1.5 text-right text-xs font-medium text-muted-foreground">Remise</th>
                    <th className="px-3 py-1.5 text-right text-xs font-medium text-muted-foreground">Marge</th>
                    <th className="px-3 py-1.5 text-right text-xs font-medium text-muted-foreground">Total HT</th>
                    <th className="w-16 px-3 py-1.5" />
                  </tr>
                </thead>
                <tbody>
                  {lignesSansSection.map((l) => (
                    <LigneRow
                      key={l.id}
                      ligne={l}
                      onEdit={() => openEditLigne(l)}
                      onDelete={() => handleDeleteLigne(l)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Pièces jointes fournisseurs */}
      <div className="h-px bg-border" />
      <PiecesJointes devisId={devisId} dossierId={dossierId} />

      {/* Dialog ligne */}
      <LigneFormDialog
        open={ligneDialogOpen}
        onClose={() => setLigneDialogOpen(false)}
        onSuccess={() => {
          setLigneDialogOpen(false);
          reload();
        }}
        devisId={devisId}
        sections={sections}
        defaultSectionId={addToSection}
        initialData={editLigne}
      />
    </div>
  );
}
