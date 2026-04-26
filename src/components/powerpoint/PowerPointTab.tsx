import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Presentation,
  FileText,
  Calculator,
  Network,
  Library,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Download,
  Loader2,
  LayoutTemplate,
  GripVertical,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getCompteRendus,
  getSchemas,
  getBibliothequeSlides,
  getPresentationBlocs,
  addPresentationBloc,
  deletePresentationBloc,
  reorderPresentationBlocs,
} from "@/lib/queries";
import { generatePresentation } from "@/lib/generatePptx";
import type {
  BlocType,
  CompteRendu,
  DossierWithClient,
  PresentationBloc,
  SchemaArchitecture,
  BibliothequeSlide,
} from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Config visuelle par type ─────────────────────────────────────────────────

const BLOC_CONFIG: Record<
  BlocType,
  { icon: React.ElementType; color: string; label: string }
> = {
  page_garde:   { icon: LayoutTemplate, color: "text-blue-500",   label: "Page de garde"   },
  compte_rendu: { icon: FileText,       color: "text-violet-500",  label: "Compte-rendu"    },
  chiffrage:    { icon: Calculator,     color: "text-emerald-500", label: "Chiffrage"       },
  schema:       { icon: Network,        color: "text-teal-500",    label: "Schéma"          },
  bibliotheque: { icon: Library,        color: "text-orange-500",  label: "Bibliothèque"    },
};

// ─── Sous-composant : carte de bloc dans la composition ───────────────────────

