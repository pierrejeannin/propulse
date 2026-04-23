import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getCatalogueFamilles,
  createCatalogueArticle,
  updateCatalogueArticle,
  setDefaultCpArticle,
} from "@/lib/queries";
import {
  ARTICLE_TYPES,
  type ArticleType,
  type CatalogueArticle,
  type CatalogueFamille,
} from "@/lib/types";

interface FormState {
  nom: string;
  reference: string;
  description: string;
  type: ArticleType;
  famille_id: string;
  prix_achat: string;
  prix_vente: string;
  is_default_cp: boolean;
}

const defaultForm = (): FormState => ({
  nom: "",
  reference: "",
  description: "",
  type: "Matériel",
  famille_id: "none",
  prix_achat: "",
  prix_vente: "",
  is_default_cp: false,
});

function formFromArticle(a: CatalogueArticle): FormState {
  return {
    nom: a.nom,
    reference: a.reference ?? "",
    description: a.description ?? "",
    type: a.type,
    famille_id: a.famille_id ? String(a.famille_id) : "none",
    prix_achat: a.prix_achat > 0 ? String(a.prix_achat) : "",
    prix_vente: a.prix_vente > 0 ? String(a.prix_vente) : "",
    is_default_cp: a.is_default_cp === 1,
  };
}

interface ArticleFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: CatalogueArticle | null;
}

export function ArticleFormDialog({
  open,
  onClose,
  onSuccess,
  initialData,
}: ArticleFormDialogProps) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<FormState>(defaultForm());
  const [familles, setFamilles] = useState<CatalogueFamille[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initialData ? formFromArticle(initialData) : defaultForm());
    setErrors({});
    getCatalogueFamilles().then(setFamilles).catch(console.error);
  }, [open, initialData]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function parsePrix(s: string): number {
    return parseFloat(s.replace(",", ".")) || 0;
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.nom.trim()) errs.nom = "La désignation est requise.";
    if (!form.type) errs.type = "Le type est requis.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        nom: form.nom.trim(),
        reference: form.reference.trim() || null,
        description: form.description.trim() || null,
        type: form.type,
        famille_id:
          form.famille_id && form.famille_id !== "none"
            ? Number(form.famille_id)
            : null,
        prix_achat: parsePrix(form.prix_achat),
        prix_vente: parsePrix(form.prix_vente),
      };
      let articleId: number;
      if (isEdit && initialData) {
        await updateCatalogueArticle(initialData.id, payload);
        articleId = initialData.id;
      } else {
        articleId = await createCatalogueArticle(payload);
      }

      // Gestion du tag Chef de projet (one-at-a-time)
      const wasCP = initialData?.is_default_cp === 1;
      if (form.is_default_cp) {
        await setDefaultCpArticle(articleId);
      } else if (wasCP) {
        // L'article était CP et vient d'être décoché → on retire le tag
        await setDefaultCpArticle(null);
      }

      onSuccess();
    } catch (err) {
      console.error(err);
      setErrors({ global: "Une erreur est survenue." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier l'article" : "Nouvel article"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4">
          {/* Désignation */}
          <div className="space-y-1.5">
            <Label>
              Désignation <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Ex : Windows Server 2022 Standard"
              value={form.nom}
              onChange={(e) => set("nom", e.target.value)}
            />
            {errors.nom && (
              <p className="text-xs text-destructive">{errors.nom}</p>
            )}
          </div>

          {/* Référence */}
          <div className="space-y-1.5">
            <Label>Référence</Label>
            <Input
              placeholder="Ex : WS2022-STD"
              value={form.reference}
              onChange={(e) => set("reference", e.target.value)}
            />
          </div>

          {/* Type + Famille */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>
                Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.type}
                onValueChange={(v) => set("type", v as ArticleType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ARTICLE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Famille</Label>
              <Select
                value={form.famille_id}
                onValueChange={(v) => set("famille_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucune" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucune —</SelectItem>
                  {familles.map((f) => (
                    <SelectItem key={f.id} value={String(f.id)}>
                      {f.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Prix */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>PU achat HT</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={form.prix_achat}
                  onChange={(e) => set("prix_achat", e.target.value)}
                  className="pr-6"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  €
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>PU vente HT</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={form.prix_vente}
                  onChange={(e) => set("prix_vente", e.target.value)}
                  className="pr-6"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  €
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description interne</Label>
            <Input
              placeholder="Notes internes sur cet article…"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          {/* Chef de projet par défaut — visible uniquement pour les articles de type Service */}
          {form.type === "Service" && <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/40 transition-colors">
            <input
              type="checkbox"
              checked={form.is_default_cp}
              onChange={(e) => set("is_default_cp", e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
            />
            <div>
              <p className="text-sm font-medium leading-none">
                Profil Chef de projet par défaut
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ce profil sera utilisé pour calculer automatiquement la ligne
                de pilotage projet dans les prestations. Un seul article peut
                avoir ce rôle à la fois.
              </p>
            </div>
          </label>}

          {errors.global && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors.global}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Enregistrer" : "Créer l'article"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
