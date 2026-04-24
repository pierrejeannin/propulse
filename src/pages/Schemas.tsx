import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Network,
  Loader2,
  Search,
  Image,
  ZoomIn,
  ZoomOut,
  X,
  FolderOpen,
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

async function blobUrlFromPath(path: string, type: SchemaType): Promise<string> {
  const bytes = await readFile(path);
  const blob = new Blob([bytes], { type: typeMime(type) });
  return URL.createObjectURL(blob);
}

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

  const viewer = (
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
        <div className="flex flex-1 flex-col min-w-0">
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
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1.5 hover:bg-white/10"
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
          className="max-w-full max-h-full object-contain"
          draggable={false}
        />
      </div>
    </div>
  );

  return createPortal(viewer, document.body);
}

// ─── SchemaGalleryCard ────────────────────────────────────────────────────────

function SchemaGalleryCard({
  schema,
  imgUrl,
  onView,
  onOpenDossier,
}: {
  schema: SchemaAvecDossier;
  imgUrl: string | undefined;
  onView: () => void;
  onOpenDossier: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow">
      {/* Thumbnail cliquable pour viewer */}
      <button
        type="button"
        onClick={onView}
        className="aspect-video w-full bg-muted/40 flex items-center justify-center overflow-hidden"
      >
        {imgUrl ? (
          <img
            src={imgUrl}
            alt={schema.nom}
            className="w-full h-full object-contain"
          />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
        )}
      </button>

      {/* Footer */}
      <div className="flex items-start gap-2 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium leading-snug">{schema.nom}</p>
          {/* Dossier + client */}
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <FolderOpen className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {schema.dossier_titre}
              {schema.client_nom ? ` · ${schema.client_nom}` : ""}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground/60">
            {formatDate(schema.created_at)}
          </p>
        </div>

        {/* Bouton ouvrir le dossier */}
        <button
          type="button"
          onClick={onOpenDossier}
          title="Ouvrir le dossier"
          className="mt-0.5 shrink-0 rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-primary/10 hover:text-primary transition-opacity"
        >
          <FolderOpen className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Page Schemas ─────────────────────────────────────────────────────────────

export default function Schemas() {
  const navigate = useNavigate();

  const [schemas, setSchemas] = useState<SchemaAvecDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgUrls, setImgUrls] = useState<Map<number, string>>(new Map());
  const [search, setSearch] = useState("");
  const [viewer, setViewer] = useState<{ schema: SchemaAvecDossier; url: string } | null>(null);

  const createdUrls = useRef<string[]>([]);

  // ── Chargement ─────────────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    getAllSchemas()
      .then(setSchemas)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Thumbnails ─────────────────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      const map = new Map<number, string>();
      await Promise.all(
        schemas.map(async (s) => {
          try {
            const url = await blobUrlFromPath(s.chemin_fichier, s.type);
            createdUrls.current.push(url);
            map.set(s.id, url);
          } catch (e) {
            console.warn(`Impossible de charger le schéma ${s.id}`, e);
          }
        })
      );
      if (mounted) setImgUrls(map);
    }

    if (schemas.length > 0) loadAll();
    else setImgUrls(new Map());

    return () => { mounted = false; };
  }, [schemas]);

  // Nettoyage blob URLs
  useEffect(() => {
    const urls = createdUrls.current;
    return () => { urls.forEach(URL.revokeObjectURL); };
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

  // ── Navigation ─────────────────────────────────────────────────────────────

  function openDossier(schema: SchemaAvecDossier) {
    navigate(`/dossiers/${schema.dossier_id}`, { state: { tab: "schemas" } });
  }

  function openViewer(schema: SchemaAvecDossier) {
    const url = imgUrls.get(schema.id);
    if (url) setViewer({ schema, url });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* En-tête */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Schémas d'architecture</h1>
            {!loading && schemas.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {schemas.length}
              </span>
            )}
          </div>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Tous les schémas PNG / SVG rattachés aux dossiers
        </p>
      </div>

      {/* Barre de recherche */}
      {schemas.length > 0 && (
        <div className="border-b border-border px-6 py-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, dossier ou client…"
              className="h-8 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-primary/50" />
          </div>
        ) : schemas.length === 0 ? (
          /* État vide global */
          <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border py-20 text-center">
            <div className="rounded-2xl bg-muted/50 p-5">
              <Image className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <div>
              <p className="font-medium">Aucun schéma</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Importez des schémas depuis la fiche d'un dossier
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
                Aucun schéma ne correspond à « {search} »
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((s) => (
              <SchemaGalleryCard
                key={s.id}
                schema={s}
                imgUrl={imgUrls.get(s.id)}
                onView={() => openViewer(s)}
                onOpenDossier={(e) => { e.stopPropagation(); openDossier(s); }}
              />
            ))}
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
