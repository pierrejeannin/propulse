import { Calculator, Plus, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";

const SECTIONS = [
  { label: "Licences", color: "text-blue-400", bg: "bg-blue-500/10" },
  { label: "Matériel", color: "text-violet-400", bg: "bg-violet-500/10" },
  { label: "Services", color: "text-emerald-400", bg: "bg-emerald-500/10" },
];

export default function Chiffrage() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Chiffrage</h1>
          </div>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nouveau devis
          </Button>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Devis par dossier avec catalogue articles et calcul de marge
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <div className="rounded-full bg-primary/10 p-4">
          <Receipt className="h-8 w-8 text-primary/60" />
        </div>
        <div className="text-center">
          <p className="font-medium">Aucun devis</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Sélectionnez un dossier pour créer un devis.
          </p>
        </div>

        {/* Sections preview */}
        <div className="mt-2 flex gap-3">
          {SECTIONS.map((s) => (
            <div
              key={s.label}
              className={`flex items-center gap-2 rounded-lg border border-border px-4 py-2 ${s.bg}`}
            >
              <span className={`text-sm font-medium ${s.color}`}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