function BlocCard({
  bloc,
  label,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  bloc: PresentationBloc;
  label: string;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const cfg = BLOC_CONFIG[bloc.type];
  const Icon = cfg.icon;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-card",
          cfg.color
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground/60">{cfg.label}</p>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="rounded p-1 text-muted-foreground/50 transition-colors hover:bg-accent hover:text-foreground disabled:opacity-20"
          title="Monter"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="rounded p-1 text-muted-foreground/50 transition-colors hover:bg-accent hover:text-foreground disabled:opacity-20"
          title="Descendre"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1 text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
          title="Retirer"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Sous-composant : item dans le panneau "Ajouter" ─────────────────────────

function AddItem({
  icon: Icon,
  label,
  sub,
  color,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  sub?: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-left transition-all hover:border-primary/30 hover:bg-accent"
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background",
          color
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium">{label}</p>
        {sub && (
          <p className="truncate text-[10px] text-muted-foreground/60">{sub}</p>
        )}
      </div>
      <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-primary" />
    </button>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface PowerPointTabProps {
  dossierId: number;
  dossier: DossierWithClient;
}

export function PowerPointTab({ dossierId, dossier }: PowerPointTabProps) {
  // ── État ──────────────────────────────────────────────────────────────────

  const [blocs, setBlocs] = useState<PresentationBloc[]>([]);
  const [crs, setCrs] = useState<CompteRendu[]>([]);
  const [schemas, setSchemas] = useState<SchemaArchitecture[]>([]);
  const [bibSlides, setBibSlides] = useState<BibliothequeSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // ── Chargement ────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, c, s, lib] = await Promise.all([
        getPresentationBlocs(dossierId),
        getCompteRendus(dossierId),
        getSchemas(dossierId),
        getBibliothequeSlides(),
      ]);
      setBlocs(b);
      setCrs(c);
      setSchemas(s);
      setBibSlides(lib);
    } catch (e) {
      console.error("[PowerPointTab] Erreur chargement:", e);
    } finally {
      setLoading(false);
    }
  }, [dossierId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Libellés des blocs ────────────────────────────────────────────────────

  const labelForBloc = useCallback(
    (bloc: PresentationBloc): string => {
      if (bloc.label) return bloc.label;
      switch (bloc.type) {
        case "page_garde":   return "Page de garde";
        case "chiffrage":    return "Chiffrage";
        case "compte_rendu": {
          const cr = crs.find((c) => c.id === bloc.reference_id);
          return cr ? cr.titre : "Compte-rendu";
        }
        case "schema": {
          const s = schemas.find((s) => s.id === bloc.reference_id);
          return s ? s.nom : "Schéma";
        }
        case "bibliotheque": {
          const b = bibSlides.find((b) => b.id === bloc.reference_id);
          return b ? b.nom : "Slide bibliothèque";
        }
      }
    },
    [crs, schemas, bibSlides]
  );

  // ── Ajout d'un bloc ───────────────────────────────────────────────────────

  const addBloc = useCallback(
    async (
      type: BlocType,
      referenceId: number | null = null,
      label: string | null = null
    ) => {
      const nextOrdre = blocs.length > 0 ? Math.max(...blocs.map((b) => b.ordre)) + 1 : 0;
      try {
        const newId = await addPresentationBloc({
          dossier_id: dossierId,
          type,
          ordre: nextOrdre,
          reference_id: referenceId,
          label,
        });
        setBlocs((prev) => [
          ...prev,
          {
            id: newId,
            dossier_id: dossierId,
            type,
            ordre: nextOrdre,
            reference_id: referenceId,
            label,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (e) {
        console.error("[PowerPointTab] Erreur ajout bloc:", e);
      }
    },
    [blocs, dossierId]
  );

  // ── Suppression ───────────────────────────────────────────────────────────

  const removeBloc = useCallback(async (id: number) => {
    try {
      await deletePresentationBloc(id);
      setBlocs((prev) => prev.filter((b) => b.id !== id));
    } catch (e) {
      console.error("[PowerPointTab] Erreur suppression:", e);
    }
  }, []);

  // ── Réordonnancement ──────────────────────────────────────────────────────

  const moveBloc = useCallback(
    async (index: number, direction: -1 | 1) => {
      const newBlocs = [...blocs];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= newBlocs.length) return;

      // Swap
      [newBlocs[index], newBlocs[targetIndex]] = [
        newBlocs[targetIndex],
        newBlocs[index],
      ];

      // Re-affecter les ordres
      const updated = newBlocs.map((b, i) => ({ ...b, ordre: i }));
      setBlocs(updated);

      try {
        await reorderPresentationBlocs(
          updated.map((b) => ({ id: b.id, ordre: b.ordre }))
        );
      } catch (e) {
        console.error("[PowerPointTab] Erreur réordonnancement:", e);
        // Rollback
        setBlocs(blocs);
      }
    },
    [blocs]
  );

  // ── Génération ────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (blocs.length === 0) return;
    setGenerating(true);
    try {
      await generatePresentation(dossier, blocs);
    } catch (e) {
      console.error("[PowerPointTab] Erreur génération:", e);
    } finally {
      setGenerating(false);
    }
  }, [blocs, dossier]);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const slideCount = blocs.length;

  // ── Groupes de blocs disponibles ─────────────────────────────────────────

  const availableGroups = useMemo(
    () => [
      {
        label: "Slides standard",
        items: [
          {
            type: "page_garde" as BlocType,
            label: "Page de garde",
            sub: `${dossier.titre} · ${dossier.client_nom ?? "Sans client"}`,
            refId: null,
          },
          {
            type: "chiffrage" as BlocType,
            label: "Récapitulatif chiffrage",
            sub: "Sections, totaux HT, prestation",
            refId: null,
          },
        ],
      },
      ...(crs.length > 0
        ? [
            {
              label: "Comptes-rendus",
              items: crs.map((cr) => ({
                type: "compte_rendu" as BlocType,
                label: cr.titre,
                sub: `RDV du ${cr.date_rdv}`,
                refId: cr.id,
              })),
            },
          ]
        : []),
      ...(schemas.length > 0
        ? [
            {
              label: "Schémas d'architecture",
              items: schemas.map((s) => ({
                type: "schema" as BlocType,
                label: s.nom,
                sub: s.type,
                refId: s.id,
              })),
            },
          ]
        : []),
      ...(bibSlides.length > 0
        ? [
            {
              label: "Bibliothèque",
              items: bibSlides.map((b) => ({
                type: "bibliotheque" as BlocType,
                label: b.nom,
                sub:
                  (JSON.parse(b.tags || "[]") as string[]).join(", ") ||
                  "Aucun tag",
                refId: b.id,
              })),
            },
          ]
        : []),
    ],
    [crs, schemas, bibSlides, dossier]
  );

  // ── Rendu ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 gap-0 overflow-hidden">
      {/* ── Panneau gauche : blocs disponibles ──────────────────────────── */}
      <div className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-border">
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Ajouter des blocs
          </p>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {availableGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group.label}
              </p>
              <div className="space-y-1.5">
                {group.items.map((item) => {
                  const cfg = BLOC_CONFIG[item.type];
                  return (
                    <AddItem
                      key={`${item.type}-${item.refId ?? "static"}`}
                      icon={cfg.icon}
                      label={item.label}
                      sub={item.sub}
                      color={cfg.color}
                      onClick={() => addBloc(item.type, item.refId)}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Panneau droit : composition ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* En-tête composition */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Composition
            </p>
            <p className="text-[10px] text-muted-foreground/50">
              {slideCount === 0
                ? "Aucun slide"
                : `${slideCount} slide${slideCount > 1 ? "s" : ""}`}
            </p>
          </div>
          <Button
            size="sm"
            className={cn(
              "gap-1.5",
              slideCount > 0
                ? "bg-[#1C9A97] hover:bg-[#167e7c] text-white"
                : ""
            )}
            disabled={slideCount === 0 || generating}
            onClick={handleGenerate}
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {generating ? "Génération…" : "Générer PPTX"}
          </Button>
        </div>

        {/* Liste des blocs */}
        <div className="flex-1 overflow-y-auto p-4">
          {blocs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="rounded-full bg-primary/10 p-4">
                <Presentation className="h-8 w-8 text-primary/40" />
              </div>
              <div>
                <p className="font-medium">Composition vide</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ajoutez des blocs depuis le panneau de gauche.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {blocs.map((bloc, index) => (
                <BlocCard
                  key={bloc.id}
                  bloc={bloc}
                  label={labelForBloc(bloc)}
                  index={index}
                  total={blocs.length}
                  onMoveUp={() => moveBloc(index, -1)}
                  onMoveDown={() => moveBloc(index, 1)}
                  onDelete={() => removeBloc(bloc.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pied de page info */}
        {slideCount > 0 && (
          <div className="flex items-center gap-1.5 border-t border-border px-4 py-2 text-[10px] text-muted-foreground/50">
            <Info className="h-3 w-3 shrink-0" />
            Les polices Roboto Slab et Lato doivent être installées pour le rendu optimal.
          </div>
        )}
      </div>
    </div>
  );
}
