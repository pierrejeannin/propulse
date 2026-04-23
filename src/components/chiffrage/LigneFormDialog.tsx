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
import { ArticlePicker } from "./ArticlePicker";
import { createDevisLigne, updateDevisLigne } from "@/lib/queries";
import type { CatalogueArticle, DevisLigne, DevisSection, margeLigne as _m, totalLigne as _t } from "@/lib/types";
import { totalLigne, margeLigne } from "@/lib/types";
import { cn } from "@/lib/utils";

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  mode: "catalogue" | "libre";
  article: CatalogueArticle | null;
  description: string;
  section_id: string;
  quantite: string;
  prix_unitaire: string;
  prix_achat: string;
  remise: string;
}

function defaultForm(sectionId?: number): FormState {
  return {
    mode: "catalogue",
    article: null,
    description: "",
    section_id: sectionId ? String(sectionId) : "none",
    quantite: "1",
    prix_unitaire: "",
    prix_achat: "",
    remise: "0",
  };
}

function formFromLigne(l: DevisLigne): FormState {
  return {
    mode: l.article_id ? "catalogue" : "libre",
    article: null, // will be populated separately if needed
    description: l.description,
    section_id: l.section_id ? String(l.section_id) : "none",
    quantite: String(l.quantite),
    prix_unitaire: String(l.prix_unitaire),
    prix_achat: l.prix_achat > 0 ? String(l.prix_achat) : "",
    remise: String(l.remise),
  };
}

// ─── LigneFormDialog ──────────────────────────────────────────────────────────

interface LigneFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  devisId: number;
  sections: DevisSection[];
  defaultSectionId?: number;
  initialData?: DevisLigne | null;
}

function parsePrix(s: string): number {
  return parseFloat(s.replace(",", ".")) || 0;
}

export function LigneFormDialog({
  open,
  onClose,
  onSuccess,
  devisId,
  sections,
  defaultSectionId,
  initialData,
}: LigneFormDialogProps) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<FormState>(
    initialData ? formFromLigne(initialData) : defaultForm(defaultSectionId)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      initialData ? formFromLigne(initialData) : defaultForm(defaultSectionId)
    );
  }, [open, initialData, defaultSectionId]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  // Quand on sélectionne un article, pré-remplir les champs
  function handleArticleChange(a: CatalogueArticle | null) {
    set("article", a);
    if (a) {
      setForm((prev) => ({
        ...prev,
        article: a,
        description: a.nom,
        prix_unitaire: a.prix_vente > 0 ? String(a.prix_vente) : "",
        prix_achat: a.prix_achat > 0 ? String(a.prix_achat) : "",
      }));
    }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.description.trim()) errs.description = "La désignation est requise.";
    if (!form.quantite || parsePrix(form.quantite) <= 0)
      errs.quantite = "Quantité invalide.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    try {
      const ligneCount = 0; // ordre = on append
      const payload = {
        devis_id: devisId,
        section_id:
          form.section_id && form.section_id !== "none"
            ? Number(form.section_id)
            : null,
        article_id: form.mode === "catalogue" && form.article ? form.article.id : null,
        description: form.description.trim(),
        quantite: parsePrix(form.quantite),
        prix_unitaire: parsePrix(form.prix_unitaire),
        prix_achat: parsePrix(form.prix_achat),
        remise: parsePrix(form.remise),
        ordre: ligneCount,
      };

      if (isEdit && initialData) {
        await updateDevisLigne(initialData.id, payload);
      } else {
        await createDevisLigne(payload);
      }
      onSuccess();
    } catch (err) {
      console.error(err);
      setErrors({ global: "Une erreur est survenue." });
    } finally {
      setSaving(false);
    }
  }

  // Calcul aperçu
  const pu = parsePrix(form.prix_unitaire);
  const pa = parsePrix(form.prix_achat);
  const qty = parsePrix(form.quantite) || 1;
  const remise = parsePrix(form.remise);
  const previewLigne: DevisLigne = {
    id: 0, devis_id: devisId, section_id: null, article_id: null,
    description: "", quantite: qty, prix_unitaire: pu,
    prix_achat: pa, remise, ordre: 0, created_at: "",
  };
  const totalHT = totalLigne(previewLigne);
  const marge = margeLigne(previewLigne);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la ligne" : "Ajouter une ligne"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-6 py-4">
          {/* Mode */}
          <div className="flex gap-2">
            {(["catalogue", "libre"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => set("mode", m)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  form.mode === m
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-accent"
                )}
              >
                {m === "catalogue" ? "Article catalogue" : "Saisie libre"}
              </button>
            ))}
          </div>

          {/* Article picker ou désignation libre */}
          {form.mode === "catalogue" ? (
            <div className="space-y-1.5">
              <Label>Article</Label>
              <ArticlePicker
                value={form.article}
                onChange={handleArticleChange}
              />
            </div>
          ) : null}

          {/* Désignation */}
          <div className="space-y-1.5">
            <Label>
              Désignation <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Description de la prestation ou du produit"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description}</p>
            )}
          </div>

          {/* Section */}
          <div className="space-y-1.5">
            <Label>Section</Label>
            <Select
              value={form.section_id}
              onValueChange={(v) => set("section_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sans section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sans section —</SelectItem>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Qté + PU + Remise */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>
                Qté <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.quantite}
                onChange={(e) => set("quantite", e.target.value)}
              />
              {errors.quantite && (
                <p className="text-xs text-destructive">{errors.quantite}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>PU vente HT</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  value={form.prix_unitaire}
                  onChange={(e) => set("prix_unitaire", e.target.value)}
                  className="pr-6"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  €
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Remise</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="0"
                  value={form.remise}
                  onChange={(e) => set("remise", e.target.value)}
                  className="pr-6"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Aperçu totaux */}
          {(pu > 0 || totalHT > 0) && (
            <div className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/30 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Total HT</span>
              <div className="flex items-center gap-4">
                {marge !== null && (
                  <span className="text-xs text-muted-foreground">
                    Marge{" "}
                    <span
                      className={cn(
                        "font-semibold",
                        marge >= 30
                          ? "text-emerald-600 dark:text-emerald-400"
                          : marge >= 15
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-destructive"
                      )}
                    >
                      {marge.toFixed(1)} %
                    </span>
                  </span>
                )}
                <span className="font-semibold">
                  {new Intl.NumberFormat("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                    minimumFractionDigits: 2,
                  }).format(totalHT)}
                </span>
              </div>
            </div>
          )}

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
            {isEdit ? "Enregistrer" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
