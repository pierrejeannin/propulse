import { Presentation, Plus, Layers, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const SLIDE_TYPES = [
  { label: "Slides bibliothèque", desc: "Slides thématiques importées", icon: Layers },
  { label: "Slide chiffrage", desc: "Générée automatiquement", icon: Wand2 },
  { label: "Slides architecture", desc: "Depuis schémas du dossier", icon: Presentation },
];

export default function PowerPoint() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Presentation className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Génération PowerPoint</h1>
          </div>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nouvelle présentation
          </Button>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Composez et exportez des présentations .pptx par dossier
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-xl space-y-4">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Presentation className="h-7 w-7 text-primary/60" />
            </div>
            <p className="font-medium">Aucune présentation</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sélectionnez un dossier pour composer une présentation.
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            {SLIDE_TYPES.map((t) => (
              <Card key={t.label} className="border-border/50">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <t.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">{t.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
