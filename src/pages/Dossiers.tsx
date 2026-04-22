import { FolderOpen, Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function Dossiers() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Dossiers & Clients</h1>
          </div>
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Nouveau dossier
          </Button>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Gérez vos opportunités et fiches clients
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg border bg-input/30 px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            placeholder="Rechercher un dossier ou client..."
          />
        </div>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4" />
          Clients
        </Button>
      </div>

      {/* Empty state */}
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6">
        <div className="rounded-full bg-primary/10 p-4">
          <FolderOpen className="h-8 w-8 text-primary/60" />
        </div>
        <div className="text-center">
          <p className="font-medium">Aucun dossier</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Créez votre premier dossier pour commencer à suivre une opportunité.
          </p>
        </div>
        <Button size="sm" className="mt-2 gap-1.5">
          <Plus className="h-4 w-4" />
          Créer un dossier
        </Button>
      </div>
    </div>
  );
}
