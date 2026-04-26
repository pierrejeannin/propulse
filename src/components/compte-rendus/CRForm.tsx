import { useState } from "react";
import { ChevronDown, ChevronRight, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "./RichTextEditor";
import { createCompteRendu, updateCompteRendu } from "@/lib/queries";
import type { CompteRendu } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CRAttachments } from "./CRAttachments";

// ─── Section collapsible ──────────────────────────────────────────────────────

interface SectionEditorProps {
  title: string;
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  defaultOpen?: boolean;
}

function SectionEditor({
  title,
  value,
  onChange,
  placeholder,
  defaultOpen = false,
}: SectionEditorProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-border">
      {/* Section header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:bg-accent/50"
      >
        <span>{title}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Keep editors always mounted to preserve TipTap state */}
      <div className={cn("px-4 pb-4", !open && "hidden")}>
        <RichTextEditor
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  titre: string;
  date_rdv: string;
  participants: string;
  contexte_existant: string;
  besoins_exprimes: string;
  metriques_cles: string;
  pistes_solution: string;
  actions_next_steps: string;
}

function defaultForm(dossierId?: number): FormState {
  void dossierId;
  return {
    titre: "",
    date_rdv: new Date().toISOString().split("T")[0],
    participants: "",
    contexte_existant: "",
    besoins_exprimes: "",
    metriques_cles: "",
    pistes_solution: "",
    actions_next_steps: "",
  };
}

function formFromCR(cr: CompteRendu): FormState {
  return {
    titre: cr.titre,
    date_rdv: cr.date_rdv,
    participants: cr.participants ?? "",
    contexte_existant: cr.contexte_existant ?? "",
    besoins_exprimes: cr.besoins_exprimes ?? "",
    metriques_cles: cr.metriques_cles ?? "",
    pistes_solution: cr.pistes_solution ?? "",
    actions_next_steps: cr.actions_next_steps ?? "",
  };
}

// ─── CRForm ───────────────────────────────────────────────────────────────────

interface CRFormProps {
  dossierId: number;
  initialData?: CompteRendu | null;
  onBack: () => void;
  onSuccess: (id: number) => void;
}

export function CRForm({ dossierId, initialData, onBack, onSuccess }: CRFormProps) {
  const isEdit = !!initialData;
  const [form, setForm] = useState<FormState>(
    initialData ? formFromCR(initialData) : defaultForm()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.titre.trim()) errs.titre = "Le titre est requis.";
    if (!form.date_rdv) errs.date_rdv = "La date est requise.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        titre: form.titre.trim(),
        date_rdv: form.date_rdv,
        participants: form.participants.trim() || null,
        contexte_existant: form.contexte_existant || null,
        besoins_exprimes: form.besoins_exprimes || null,
        metriques_cles: form.metriques_cles || null,
        pistes_solution: form.pistes_solution || null,
        actions_next_steps: form.actions_next_steps || null,
      };

      if (isEdit && initialData) {
        await updateCompteRendu(initialData.id, payload);
        onSuccess(initialData.id);
      } else {
        const id = await createCompteRendu({ dossier_id: dossierId, ...payload });
        onSuccess(id);
      }
    } catch (err) {
      console.error(err);
      setErrors({ global: "Une erreur est survenue. Veuillez réessayer." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Sub-header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Retour à la liste
        </button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack} disabled={saving}>
            Annuler
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isEdit ? "Enregistrer" : "Créer le compte-rendu"}
          </Button>
        </div>
      </div>

      {/* Form body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {isEdit ? "Modifier le compte-rendu" : "Nouveau compte-rendu"}
        </h3>

        {/* ── Champs d'en-tête ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label>
              Titre <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="Ex : RDV découverte — Acme Corp"
              value={form.titre}
              onChange={(e) => set("titre", e.target.value)}
            />
            {errors.titre && (
              <p className="text-xs text-destructive">{errors.titre}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>
              Date du RDV <span className="text-destructive">*</span>
            </Label>
            <Input
              type="date"
              value={form.date_rdv}
              onChange={(e) => set("date_rdv", e.target.value)}
            />
            {errors.date_rdv && (
              <p className="text-xs text-destructive">{errors.date_rdv}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Participants</Label>
            <Input
              placeholder="Ex : Jean Dupont, Marie Martin…"
              value={form.participants}
              onChange={(e) => set("participants", e.target.value)}
            />
          </div>
        </div>

        {/* ── Sections riches ────────────────────────────────────────────── */}
        <div className="space-y-3">
          <SectionEditor
            title="1. Contexte & existant"
            value={form.contexte_existant}
            onChange={(v) => set("contexte_existant", v)}
            placeholder="Infrastructure actuelle, environnement technique, contraintes existantes…"
            defaultOpen
          />
          <SectionEditor
            title="2. Besoins exprimés"
            value={form.besoins_exprimes}
            onChange={(v) => set("besoins_exprimes", v)}
            placeholder="Ce que le client souhaite accomplir, problèmes à résoudre…"
          />
          <SectionEditor
            title="3. Métriques clés"
            value={form.metriques_cles}
            onChange={(v) => set("metriques_cles", v)}
            placeholder="Volumétrie, SLA attendus, budget, délais…"
          />
          <SectionEditor
            title="4. Pistes de solution"
            value={form.pistes_solution}
            onChange={(v) => set("pistes_solution", v)}
            placeholder="Approches envisagées, produits/services à proposer…"
          />
          <SectionEditor
            title="5. Actions & next steps"
            value={form.actions_next_steps}
            onChange={(v) => set("actions_next_steps", v)}
            placeholder="Prochaines étapes, responsables, échéances…"
          />
        </div>

        {errors.global && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errors.global}
          </p>
        )}

        {/* Pièces jointes — uniquement en mode édition */}
        {isEdit && initialData && (
          <>
            <div className="h-px bg-border" />
            <CRAttachments crId={initialData.id} />
          </>
        )}
      </div>
    </div>
  );
}
