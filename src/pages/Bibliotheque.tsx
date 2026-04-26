import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Library,
  Upload,
  Tag,
  Search,
  Trash2,
  Pencil,
  FileSliders,
  X,
  Check,
  Loader2,
  Plus,
} from "lucide-react";
import { open as openFilePicker } from "@tauri-apps/plugin-dialog";
import { confirm } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import {
  getBibliothequeSlides,
  createBibliothequeSlide,
  updateBibliothequeSlide,
  deleteBibliothequeSlide,
} from "@/lib/queries";
import type { BibliothequeSlide } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseTags(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function basename(path: string): string {
  return path.replace(/.*[\\/]/, "");
}

// ─── Composant : badge tag ────────────────────────────────────────────────────

function TagBadge({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      {tag}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 text-muted-foreground/50 hover:text-destructive"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}

// ─── Composant : saisie d'un tag ──────────────────────────────────────────────

function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInput("");
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => (
        <TagBadge
          key={t}
          tag={t}
          onRemove={() => onChange(tags.filter((x) => x !== t))}
        />
      ))}
      <div className="flex items-center gap-1">
        <input
          className="h-5 w-20 rounded border border-input bg-input/30 px-1.5 text-[10px] outline-none placeholder:text-muted-foreground/40 focus:border-primary/50"
          placeholder="+ tag"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag();
            }
          }}
        />
        {input.trim() && (
          <button
            onClick={addTag}
            className="text-primary/70 hover:text-primary"
          >
            <Plus className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Composant : carte de slide ───────────────────────────────────────────────

function SlideCard({
  slide,
  onEdit,
  onDelete,
}: {
  slide: BibliothequeSlide;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tags = parseTags(slide.tags);
  const filename = basename(slide.fichier_path);

  return (
    <div className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/20 hover:shadow-sm">
      {/* Miniature placeholder */}
      <div className="flex h-24 items-center justify-center rounded-lg bg-gradient-to-br from-[#2C3C4C]/10 to-[#1C9A97]/10">
        <FileSliders className="h-8 w-8 text-[#2C3C4C]/30" />
      </div>

      {/* Nom + fichier */}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{slide.nom}</p>
        <p className="truncate text-[10px] text-muted-foreground/50" title={slide.fichier_path}>
          {filename}
        </p>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <TagBadge key={t} tag={t} />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="h-7 flex-1 gap-1 text-xs"
          onClick={onEdit}
        >
          <Pencil className="h-3 w-3" />
          Modifier
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs text-destructive hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ─── Composant : formulaire d'import / édition ───────────────────────────────

function SlideForm({
  initial,
  filePath,
  onSave,
  onCancel,
}: {
  initial?: BibliothequeSlide;
  filePath?: string;
  onSave: (data: { nom: string; tags: string[] }) => void;
  onCancel: () => void;
}) {
  const [nom, setNom] = useState(initial?.nom ?? (filePath ? basename(filePath).replace(/\.pptx$/i, "") : ""));
  const [tags, setTags] = useState<string[]>(parseTags(initial?.tags ?? "[]"));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!nom.trim()) return;
    setSaving(true);
    try {
      await onSave({ nom: nom.trim(), tags });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-primary/30 bg-card p-5 shadow-sm">
      <div>
        <p className="text-sm font-semibold">
          {initial ? "Modifier le slide" : "Importer un slide"}
        </p>
        {filePath && (
          <p className="mt-0.5 text-xs text-muted-foreground/60 truncate">
            {basename(filePath)}
          </p>
        )}
      </div>

      {/* Nom */}
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Nom
        </label>
        <input
          autoFocus
          className="w-full rounded-lg border border-input bg-input/30 px-3 py-1.5 text-sm outline-none focus:border-primary/50"
          placeholder="Ex. Présentation Veeam"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />
      </div>

      {/* Tags */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
          Tags (Entrée ou virgule pour valider)
        </label>
        <TagInput tags={tags} onChange={setTags} />
      </div>

      {/* Boutons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          className="gap-1.5"
          disabled={!nom.trim() || saving}
          onClick={handleSubmit}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Enregistrer
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Bibliotheque() {
  const [slides, setSlides] = useState<BibliothequeSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // État du formulaire (null = fermé, "import" = nouveau, number = édition d'un slide)
  const [formState, setFormState] = useState<
    null | { mode: "import"; filePath: string } | { mode: "edit"; slide: BibliothequeSlide }
  >(null);

  // ── Chargement ──────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSlides(await getBibliothequeSlides());
    } catch (e) {
      console.error("[Bibliotheque] Erreur chargement:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Import ──────────────────────────────────────────────────────────────

  const handleImport = async () => {
    const path = await openFilePicker({
      multiple: false,
      filters: [{ name: "PowerPoint", extensions: ["pptx", "ppt"] }],
    });
    if (!path || Array.isArray(path)) return;
    setFormState({ mode: "import", filePath: path as string });
  };

  const handleSaveImport = async (
    filePath: string,
    data: { nom: string; tags: string[] }
  ) => {
    await createBibliothequeSlide({
      nom: data.nom,
      tags: data.tags,
      fichier_path: filePath,
    });
    setFormState(null);
    await load();
  };

  // ── Édition ─────────────────────────────────────────────────────────────

  const handleSaveEdit = async (
    slide: BibliothequeSlide,
    data: { nom: string; tags: string[] }
  ) => {
    await updateBibliothequeSlide(slide.id, data);
    setFormState(null);
    await load();
  };

  // ── Suppression ─────────────────────────────────────────────────────────

  const handleDelete = async (slide: BibliothequeSlide) => {
    const ok = await confirm(`Supprimer « ${slide.nom} » de la bibliothèque ?`, {
      title: "Confirmation",
      kind: "warning",
    });
    if (!ok) return;
    try {
      await deleteBibliothequeSlide(slide.id);
      await load();
    } catch (e) {
      console.error("[Bibliotheque] Erreur suppression:", e);
    }
  };

  // ── Filtrage ────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!search.trim()) return slides;
    const q = search.toLowerCase();
    return slides.filter(
      (s) =>
        s.nom.toLowerCase().includes(q) ||
        parseTags(s.tags).some((t) => t.toLowerCase().includes(q))
    );
  }, [slides, search]);

  // ── Tous les tags disponibles (pour affichage) ──────────────────────────

  const allTags = useMemo(() => {
    const set = new Set<string>();
    slides.forEach((s) => parseTags(s.tags).forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [slides]);

  // ── Rendu ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Library className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Bibliothèque de slides</h1>
          </div>
          <Button size="sm" className="gap-1.5" onClick={handleImport}>
            <Upload className="h-4 w-4" />
            Importer un PPTX
          </Button>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {slides.length} slide{slides.length !== 1 ? "s" : ""} · Réutilisables dans toutes les présentations
        </p>
      </div>

      {/* ── Corps ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Formulaire (import ou édition) */}
            {formState !== null && (
              <SlideForm
                initial={formState.mode === "edit" ? formState.slide : undefined}
                filePath={formState.mode === "import" ? formState.filePath : undefined}
                onSave={(data) => {
                  if (formState.mode === "import") {
                    void handleSaveImport(formState.filePath, data);
                  } else {
                    void handleSaveEdit(formState.slide, data);
                  }
                }}
                onCancel={() => setFormState(null)}
              />
            )}

            {slides.length === 0 && formState === null ? (
              /* État vide */
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="rounded-full bg-primary/10 p-4">
                  <Library className="h-8 w-8 text-primary/60" />
                </div>
                <div>
                  <p className="font-medium">Bibliothèque vide</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Importez des fichiers PPTX pour les référencer avec des tags.
                  </p>
                </div>
                <Button size="sm" className="mt-1 gap-1.5" onClick={handleImport}>
                  <Upload className="h-4 w-4" />
                  Importer un PPTX
                </Button>
                {allTags.length === 0 && (
                  <div className="mt-2">
                    <p className="mb-2 flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Tag className="h-3 w-3" />
                      Exemples de thèmes
                    </p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {["Veeam", "Proxmox", "Microsoft", "Datacore", "QNAP", "Réseau"].map(
                        (t) => (
                          <span
                            key={t}
                            className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground/60"
                          >
                            {t}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              slides.length > 0 && (
                <>
                  {/* Barre de recherche */}
                  <div className="flex items-center gap-2 rounded-lg border border-input bg-input/30 px-3 py-1.5">
                    <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <input
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                      placeholder="Rechercher par nom ou tag…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                      <button
                        onClick={() => setSearch("")}
                        className="text-muted-foreground/40 hover:text-muted-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Tags disponibles */}
                  {allTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground/50">
                        <Tag className="h-3 w-3" />
                      </span>
                      {allTags.map((t) => (
                        <button
                          key={t}
                          onClick={() => setSearch(t)}
                          className={cn(
                            "rounded-full border px-2.5 py-0.5 text-[10px] transition-colors",
                            search === t
                              ? "border-primary/40 bg-primary/10 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/20"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Grille de cartes */}
                  {filtered.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-sm text-muted-foreground">
                        Aucun slide ne correspond à votre recherche.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {filtered.map((slide) => (
                        <SlideCard
                          key={slide.id}
                          slide={slide}
                          onEdit={() => setFormState({ mode: "edit", slide })}
                          onDelete={() => void handleDelete(slide)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
