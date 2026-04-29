import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Mail,
  Phone,
  MapPin,
  Building2,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ClientFormDialog } from "@/components/clients/ClientFormDialog";
import { StatutBadge } from "@/components/dossiers/StatutBadge";
import { getClients, getDossiers, deleteClient } from "@/lib/queries";
import type { Client, DossierWithClient } from "@/lib/types";

// ─── Type enrichi local ──────────────────────────────────────────────────────

interface ClientRow extends Client {
  dossiers: Pick<DossierWithClient, "id" | "titre" | "statut">[];
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function Clients() {
  const navigate = useNavigate();

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClientRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Chargement ──────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rawClients, rawDossiers] = await Promise.all([
        getClients(),
        getDossiers(),
      ]);
      const rows: ClientRow[] = rawClients.map((c) => ({
        ...c,
        dossiers: rawDossiers
          .filter((d) => d.client_id === c.id)
          .map((d) => ({ id: d.id, titre: d.titre, statut: d.statut })),
      }));
      setClients(rows);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les clients.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Filtrage ────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.nom.toLowerCase().includes(q) ||
        c.secteur?.toLowerCase().includes(q) ||
        c.contact_nom?.toLowerCase().includes(q) ||
        c.contact_email?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  // ── Actions ─────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function openEdit(c: Client) {
    setEditTarget(c);
    setFormOpen(true);
  }

  function handleFormSuccess(updated: Client) {
    setFormOpen(false);
    if (editTarget) {
      setClients((prev) =>
        prev.map((c) =>
          c.id === updated.id ? { ...c, ...updated } : c
        )
      );
    } else {
      setClients((prev) => [
        ...prev,
        { ...updated, dossiers: [] },
      ]);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteClient(deleteTarget.id);
      setClients((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  }

  // ── Rendu ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* En-tête */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Clients</h1>
            {!loading && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {clients.length}
              </span>
            )}
          </div>
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouveau client
          </Button>
        </div>

        {/* Recherche */}
        <div className="relative mt-3 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Corps */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
          </div>
        ) : error ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={load}>
              Réessayer
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-center">
            <div className="rounded-full bg-muted p-4">
              <Users className="h-7 w-7 text-muted-foreground/40" />
            </div>
            {search ? (
              <p className="text-sm text-muted-foreground">
                Aucun client ne correspond à «&nbsp;{search}&nbsp;».
              </p>
            ) : (
              <>
                <p className="font-medium">Aucun client</p>
                <p className="text-sm text-muted-foreground">
                  Créez votre premier client ou ajoutez-en un depuis un dossier.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3 max-w-4xl">
            {filtered.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onEdit={() => openEdit(client)}
                onDelete={() => setDeleteTarget(client)}
                onDossierClick={(id) => navigate(`/dossiers/${id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialog formulaire */}
      <ClientFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSuccess={handleFormSuccess}
        initialData={editTarget}
      />

      {/* Dialog confirmation suppression */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Supprimer le client
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 py-2 text-sm text-muted-foreground space-y-2">
            <p>
              Voulez-vous vraiment supprimer{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.nom}
              </span>{" "}
              ?
            </p>
            {deleteTarget && deleteTarget.dossiers.length > 0 && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                Ce client est lié à{" "}
                <strong>{deleteTarget.dossiers.length}</strong> dossier
                {deleteTarget.dossiers.length > 1 ? "s" : ""}. Ils seront
                détachés (non supprimés).
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Carte client ─────────────────────────────────────────────────────────────

function ClientCard({
  client,
  onEdit,
  onDelete,
  onDossierClick,
}: {
  client: ClientRow;
  onEdit: () => void;
  onDelete: () => void;
  onDossierClick: (id: number) => void;
}) {
  const activeDossiers = client.dossiers.filter(
    (d) => d.statut !== "Gagné" && d.statut !== "Perdu" && d.statut !== "Abandonné"
  );
  const closedDossiers = client.dossiers.filter(
    (d) => d.statut === "Gagné" || d.statut === "Perdu" || d.statut === "Abandonné"
  );

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start gap-4">
        {/* Avatar initiales */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {client.nom.slice(0, 2).toUpperCase()}
        </div>

        {/* Infos principales */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold leading-tight">{client.nom}</h2>
              {client.secteur && (
                <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" />
                  {client.secteur}
                </span>
              )}
            </div>
            {/* Actions */}
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={onEdit}
                className="rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
                title="Modifier"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onDelete}
                className="rounded-md p-1.5 text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="Supprimer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Coordonnées */}
          {(client.contact_nom || client.contact_email || client.contact_telephone || client.adresse) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {client.contact_nom && (
                <span className="font-medium text-foreground/70">{client.contact_nom}</span>
              )}
              {client.contact_email && (
                <a
                  href={`mailto:${client.contact_email}`}
                  className="flex items-center gap-1 hover:text-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="h-3 w-3" />
                  {client.contact_email}
                </a>
              )}
              {client.contact_telephone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {client.contact_telephone}
                </span>
              )}
              {client.adresse && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {client.adresse}
                </span>
              )}
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <p className="mt-1.5 text-xs text-muted-foreground/70 line-clamp-1">
              {client.notes}
            </p>
          )}

          {/* Dossiers */}
          <div className="mt-3">
            {client.dossiers.length === 0 ? (
              <p className="text-xs text-muted-foreground/50">Aucun dossier</p>
            ) : (
              <div className="space-y-2">
                {activeDossiers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {activeDossiers.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => onDossierClick(d.id)}
                        className="group flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs transition-colors hover:border-primary/30 hover:bg-accent"
                      >
                        <StatutBadge statut={d.statut} size="sm" />
                        <span className="max-w-[180px] truncate text-foreground/80 group-hover:text-foreground">
                          {d.titre}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {closedDossiers.length > 0 && (
                  <p className="text-[11px] text-muted-foreground/50">
                    + {closedDossiers.length} dossier{closedDossiers.length > 1 ? "s" : ""} terminé{closedDossiers.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
