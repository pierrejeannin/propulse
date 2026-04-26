import { useCallback, useEffect, useState } from "react";
import {
  Paperclip,
  Plus,
  Trash2,
  Loader2,
  FileText,
  ExternalLink,
} from "lucide-react";
import { open as openFilePicker } from "@tauri-apps/plugin-dialog";
import { copyFile, mkdir, remove } from "@tauri-apps/plugin-fs";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import { openPath } from "@tauri-apps/plugin-opener";
import {
  getCrPiecesJointes,
  addCrPieceJointe,
  deleteCrPieceJointe,
} from "@/lib/queries";
import type { CrPieceJointe } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Extrait le nom de fichier depuis un chemin Windows ou Unix. */
function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

// ─── CRAttachments ────────────────────────────────────────────────────────────

interface CRAttachmentsProps {
  crId: number;
}

export function CRAttachments({ crId }: CRAttachmentsProps) {
  const [pjs, setPjs] = useState<CrPieceJointe[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // ── Chargement ──────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      const data = await getCrPiecesJointes(crId);
      setPjs(data);
    } catch (e) {
      console.error("[CRAttachments] Erreur chargement:", e);
    } finally {
      setLoading(false);
    }
  }, [crId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Ajout ────────────────────────────────────────────────────────────────

  const handleAdd = useCallback(async () => {
    const sourcePath = await openFilePicker({ multiple: false, directory: false });
    if (!sourcePath || typeof sourcePath !== "string") return;

    setAdding(true);
    try {
      const originalName = basename(sourcePath);
      const appData = await appLocalDataDir();
      const destDir = await join(appData, "cr-pieces-jointes", String(crId));
      await mkdir(destDir, { recursive: true });

      // Préfixe horodaté pour éviter les collisions de noms
      const storedName = `${Date.now()}_${originalName}`;
      const destPath = await join(destDir, storedName);

      await copyFile(sourcePath, destPath);
      await addCrPieceJointe(crId, originalName, destPath);
      await load();
    } catch (e) {
      console.error("[CRAttachments] Erreur ajout:", e);
    } finally {
      setAdding(false);
    }
  }, [crId, load]);

  // ── Suppression ──────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    async (pj: CrPieceJointe) => {
      if (!window.confirm(`Supprimer la pièce jointe « ${pj.nom} » ?`)) return;
      setDeletingId(pj.id);
      try {
        // Supprimer le fichier (erreur ignorée si déjà absent)
        try {
          await remove(pj.chemin);
        } catch {
          // fichier déjà supprimé manuellement
        }
        await deleteCrPieceJointe(pj.id);
        setPjs((prev) => prev.filter((p) => p.id !== pj.id));
      } catch (e) {
        console.error("[CRAttachments] Erreur suppression:", e);
      } finally {
        setDeletingId(null);
      }
    },
    []
  );

  // ── Ouverture ────────────────────────────────────────────────────────────

  const handleOpen = useCallback(async (pj: CrPieceJointe) => {
    try {
      await openPath(pj.chemin);
    } catch (e) {
      console.error("[CRAttachments] Erreur ouverture:", e);
    }
  }, []);

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* En-tête */}
      <div className="mb-3 flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" />
          Pièces jointes
          {pjs.length > 0 && (
            <span className="ml-1 rounded-full bg-muted px-1.5 py-px text-[10px] font-normal text-muted-foreground">
              {pjs.length}
            </span>
          )}
        </h4>
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding}
          className="flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          {adding ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          Ajouter un fichier
        </button>
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex h-10 items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
        </div>
      ) : pjs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-4 text-center text-xs text-muted-foreground/50">
          Aucune pièce jointe
        </p>
      ) : (
        <ul className="space-y-1.5">
          {pjs.map((pj) => (
            <li
              key={pj.id}
              className="group flex items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />

              {/* Nom cliquable → ouvre le fichier */}
              <button
                type="button"
                onClick={() => handleOpen(pj)}
                className="min-w-0 flex-1 text-left"
                title="Ouvrir le fichier"
              >
                <span className="block truncate text-sm font-medium hover:text-primary hover:underline">
                  {pj.nom}
                </span>
                <span className="text-[10px] text-muted-foreground/50">
                  Ajouté le {formatDate(pj.created_at)}
                </span>
              </button>

              {/* Ouvrir */}
              <button
                type="button"
                onClick={() => handleOpen(pj)}
                title="Ouvrir"
                className="shrink-0 rounded p-1 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </button>

              {/* Supprimer */}
              <button
                type="button"
                onClick={() => handleDelete(pj)}
                disabled={deletingId === pj.id}
                title="Supprimer"
                className="shrink-0 rounded p-1 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive disabled:opacity-50"
              >
                {deletingId === pj.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
