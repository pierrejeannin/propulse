import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getCatalogueFamilles,
  createCatalogueFamille,
  updateCatalogueFamille,
  deleteCatalogueFamille,
} from "@/lib/queries";
import type { CatalogueFamille } from "@/lib/types";

interface FamillesPanelProps {
  onClose: () => void;
  onChanged: () => void;
}

export function FamillesPanel({ onClose, onChanged }: FamillesPanelProps) {
  const [familles, setFamilles] = useState<CatalogueFamille[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNom, setEditNom] = useState("");
  const [newNom, setNewNom] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      setFamilles(await getCatalogueFamilles());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  async function handleAdd() {
    if (!newNom.trim()) return;
    setSaving(true);
    try {
      await createCatalogueFamille(newNom.trim());
      setNewNom("");
      setAdding(false);
      await reload();
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: number) {
    if (!editNom.trim()) return;
    setSaving(true);
    try {
      await updateCatalogueFamille(id, editNom.trim());
      setEditingId(null);
      await reload();
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(f: CatalogueFamille) {
    if (!window.confirm(`Supprimer la famille « ${f.nom} » ?\n\nLes articles associés seront conservés sans famille.`))
      return;
    try {
      await deleteCatalogueFamille(f.id);
      await reload();
      onChanged();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">Gérer les familles</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-primary/50" />
          </div>
        ) : (
          familles.map((f) =>
            editingId === f.id ? (
              <div key={f.id} className="flex items-center gap-2">
                <Input
                  value={editNom}
                  onChange={(e) => setEditNom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUpdate(f.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  autoFocus
                  className="h-8 text-sm"
                />
                <button
                  type="button"
                  onClick={() => handleUpdate(f.id)}
                  disabled={saving}
                  className="rounded p-1 text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded p-1 text-muted-foreground hover:bg-accent"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                key={f.id}
                className="group flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-accent/50"
              >
                <span className="text-sm">{f.nom}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(f.id);
                      setEditNom(f.nom);
                    }}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(f)}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          )
        )}

        {/* Add form */}
        {adding ? (
          <div className="flex items-center gap-2 pt-1">
            <Input
              value={newNom}
              onChange={(e) => setNewNom(e.target.value)}
              placeholder="Nom de la famille"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") {
                  setAdding(false);
                  setNewNom("");
                }
              }}
              autoFocus
              className="h-8 text-sm"
            />
            <button
              type="button"
              onClick={handleAdd}
              disabled={saving || !newNom.trim()}
              className="rounded p-1 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => { setAdding(false); setNewNom(""); }}
              className="rounded p-1 text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouvelle famille
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3">
        <Button variant="outline" size="sm" className="w-full" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </div>
  );
}
