import { useEffect, useState } from "react";
import { Paperclip, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { open as openFilePicker } from "@tauri-apps/plugin-dialog";
import { copyFile, mkdir, exists } from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import {
  getDevisPiecesJointes,
  createDevisPieceJointe,
  deleteDevisPieceJointe,
} from "@/lib/queries";
import type { DevisPieceJointe } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function getExt(nom: string): string {
  const parts = nom.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "?";
}

// ─── PiecesJointes ────────────────────────────────────────────────────────────

interface PiecesJointesProps {
  devisId: number;
  dossierId: number;
}

export function PiecesJointes({ devisId, dossierId }: PiecesJointesProps) {
  const [items, setItems] = useState<DevisPieceJointe[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = async () => {
    setLoading(true);
    try {
      setItems(await getDevisPiecesJointes(devisId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, [devisId]);

  async function handleAdd() {
    setError(null);
    try {
      const selected = await openFilePicker({
        multiple: false,
        filters: [
          {
            name: "Documents",
            extensions: [
              "pdf", "docx", "doc", "xlsx", "xls", "pptx", "ppt",
              "txt", "csv", "zip", "png", "jpg", "jpeg",
            ],
          },
        ],
      });
      if (!selected || typeof selected !== "string") return;

      setUploading(true);

      // Construire le chemin de destination
      const appData = await appLocalDataDir();
      console.log("[PiecesJointes] appLocalDataDir →", appData);

      const destDir = await join(
        appData,
        "pieces-jointes",
        String(dossierId),
        "fournisseurs"
      );
      console.log("[PiecesJointes] destDir →", destDir);

      // Créer le dossier si nécessaire
      const dirExists = await exists(destDir);
      if (!dirExists) {
        await mkdir(destDir, { recursive: true });
      }

      // Nom de fichier : timestamp + nom original
      const srcName = selected.split(/[\\/]/).pop() ?? "fichier";
      const destName = `${Date.now()}_${srcName}`;
      const destPath = await join(destDir, destName);
      console.log("[PiecesJointes] source →", selected);
      console.log("[PiecesJointes] destPath →", destPath);

      await copyFile(selected, destPath);
      console.log("[PiecesJointes] copyFile OK — chemin stocké en base :", destPath);

      await createDevisPieceJointe({
        devis_id: devisId,
        nom: srcName,
        chemin_fichier: destPath,
        type_mime: null,
        taille: null,
      });

      await reload();
    } catch (e: unknown) {
      console.error(e);
      setError(
        typeof e === "string" ? e : "Impossible d'ajouter le fichier."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleOpen(pj: DevisPieceJointe) {
    setError(null);
    console.log("[PiecesJointes] handleOpen — chemin lu en base :", pj.chemin_fichier);
    try {
      await openPath(pj.chemin_fichier);
    } catch (e: unknown) {
      console.error("[PiecesJointes] Erreur openShell :", e);
      setError(
        `Impossible d'ouvrir « ${pj.nom} » (chemin : ${pj.chemin_fichier}). Vérifiez la console pour plus de détails.`
      );
    }
  }

  async function handleDelete(pj: DevisPieceJointe) {
    if (!window.confirm(`Supprimer « ${pj.nom} » de la liste ?`)) return;
    try {
      await deleteDevisPieceJointe(pj.id);
      await reload();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Offres fournisseurs</span>
          {items.length > 0 && (
            <span className="text-xs text-muted-foreground">({items.length})</span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={handleAdd}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Ajouter une offre
        </Button>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-primary/50" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-3 text-xs text-muted-foreground/60 italic">
          Aucune offre fournisseur jointe.
        </p>
      ) : (
        <div className="space-y-1.5">
          {items.map((pj) => (
            <div
              key={pj.id}
              className="group flex items-center gap-3 rounded-lg border border-border bg-card/50 px-3 py-2.5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary/10">
                <span className="text-[9px] font-bold text-primary">
                  {getExt(pj.nom)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{pj.nom}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(pj.created_at)}
                  {pj.taille !== null && ` · ${formatSize(pj.taille)}`}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => handleOpen(pj)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Ouvrir"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(pj)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
