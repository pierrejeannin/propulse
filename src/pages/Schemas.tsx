import { Network, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Schemas() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Schémas d'architecture</h1>
          </div>
          <Button size="sm" className="gap-1.5">
            <Upload className="h-4 w-4" />
            Importer un schéma
          </Button>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Schémas PNG/SVG rattachés aux dossiers
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <div className="rounded-2xl border-2 border-dashed border-border bg-card/30 px-12 py-10 text-center">
          <Network className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="font-medium">Aucun schéma</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Importez ou copiez-collez des fichiers PNG/SVG
          </p>
          <Button size="sm" className="mt-4 gap-1.5">
            <Upload className="h-4 w-4" />
            Importer
          </Button>
        </div>
      </div>
    </div>
  );
}
