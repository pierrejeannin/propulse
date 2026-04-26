import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus,
  Loader2,
  Trash2,
  ZoomIn,
  ZoomOut,
  X,
  Network,
  Image,
  ClipboardPaste,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { open as openFilePicker, confirm } from "@tauri-apps/plugin-dialog";
import { readFile, writeFile, mkdir, exists, remove } from "@tauri-apps/plugin-fs";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import { getSchemas, createSchema, deleteSchema } from "@/lib/queries";
import type { SchemaArchitecture, SchemaType } from "@/lib/types";
import { createPortal } from "react-dom";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function extToType(ext: string): SchemaType {
  if (ext === "svg") return "SVG";
  if (ext === "jpg" || ext === "jpeg") return "JPEG";
  return "PNG";
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

// ─── Types internes ────────────────────────────────────────────────────────────

interface PendingImport {
  blob: Blob;
  format: SchemaType;
  previewUrl: string;
}

// ─── SchemaCard ───────────────────────────────────────────────────────────────

function SchemaCard({
  schema,
  imgUrl,
  onView,
  onDelete,
}: {
  schema: SchemaArchitecture;
  imgUrl: string | undefined;
  onView: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition-shadow">
      {/* Thumbnail */}
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
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium">{schema.nom}</p>
          <p className="text-xs text-muted-foreground">{formatDate(schema.created_at)}</p>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="shrink-0 rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Viewer plein écran ────────────────────────────────────────────────────────

function SchemaViewer({
  schema,
  url,
  onClose,
}: {
  schema: SchemaArchitecture;
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
        <span className="flex-1 truncate text-sm font-medium">{schema.nom}</span>
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
          style={{ transform: `scale(${zoom})`, transformOrigin: "center center", transition: "transform 0.15s ease" }}
          className="max-w-full max-h-full object-contain"
          draggable={false}
        />
      </div>
    </div>
  );

  return createPortal(viewer, document.body);
}

// ─── SchemaTab ────────────────────────────────────────────────────────────────

interface SchemaTabProps {
  dossierId: number;
}

export function SchemaTab({ dossierId }: SchemaTabProps) {
  const [schemas, setSchemas] = useState<SchemaArchitecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [imgUrls, setImgUrls] = useState<Map<number, string>>(new Map());

  // Pending import
  const [pending, setPending] = useState<PendingImport | null>(null);
  const [pendingName, setPendingName] = useState("");
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Viewer
  const [viewer, setViewer] = useState<{ schema: SchemaArchitecture; url: string } | null>(null);

  // Suivi des blob URLs pour nettoyage
  const createdUrls = useRef<string[]>([]);

  // ── Chargement ────────────────────────────────────────────────────────────

  const reload = useCallback(async () => {
    const data = await getSchemas(dossierId);
    setSchemas(data);
    return data;
  }, [dossierId]);

  useEffect(() => {
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [reload]);

  // Chargement des thumbnails à chaque changement de liste
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
            console.warn(`Impossible de charger l'image du schéma ${s.id}`, e);
          }
        })
      );
      if (mounted) setImgUrls(map);
    }

    if (schemas.length > 0) loadAll();
    else setImgUrls(new Map());

    return () => { mounted = false; };
  }, [schemas]);

  // Nettoyage des blob URLs à l'unmount
  useEffect(() => {
    const urls = createdUrls.current;
    return () => { urls.forEach(URL.revokeObjectURL); };
  }, []);

  // ── Paste support ─────────────────────────────────────────────────────────

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (pending) return;
      const cd = e.clipboardData;
      if (!cd) return;

      const items = Array.from(cd.items);

      // 1. Fichiers image/* (PNG, JPEG — et SVG si l'app le passe comme fichier binaire)
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (!file) continue;
          e.preventDefault();
          const format: SchemaType =
            item.type === "image/jpeg" ? "JPEG"
            : item.type === "image/svg+xml" ? "SVG"
            : "PNG";
          const previewUrl = URL.createObjectURL(file);
          createdUrls.current.push(previewUrl);
          setPending({ blob: file, format, previewUrl });
          setPendingName(`Schéma ${new Date().toLocaleDateString("fr-FR")}`);
          setTimeout(() => nameInputRef.current?.focus(), 50);
          return;
        }
      }

      // 2. SVG copié comme chaîne de type image/svg+xml
      //    (certains éditeurs SVG exposent ce type explicitement)
      const svgStringItem = items.find(
        (i) => i.kind === "string" && i.type === "image/svg+xml"
      );
      if (svgStringItem) {
        e.preventDefault();
        svgStringItem.getAsString((svgText) => {
          if (!svgText.trim()) return;
          const blob = new Blob([svgText], { type: "image/svg+xml" });
          const previewUrl = URL.createObjectURL(blob);
          createdUrls.current.push(previewUrl);
          setPending({ blob, format: "SVG", previewUrl });
          setPendingName(`Schéma ${new Date().toLocaleDateString("fr-FR")}`);
          setTimeout(() => nameInputRef.current?.focus(), 50);
        });
        return;
      }

      // 3. text/plain contenant du SVG — cas Excalidraw et éditeurs qui copient
      //    le markup SVG en clair. getData() est synchrone pendant l'événement.
      const textData = cd.getData("text/plain").trim();
      if (textData.startsWith("<svg") || textData.startsWith("<?xml")) {
        e.preventDefault();
        const blob = new Blob([textData], { type: "image/svg+xml" });
        const previewUrl = URL.createObjectURL(blob);
        createdUrls.current.push(previewUrl);
        setPending({ blob, format: "SVG", previewUrl });
        setPendingName(`Schéma ${new Date().toLocaleDateString("fr-FR")}`);
        setTimeout(() => nameInputRef.current?.focus(), 50);
        return;
      }
    }
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [pending]);

  // ── Lecture presse-papiers (bouton Coller) ────────────────────────────────

  async function handleColler() {
    if (pending) return;
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        // 1. PNG / JPEG
        for (const type of ["image/png", "image/jpeg"] as const) {
          if (item.types.includes(type)) {
            const blob = await item.getType(type);
            const format: SchemaType = type === "image/jpeg" ? "JPEG" : "PNG";
            const previewUrl = URL.createObjectURL(blob);
            createdUrls.current.push(previewUrl);
            setPending({ blob, format, previewUrl });
            setPendingName(`Schéma ${new Date().toLocaleDateString("fr-FR")}`);
            setTimeout(() => nameInputRef.current?.focus(), 50);
            return;
          }
        }

        // 2. SVG explicite
        if (item.types.includes("image/svg+xml")) {
          const blob = await item.getType("image/svg+xml");
          const previewUrl = URL.createObjectURL(blob);
          createdUrls.current.push(previewUrl);
          setPending({ blob, format: "SVG", previewUrl });
          setPendingName(`Schéma ${new Date().toLocaleDateString("fr-FR")}`);
          setTimeout(() => nameInputRef.current?.focus(), 50);
          return;
        }

        // 3. text/plain potentiellement SVG (Excalidraw, etc.)
        if (item.types.includes("text/plain")) {
          const textBlob = await item.getType("text/plain");
          const text = (await textBlob.text()).trim();
          if (text.startsWith("<svg") || text.startsWith("<?xml")) {
            const blob = new Blob([text], { type: "image/svg+xml" });
            const previewUrl = URL.createObjectURL(blob);
            createdUrls.current.push(previewUrl);
            setPending({ blob, format: "SVG", previewUrl });
            setPendingName(`Schéma ${new Date().toLocaleDateString("fr-FR")}`);
            setTimeout(() => nameInputRef.current?.focus(), 50);
            return;
          }
        }
      }
    } catch {
      // navigator.clipboard.read() peut être bloqué dans certains contextes Tauri —
      // l'événement paste (Ctrl+V) reste toujours actif en fallback.
    }
  }

  // ── Import fichier ────────────────────────────────────────────────────────

  async function handlePickFile() {
    const selected = await openFilePicker({
      filters: [{ name: "Images", extensions: ["png", "jpg", "jpeg", "svg"] }],
      multiple: false,
    });
    if (!selected || typeof selected !== "string") return;

    const ext = selected.split(".").pop()?.toLowerCase() ?? "png";
    const format = extToType(ext);

    try {
      const bytes = await readFile(selected);
      const blob = new Blob([bytes], { type: typeMime(format) });
      const previewUrl = URL.createObjectURL(blob);
      createdUrls.current.push(previewUrl);

      const defaultName =
        selected.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") ?? "Schéma";

      setPending({ blob, format, previewUrl });
      setPendingName(defaultName);
      setTimeout(() => nameInputRef.current?.focus(), 50);
    } catch (e) {
      console.error("Impossible de lire le fichier", e);
    }
  }

  // ── Confirmation du nom ───────────────────────────────────────────────────

  async function handleConfirmImport() {
    if (!pending || !pendingName.trim()) return;
    setSaving(true);
    try {
      const appData = await appLocalDataDir();
      const destDir = await join(appData, "schemas", String(dossierId));
      if (!(await exists(destDir))) {
        await mkdir(destDir, { recursive: true });
      }

      const ext =
        pending.format === "SVG" ? "svg"
        : pending.format === "JPEG" ? "jpg"
        : "png";
      const destPath = await join(destDir, `${Date.now()}.${ext}`);

      const buffer = await pending.blob.arrayBuffer();
      await writeFile(destPath, new Uint8Array(buffer));

      await createSchema({
        dossier_id: dossierId,
        nom: pendingName.trim(),
        chemin_fichier: destPath,
        type: pending.format,
        date_schema: null,
      });

      setPending(null);
      setPendingName("");
      await reload();
    } catch (e) {
      console.error("Erreur import schéma", e);
    } finally {
      setSaving(false);
    }
  }

  function handleCancelImport() {
    setPending(null);
    setPendingName("");
  }

  // ── Suppression ───────────────────────────────────────────────────────────

  async function handleDelete(schema: SchemaArchitecture) {
    const ok = await confirm(`Supprimer le schéma « ${schema.nom} » ?`, {
      title: "Confirmation",
      kind: "warning",
    });
    if (!ok) return;

    try { await remove(schema.chemin_fichier); }
    catch (e) { console.warn("Impossible de supprimer le fichier", e); }

    await deleteSchema(schema.id);

    setImgUrls((prev) => {
      const url = prev.get(schema.id);
      if (url) URL.revokeObjectURL(url);
      const next = new Map(prev);
      next.delete(schema.id);
      return next;
    });
    setSchemas((prev) => prev.filter((s) => s.id !== schema.id));

    // Fermer le viewer si c'était lui
    if (viewer?.schema.id === schema.id) setViewer(null);
  }

  // ── Ouverture viewer ──────────────────────────────────────────────────────

  function openViewer(schema: SchemaArchitecture) {
    const url = imgUrls.get(schema.id);
    if (url) setViewer({ schema, url });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-5 w-5 animate-spin text-primary/50" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Schémas d'architecture</h3>
          {schemas.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {schemas.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleColler}
            title="Coller une image depuis le presse-papiers (Ctrl+V)"
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            Coller
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handlePickFile}>
            <Plus className="h-3.5 w-3.5" />
            Ajouter un schéma
          </Button>
        </div>
      </div>

      {/* Formulaire de nommage (pending import) */}
      {pending && (
        <div className="flex gap-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
          {/* Aperçu miniature */}
          <div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/40">
            <img
              src={pending.previewUrl}
              alt="Aperçu"
              className="h-full w-full object-contain"
            />
          </div>

          {/* Champ nom + actions */}
          <div className="flex flex-1 flex-col justify-center gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Nom du schéma
              </p>
              <Input
                ref={nameInputRef}
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleConfirmImport();
                  if (e.key === "Escape") handleCancelImport();
                }}
                placeholder="Ex : Architecture réseau v1"
                className="h-8 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleConfirmImport}
                disabled={saving || !pendingName.trim()}
                className="gap-1.5"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Importer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancelImport}
                disabled={saving}
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Grille ou état vide */}
      {schemas.length === 0 && !pending ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border-2 border-dashed border-border py-16 text-center">
          <div className="rounded-2xl bg-muted/50 p-4">
            <Image className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <div>
            <p className="text-sm font-medium">Aucun schéma</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Importez un fichier PNG/SVG ou collez une image avec Ctrl+V
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handlePickFile} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Importer un fichier
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {schemas.map((s) => (
            <SchemaCard
              key={s.id}
              schema={s}
              imgUrl={imgUrls.get(s.id)}
              onView={() => openViewer(s)}
              onDelete={() => handleDelete(s)}
            />
          ))}
        </div>
      )}

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
