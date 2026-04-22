import { LayoutDashboard, TrendingUp, Clock, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const STATUTS = [
  "Découverte",
  "Qualification",
  "Proposition",
  "Soutenance",
  "Gagné",
  "Perdu",
] as const;

const statutColors: Record<string, string> = {
  Découverte: "bg-slate-500/20 border-slate-500/30 text-slate-300",
  Qualification: "bg-blue-500/20 border-blue-500/30 text-blue-300",
  Proposition: "bg-violet-500/20 border-violet-500/30 text-violet-300",
  Soutenance: "bg-amber-500/20 border-amber-500/30 text-amber-300",
  Gagné: "bg-emerald-500/20 border-emerald-500/30 text-emerald-300",
  Perdu: "bg-red-500/20 border-red-500/30 text-red-300",
};

export default function Dashboard() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Pipeline commercial</h1>
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Vue kanban de toutes les opportunités en cours
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 px-6 py-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-primary/10 p-2">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">—</p>
              <p className="text-xs text-muted-foreground">Dossiers actifs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">—</p>
              <p className="text-xs text-muted-foreground">Échéances proches</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg bg-emerald-500/10 p-2">
              <Trophy className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">—</p>
              <p className="text-xs text-muted-foreground">Gagnés ce mois</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="flex flex-1 gap-3 overflow-x-auto px-6 pb-6">
        {STATUTS.map((statut) => (
          <div key={statut} className="flex w-72 shrink-0 flex-col gap-2">
            <div
              className={`flex items-center justify-between rounded-lg border px-3 py-2 ${statutColors[statut]}`}
            >
              <span className="text-xs font-semibold">{statut}</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">0</span>
            </div>
            <div className="flex flex-1 flex-col gap-2 rounded-xl border border-dashed border-border bg-card/30 p-2 min-h-32">
              <p className="py-4 text-center text-xs text-muted-foreground/50">
                Aucun dossier
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
