import { FileText, Plus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CompteRendus() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Comptes-rendus RDV</h1>
          </div>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nouveau CR
          </Button>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Notes de rendez-vous structurées par dossier
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <div className="rounded-full bg-primary/10 p-4">
          <Calendar className="h-8 w-8 text-primary/60" />
        </div>
        <div className="text-center">
          <p className="font-medium">Aucun compte-rendu</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Les comptes-rendus sont rattachés à un dossier et structurés en sections :
            Contexte · Besoins · Métriques · Pistes · Actions.
          </p>
        </div>
        <Button size="sm" className="mt-2 gap-1.5">
          <Plus className="h-4 w-4" />
          Créer un compte-rendu
        </Button>
      </div>
    </div>
  );
}
