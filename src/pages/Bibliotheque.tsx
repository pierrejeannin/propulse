import { Library, Upload, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

const THEMES_EXEMPLE = ["Veeam", "Proxmox", "Microsoft", "Datacore", "QNAP", "Réseau"];

export default function Bibliotheque() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Library className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Bibliothèque de slides</h1>
          </div>
          <Button size="sm" className="gap-1.5">
            <Upload className="h-4 w-4" />
            Importer PPTX
          </Button>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Slides globales taggées par thème, réutilisables dans toutes les présentations
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-xl space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Library className="h-7 w-7 text-primary/60" />
            </div>
            <p className="font-medium">Bibliothèque vide</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Importez des fichiers PPTX pour extraire et taguer des slides.
            </p>
            <Button size="sm" className="mt-3 gap-1.5">
              <Upload className="h-4 w-4" />
              Importer un PPTX
            </Button>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Tag className="h-3 w-3" />
              Thèmes disponibles
            </p>
            <div className="flex flex-wrap gap-2">
              {THEMES_EXEMPLE.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
