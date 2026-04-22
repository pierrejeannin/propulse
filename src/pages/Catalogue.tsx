import { Package, Plus, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
const TYPES = ["Tous", "Licence", "Matériel", "Service"] as const;

export default function Catalogue() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Catalogue articles</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Filter className="h-3.5 w-3.5" />
              Familles
            </Button>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Ajouter un article
            </Button>
          </div>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Catalogue partagé : licences, matériel et services
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border bg-input/30 px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            placeholder="Rechercher par nom, référence, famille..."
          />
        </div>
        <div className="flex gap-1">
          {TYPES.map((t) => (
            <button
              key={t}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                t === "Tous"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <div className="rounded-full bg-primary/10 p-4">
          <Package className="h-8 w-8 text-primary/60" />
        </div>
        <div className="text-center">
          <p className="font-medium">Catalogue vide</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajoutez vos articles : licences, matériel et services.
          </p>
        </div>
        <Button size="sm" className="mt-2 gap-1.5">
          <Plus className="h-4 w-4" />
          Ajouter un article
        </Button>
      </div>
    </div>
  );
}
