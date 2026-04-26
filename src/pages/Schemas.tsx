import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Network,
  Loader2,
  Search,
  ImageOff,
  ZoomIn,
  ZoomOut,
  X,
  FolderOpen,
  AlertCircle,
} from "lucide-react";
import { readFile } from "@tauri-apps/plugin-fs";
import { getAllSchemas } from "@/lib/queries";
import type { SchemaAvecDossier, SchemaType } from "@/lib/types";
import { createPortal } from "react-dom";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function typeMime(type: SchemaType): string {
  if (type === "SVG") return "image/svg+xml";
  if (type === "JPEG") return "image/jpeg";
  return "image/png";
}

async function blobUrlFromPath(
  path: string,
  type: SchemaType
): Promise<string> {
  const bytes = await readFile(path);
  const blob = new Blob([bytes], { type: typeMime(type) });
  return URL.createObjectURL(blob);
}

// ─── État de chargement par image ─────────────────────────────────────────────

type ImgState =
  | { status: "loading" }
  | { status: "ok"; url: string }
  | { status: "error" };

// ─── SchemaViewer plein écran ─────────────────────────────────────────────────

function SchemaViewer({
  schema,
  url,
  onClose,
}: {
  schema: SchemaAvecDossier;
  url: string;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + 0.25, 6));
      if (e.key === "-") setZoom((z) => Math.max(z - 0.25, 0.25));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90"
      onClick={onClose}
    >
      {/* Barre de contrôles */}
      <div
        className="flex items-center gap-3 border-b border-white/10 px-4 py-2 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <Network className="h-4 w-4 shrink-0 text-white/60" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-medium">{schema.nom}</span>
          <span className="truncate text-xs text-white/50">
            {schema.dossier_titre}
            {schema.client_nom ? ` · ${schema.client_nom}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.25))}
            className="rounded p-1.5 hover:bg-white/10"
            title="Dézoomer (−)"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="w-14 text-center text-xs text-white/70">
            {Math.round(zoom * 100)} %
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(z + 0.25, 6))}
            className="rounded p-1.5 hover:bg-white/10"
            title="Zoomer (+)"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1.5 hover:bg-white/10"
          title="Fermer (Échap)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Image */}
      <div
        className="flex flex-1 items-center justify-center overflow-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={url}
          alt={schema.nom}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
            transition: "transform 0.15s ease",
          }}
          className="max-h-full max-w-full object-contain"
          draggable={false}
        />
      </div>
    </div>,
    document.body
  );
}

// ─── SchemaGalleryCard ────────────────────────────────────────────────────────

function SchemaGalleryCard({
  schema,
  imgState,
  onView,
  onOpenDossier,
}: {
  schema: SchemaAvecDossier;
  imgState: ImgState;
  onView: () => void;
  onOpenDossier: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-md">
      {/* Thumbnail */}
      <button
        type="button"
        onClick={imgState.status === "ok" ? onView : undefined}
        disabled={imgState.status !== "ok"}
        className="aspect-video w-full overflow-hidden bg-muted/40 flex items-center justify-center"
        title={imgState.status === "ok" ? "Voir en plein écran" : undefined}
      >
        {imgState.status === "loading" && (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
        )}
        {imgState.status === "ok" && (
          <img
            src={imgState.url}
            alt={schema.nom}
            className="h-full w-full object-contain"
          />
        )}
        {imgState.status === "error" && (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground/40">
            <ImageOff className="h-5 w-5" />
            <span className="text-[10px]">Fichier introuvable</span>
          </div>
        )}
      </button>

      {/* Footer */}
      <div className="flex items-start gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-snug">{schema.nom}</p>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <FolderOpen className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {schema.dossier_titre}
              {schema.client_nom ? ` · ${schema.client_nom}` : ""}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground/60">
              {formatDate(schema.created_at)}
            </span>
            <span className="rounded-sm bg-muted px-1 py-px text-[9px] font-mono text-muted-foreground/60">
              {schema.type}
            </span>
          </div>
        </div>

        {/* Bouton ouvrir le dossier */}
        <button
          type="button"
          onClick={onOpenDossier}
          title="Ouvrir le dossier"
          className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-primary/10 hover:text-primary group-hover:opacity-100"
        >
          <FolderOpen className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Page Schémas ─────────────────────────────────────────────────────────────

export default function Schemas() {
  const navigate = useNavigate();

  const [schemas, setSchemas] = useState<SchemaAvecDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState<string | null>(null);

  // imgStates : Map<id, ImgState> — distingue loading / ok / error
  const [imgStates, setImgStates] = useState<Map<number, ImgState>>(new Map());
  const createdUrls = useRef<string[]>([]);

  const [search, setSearch] = useState("");
  const [viewer, setViewer] = useState<{
    schema: SchemaAvecDossier;
    url: string;
  } | null>(null);

  // ── Chargement des schémas ────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    setQueryError(null);
    getAllSchemas()
      .then((data) => {
        setSchemas(data);
        // Initialiser tous les états à "loading"
        const initial = new Map<number, ImgState>(
          data.map((s) => [s.id, { status: "loading" }])
        );
        setImgStates(initial);
      })
      .catch((e) => {
        console.error("[Schemas] Erreur chargement:", e);
        setQueryError("Impossible de charger les schémas.");
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Chargement des thumbnails (un par un pour ne pas bloquer l'UI) ────────

  useEffect(() => {
    if (schemas.length === 0) return;
    let mounted = true;

    for (const s of schemas) {
      blobUrlFromPath(s.chemin_fichier, s.type)
        .then((url) => {
          if (!mounted) {
            URL.revokeObjectURL(url);
            return;
          }
          createdUrls.current.push(url);
          setImgStates((prev) => {
            const next = new Map(prev);
            next.set(s.id, { status: "ok", url });
            return next;
          });
        })
        .catch(() => {
          if (!mounted) return;
          setImgStates((prev) => {
            const next = new Map(prev);
            next.set(s.id, { status: "error" });
            return next;
          });
        });
    }

    return () => {
      mounted = false;
    };
  }, [schemas]);

  // Nettoyage blob URLs au démontage
  useEffect(() => {
    return () => {
      createdUrls.current.forEach(URL.revokeObjectURL);
    };
  }, []);

  // ── Filtrage ───────────────────────────────────────────────────────────────

  const q = search.trim().toLowerCase();
  const filtered = q
    ? schemas.filter(
        (s) =>
          s.nom.toLowerCase().includes(q) ||
          s.dossier_titre.toLowerCase().includes(q) ||
          (s.client_nom?.toLowerCase().includes(q) ?? false)
      )
    : schemas;

  // ── Statistiques ───────────────────────────────────────────────────────────

  const errCount = [...imgStates.values()].filter(
    (s) => s.status === "error"
  ).length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* En-tête */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Schémas d'architecture</h1>
          {!loading && schemas.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {schemas.length}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Tous les schémas PNG / SVG / JPEG rattachés aux dossiers
        </p>
      </div>

      {/* Barre de recherche */}
      {schemas.length > 0 && (
        <div className="border-b border-border px-6 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-input bg-input/30 px-3 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, dossier ou client…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-xs text-muted-foreground/50 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Avertissement fichiers introuvables */}
      {!loading && errCount > 0 && (
        <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/10 px-6 py-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {errCount === 1
            ? "1 fichier image est introuvable sur le disque."
            : `${errCount} fichiers images sont introuvables sur le disque.`}
        </div>
      )}

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-primary/50" />
          </div>
        ) : queryError ? (
          /* Erreur query */
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <AlertCircle className="h-8 w-8 text-destructive/50" />
            <div>
              <p className="font-medium text-destructive">{queryError}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Vérifiez que la base de données est accessible.
              </p>
            </div>
          </div>
        ) : schemas.length === 0 ? (
          /* État vide global */
          <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border py-20 text-center">
            <div className="rounded-2xl bg-muted/50 p-5">
              <Network className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <div>
              <p className="font-medium">Aucun schéma</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Importez des schémas PNG, SVG ou JPEG depuis la fiche d'un
                dossier, onglet{" "}
                <span className="font-medium text-foreground/70">Schémas</span>.
              </p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          /* Aucun résultat de recherche */
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <Search className="h-8 w-8 text-muted-foreground/30" />
            <div>
              <p className="font-medium">Aucun résultat</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Aucun schéma ne correspond à «{" "}
                <span className="font-medium">{search}</span> »
              </p>
            </div>
          </div>
        ) : (
          /* Grille */
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((s) => {
              const state = imgStates.get(s.id) ?? { status: "loading" as const };
              return (
                <SchemaGalleryCard
                  key={s.id}
                  schema={s}
                  imgState={state}
                  onView={() => {
                    if (state.status === "ok") setViewer({ schema: s, url: state.url });
                  }}
                  onOpenDossier={(e) => {
                    e.stopPropagation();
                    navigate(`/dossiers/${s.dossier_id}`, {
                      state: { tab: "schemas" },
                    });
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Viewer plein écran */}
      {viewer && (
        <SchemaViewer
          schema={viewer.schema}
          url={viewer.url}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
}
