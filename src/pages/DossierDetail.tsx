import { useEffect, useState } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Calendar,
  Euro,
  Building2,
  FileText,
  Calculator,
  Network,
  Presentation,
  Info,
  Loader2,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatutBadge } from "@/components/dossiers/StatutBadge";
import { DossierFormDialog } from "@/components/dossiers/DossierFormDialog";
import {
  getDossierById,
  updateDossierStatut,
  deleteDossier,
} from "@/lib/queries";
import { CRTab } from "@/components/compte-rendus/CRTab";
import { DevisTab } from "@/components/chiffrage/DevisTab";
import { SchemaTab } from "@/components/schemas/SchemaTab";
import { STATUTS, type DossierWithClient, type Statut } from "@/lib/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function formatDatetime(d: string) {
  const date = new Date(d);
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMontant(v: number | null): string {
  if (v == null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

// ─── Placeholder onglet ───────────────────────────────────────────────────────

function TabPlaceholder({
  icon: Icon,
  label,
  description,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
      <div className="rounded-full bg-primary/10 p-4">
        <Icon className="h-8 w-8 text-primary/50" />
      </div>
      <div>
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground/60">
        Module à venir
      </span>
    </div>
  );
}

// ─── Onglet Informations ──────────────────────────────────────────────────────

function TabInformations({ dossier }: { dossier: DossierWithClient }) {
  return (
    <div className="space-y-6 p-6">
      {/* Description */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Description
        </h3>
        {dossier.description ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
            {dossier.description}
          </p>
        ) : (
          <p className="italic text-sm text-muted-foreground/50">
            Aucune description renseignée.
          </p>
        )}
      </div>

      <div className="h-px bg-border" />

      {/* Métadonnées */}
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Informations
        </h3>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <InfoRow
            label="Client"
            value={
              dossier.client_nom ? (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  {dossier.client_nom}
                </span>
              ) : (
                <span className="italic text-muted-foreground/50">
                  Sans client
                </span>
              )
            }
          />
          <InfoRow
            label="Statut"
            value={<StatutBadge statut={dossier.statut} size="sm" />}
          />
          <InfoRow
            label="Date de rendu"
            value={
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {formatDate(dossier.date_rendu)}
              </span>
            }
          />
          <InfoRow
            label="Montant estimé HT"
            value={
              <span className="flex items-center gap-1">
                <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                {formatMontant(dossier.montant_estime)}
              </span>
            }
          />
          <InfoRow
            label="Créé le"
            value={
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {formatDatetime(dossier.created_at)}
              </span>
            }
          />
          <InfoRow
            label="Modifié le"
            value={
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {formatDatetime(dossier.updated_at)}
              </span>
            }
          />
        </dl>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/50 bg-card/50 p-3">
      <dt className="mb-1 text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value}</dd>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function DossierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const initialTab =
    (location.state as { tab?: string } | null)?.tab ?? "informations";

  const [dossier, setDossier] = useState<DossierWithClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(false);

  // ── Chargement ────────────────────────────────────────────────────────────

  const load = async () => {
    if (!id) return navigate("/dossiers");
    setLoading(true);
    setError(null);
    try {
      const data = await getDossierById(Number(id));
      if (!data) {
        navigate("/dossiers");
        return;
      }
      setDossier(data);
    } catch (e) {
      setError("Impossible de charger le dossier.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  // ── Changement de statut ──────────────────────────────────────────────────

  const handleStatutChange = async (newStatut: Statut) => {
    if (!dossier) return;
    setDossier((prev) => prev && { ...prev, statut: newStatut });
    try {
      await updateDossierStatut(dossier.id, newStatut);
    } catch (e) {
      console.error(e);
      // Rollback
      setDossier((prev) => prev && { ...prev, statut: dossier.statut });
    }
  };

  // ── Suppression ───────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!dossier) return;
    const confirmed = window.confirm(
      `Supprimer définitivement « ${dossier.titre} » ?\n\nCette action supprimera également tous les comptes-rendus, devis et schémas associés.`
    );
    if (!confirmed) return;
    setDeletingId(true);
    try {
      await deleteDossier(dossier.id);
      navigate("/dossiers");
    } catch (e) {
      console.error(e);
      setDeletingId(false);
    }
  };

  // ── États de chargement ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm text-destructive">{error ?? "Dossier introuvable."}</p>
        <Button variant="outline" size="sm" asChild>
          <Link to="/dossiers">
            <ArrowLeft className="h-4 w-4" />
            Retour aux dossiers
          </Link>
        </Button>
      </div>
    );
  }

  // ── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* ── Breadcrumb + actions ────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <Link
          to="/dossiers"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Dossiers
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Modifier
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            onClick={handleDelete}
            disabled={deletingId}
          >
            {deletingId ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Supprimer
          </Button>
        </div>
      </div>

      {/* ── En-tête dossier ─────────────────────────────────────────────── */}
      <div className="border-b border-border px-6 py-5">
        <h1 className="text-xl font-bold leading-tight">{dossier.titre}</h1>

        {/* Métadonnées inline */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          {/* Client */}
          {dossier.client_nom ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              {dossier.client_nom}
            </span>
          ) : (
            <span className="italic text-muted-foreground/40 text-xs">
              Sans client
            </span>
          )}

          <span className="text-muted-foreground/30">·</span>

          {/* Statut — modifiable inline */}
          <Select
            value={dossier.statut}
            onValueChange={(v) => handleStatutChange(v as Statut)}
          >
            <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:ml-1">
              <StatutBadge statut={dossier.statut} />
            </SelectTrigger>
            <SelectContent>
              {STATUTS.map((s) => (
                <SelectItem key={s} value={s}>
                  <StatutBadge statut={s} size="sm" />
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-muted-foreground/30">·</span>

          {/* Date de rendu */}
          <span className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {dossier.date_rendu
              ? `Rendu le ${formatDate(dossier.date_rendu)}`
              : "Pas d'échéance"}
          </span>

          {/* Montant */}
          {dossier.montant_estime != null && (
            <>
              <span className="text-muted-foreground/30">·</span>
              <span className="flex items-center gap-1 font-medium text-foreground">
                <Euro className="h-3.5 w-3.5 text-muted-foreground" />
                {formatMontant(dossier.montant_estime)} HT
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── Onglets ─────────────────────────────────────────────────────── */}
      <Tabs defaultValue={initialTab} className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-border px-6 py-2">
          <TabsList className="h-8">
            <TabsTrigger value="informations" className="gap-1.5 text-xs">
              <Info className="h-3.5 w-3.5" />
              Informations
            </TabsTrigger>
            <TabsTrigger value="comptes-rendus" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              Comptes-rendus
            </TabsTrigger>
            <TabsTrigger value="chiffrage" className="gap-1.5 text-xs">
              <Calculator className="h-3.5 w-3.5" />
              Chiffrage
            </TabsTrigger>
            <TabsTrigger value="schemas" className="gap-1.5 text-xs">
              <Network className="h-3.5 w-3.5" />
              Schémas
            </TabsTrigger>
            <TabsTrigger value="powerpoint" className="gap-1.5 text-xs">
              <Presentation className="h-3.5 w-3.5" />
              PowerPoint
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="informations">
            <TabInformations dossier={dossier} />
          </TabsContent>

          <TabsContent value="comptes-rendus">
            <CRTab dossierId={dossier.id} />
          </TabsContent>

          <TabsContent value="chiffrage">
            <DevisTab dossierId={dossier.id} />
          </TabsContent>

          <TabsContent value="schemas">
            <SchemaTab dossierId={dossier.id} />
          </TabsContent>

          <TabsContent value="powerpoint">
            <TabPlaceholder
              icon={Presentation}
              label="Présentation PowerPoint"
              description="La composition et l'export de la présentation seront ici."
            />
          </TabsContent>
        </div>
      </Tabs>

      {/* ── Dialog modification ─────────────────────────────────────────── */}
      <DossierFormDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSuccess={() => {
          setEditOpen(false);
          load();
        }}
        initialData={dossier}
      />
    </div>
  );
}
