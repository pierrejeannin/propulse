import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getClients, createClient, createDossier, updateDossier } from "@/lib/queries";
import { STATUTS, type Client, type DossierWithClient, type Statut } from "@/lib/types";
import { Loader2, User, UserPlus } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface FormState {
  clientMode: "existing" | "new";
  clientId: string;
  newClientNom: string;
  newClientContactNom: string;
  newClientContactEmail: string;
  newClientContactTel: string;
  newClientSecteur: string;
  titre: string;
  statut: Statut;
  dateRendu: string;
  montantEstime: string;
  description: string;
}

const defaultForm = (): FormState => ({
  clientMode: "existing",
  clientId: "",
  newClientNom: "",
  newClientContactNom: "",
  newClientContactEmail: "",
  newClientContactTel: "",
  newClientSecteur: "",
  titre: "",
  statut: "Découverte",
  dateRendu: "",
  montantEstime: "",
  description: "",
});

function formFromDossier(d: DossierWithClient): FormState {
  return {
    clientMode: "existing",
    clientId: d.client_id ? String(d.client_id) : "",
    newClientNom: "",
    newClientContactNom: "",
    newClientContactEmail: "",
    newClientContactTel: "",
    newClientSecteur: "",
    titre: d.titre,
    statut: d.statut,
    dateRendu: d.date_rendu ?? "",
    montantEstime: d.montant_estime != null ? String(d.montant_estime) : "",
    description: d.description ?? "",
  };
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface DossierFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (dossierId: number) => void;
  /** Si fourni : mode édition, sinon : mode création */
  initialData?: DossierWithClient | null;
}

// ─── Composant ───────────────────────────────────────────────────────────────

export function DossierFormDialog({
  open,
  onClose,
  onSuccess,
  initialData,
}: DossierFormDialogProps) {
  const isEdit = !!initialData;

  const [form, setForm] = useState<FormState>(defaultForm());
  const [clients, setClients] = useState<Client[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // ── Debug ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    console.log("[DossierFormDialog] open changed →", open);
  }, [open]);

  // ── Chargement ─────────────────────────────────────────────────────────────

  useEffect(() => {
    console.log("[DossierFormDialog] chargement effect, open =", open);
    if (!open) return;
    console.log("[DossierFormDialog] dialog ouvert — initialisation form + chargement clients");
    setForm(initialData ? formFromDossier(initialData) : defaultForm());
    setErrors({});
    getClients()
      .then((list) => {
        console.log("[DossierFormDialog] clients chargés :", list.length);
        setClients(list);
      })
      .catch((e) => console.error("[DossierFormDialog] erreur getClients :", e));
  }, [open, initialData]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.titre.trim()) errs.titre = "Le titre est requis.";
    if (form.clientMode === "new" && !form.newClientNom.trim())
      errs.newClientNom = "Le nom du client est requis.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Soumission ────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    try {
      // Résolution du client
      let clientId: number | null = null;
      if (form.clientMode === "new" && form.newClientNom.trim()) {
        clientId = await createClient({
          nom: form.newClientNom.trim(),
          contact_nom: form.newClientContactNom.trim() || undefined,
          contact_email: form.newClientContactEmail.trim() || undefined,
          contact_telephone: form.newClientContactTel.trim() || undefined,
          secteur: form.newClientSecteur.trim() || undefined,
        });
      } else if (form.clientMode === "existing" && form.clientId && form.clientId !== "none") {
        clientId = Number(form.clientId);
      }

      const payload = {
        titre: form.titre.trim(),
        client_id: clientId,
        statut: form.statut,
        description: form.description.trim() || null,
        date_rendu: form.dateRendu || null,
        montant_estime: form.montantEstime
          ? parseFloat(form.montantEstime.replace(",", "."))
          : null,
      };

      if (isEdit && initialData) {
        await updateDossier(initialData.id, payload);
        onSuccess(initialData.id);
      } else {
        const id = await createDossier(payload);
        onSuccess(id);
      }
    } catch (err) {
      console.error(err);
      setErrors({ global: "Une erreur est survenue. Veuillez réessayer." });
    } finally {
      setSaving(false);
    }
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier le dossier" : "Nouveau dossier"}
          </DialogTitle>
        </DialogHeader>

        {/* Scroll area */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-6">

          {/* ── Section CLIENT ─────────────────────────────────────────── */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Client
            </h3>

            {/* Toggle new / existing */}
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => set("clientMode", "existing")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  form.clientMode === "existing"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                <User className="h-3.5 w-3.5" />
                Client existant
              </button>
              <button
                type="button"
                onClick={() => set("clientMode", "new")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  form.clientMode === "new"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border text-muted-foreground hover:bg-accent"
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Nouveau client
              </button>
            </div>

            {form.clientMode === "existing" ? (
              <div className="space-y-1.5">
                <Label>Client</Label>
                <Select
                  value={form.clientId}
                  onValueChange={(v) => set("clientId", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un client (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Aucun client —</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nom}
                        {c.secteur && (
                          <span className="ml-2 text-muted-foreground">
                            · {c.secteur}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>
                    Nom de l'entreprise{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Ex : Acme Corp"
                    value={form.newClientNom}
                    onChange={(e) => set("newClientNom", e.target.value)}
                  />
                  {errors.newClientNom && (
                    <p className="text-xs text-destructive">
                      {errors.newClientNom}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Contact</Label>
                    <Input
                      placeholder="Prénom Nom"
                      value={form.newClientContactNom}
                      onChange={(e) =>
                        set("newClientContactNom", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Secteur</Label>
                    <Input
                      placeholder="Ex : Finance, Santé..."
                      value={form.newClientSecteur}
                      onChange={(e) => set("newClientSecteur", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="contact@exemple.fr"
                      value={form.newClientContactEmail}
                      onChange={(e) =>
                        set("newClientContactEmail", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Téléphone</Label>
                    <Input
                      type="tel"
                      placeholder="+33 6 00 00 00 00"
                      value={form.newClientContactTel}
                      onChange={(e) =>
                        set("newClientContactTel", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          <div className="h-px bg-border" />

          {/* ── Section DOSSIER ────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Dossier
            </h3>

            {/* Titre */}
            <div className="space-y-1.5">
              <Label>
                Titre du dossier <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="Ex : Renouvellement infrastructure serveurs"
                value={form.titre}
                onChange={(e) => set("titre", e.target.value)}
              />
              {errors.titre && (
                <p className="text-xs text-destructive">{errors.titre}</p>
              )}
            </div>

            {/* Statut + Date rendu */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Statut</Label>
                <Select
                  value={form.statut}
                  onValueChange={(v) => set("statut", v as Statut)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date de rendu</Label>
                <Input
                  type="date"
                  value={form.dateRendu}
                  onChange={(e) => set("dateRendu", e.target.value)}
                />
              </div>
            </div>

            {/* Montant */}
            <div className="space-y-1.5">
              <Label>Montant estimé HT</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="0"
                  value={form.montantEstime}
                  onChange={(e) => set("montantEstime", e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  €
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Contexte du projet, objectifs, remarques..."
                rows={4}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
          </section>

          {errors.global && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {errors.global}
            </p>
          )}
        </div>

        {/* Footer */}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Enregistrer" : "Créer le dossier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
