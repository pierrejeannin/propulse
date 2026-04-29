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
import { createClient, updateClient } from "@/lib/queries";
import type { Client } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface FormState {
  nom: string;
  contactNom: string;
  contactEmail: string;
  contactTel: string;
  secteur: string;
  adresse: string;
  notes: string;
}

const defaultForm = (): FormState => ({
  nom: "",
  contactNom: "",
  contactEmail: "",
  contactTel: "",
  secteur: "",
  adresse: "",
  notes: "",
});

function formFromClient(c: Client): FormState {
  return {
    nom: c.nom,
    contactNom: c.contact_nom ?? "",
    contactEmail: c.contact_email ?? "",
    contactTel: c.contact_telephone ?? "",
    secteur: c.secteur ?? "",
    adresse: c.adresse ?? "",
    notes: c.notes ?? "",
  };
}

interface ClientFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (client: Client) => void;
  initialData?: Client | null;
}

export function ClientFormDialog({
  open,
  onClose,
  onSuccess,
  initialData,
}: ClientFormDialogProps) {
  const isEdit = !!initialData;

  const [form, setForm] = useState<FormState>(defaultForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(initialData ? formFromClient(initialData) : defaultForm());
    setErrors({});
  }, [open, initialData]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  async function handleSubmit() {
    if (!form.nom.trim()) {
      setErrors({ nom: "Le nom est requis." });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nom: form.nom.trim(),
        contact_nom: form.contactNom.trim() || null,
        contact_email: form.contactEmail.trim() || null,
        contact_telephone: form.contactTel.trim() || null,
        secteur: form.secteur.trim() || null,
        adresse: form.adresse.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (isEdit && initialData) {
        await updateClient(initialData.id, payload);
        onSuccess({ ...initialData, ...payload, updated_at: new Date().toISOString() });
      } else {
        const id = await createClient(payload);
        onSuccess({
          id,
          ...payload,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error(e);
      setErrors({ global: "Une erreur est survenue. Veuillez réessayer." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le client" : "Nouveau client"}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-4">
          {/* Nom */}
          <div className="space-y-1.5">
            <Label>
              Nom de l'entreprise <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Ex : Acme Corp"
              value={form.nom}
              onChange={(e) => set("nom", e.target.value)}
            />
            {errors.nom && <p className="text-xs text-destructive">{errors.nom}</p>}
          </div>

          {/* Contact + Secteur */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Contact</Label>
              <Input
                placeholder="Prénom Nom"
                value={form.contactNom}
                onChange={(e) => set("contactNom", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Secteur</Label>
              <Input
                placeholder="Ex : Finance, Santé…"
                value={form.secteur}
                onChange={(e) => set("secteur", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="contact@exemple.fr"
                value={form.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input
                type="tel"
                placeholder="+33 6 00 00 00 00"
                value={form.contactTel}
                onChange={(e) => set("contactTel", e.target.value)}
              />
            </div>
          </div>

          {/* Adresse */}
          <div className="space-y-1.5">
            <Label>Adresse</Label>
            <Input
              placeholder="1 rue de la Paix, 75001 Paris"
              value={form.adresse}
              onChange={(e) => set("adresse", e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              placeholder="Informations complémentaires…"
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

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
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {isEdit ? "Enregistrer" : "Créer le client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
