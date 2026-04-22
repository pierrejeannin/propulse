import { useState } from "react";
import { CRList } from "./CRList";
import { CRForm } from "./CRForm";
import { CRDetail } from "./CRDetail";
import type { CompteRendu } from "@/lib/types";

// ─── State machine ────────────────────────────────────────────────────────────

type View =
  | { kind: "list" }
  | { kind: "form"; cr?: CompteRendu } // cr = undefined → create, cr = defined → edit
  | { kind: "detail"; cr: CompteRendu };

// ─── CRTab ────────────────────────────────────────────────────────────────────

interface CRTabProps {
  dossierId: number;
}

export function CRTab({ dossierId }: CRTabProps) {
  const [view, setView] = useState<View>({ kind: "list" });
  // Track a refresh key so CRList reloads when we return to it
  const [listKey, setListKey] = useState(0);

  function goList() {
    setListKey((k) => k + 1);
    setView({ kind: "list" });
  }

  if (view.kind === "list") {
    return (
      <CRList
        key={listKey}
        dossierId={dossierId}
        onNew={() => setView({ kind: "form" })}
        onOpen={(cr) => setView({ kind: "detail", cr })}
      />
    );
  }

  if (view.kind === "form") {
    return (
      <CRForm
        dossierId={dossierId}
        initialData={view.cr ?? null}
        onBack={goList}
        onSuccess={(id) => {
          // After save, reload the CR and show detail
          // We'll just go back to list for simplicity & to avoid an extra query
          // (the list reloads itself)
          void id;
          goList();
        }}
      />
    );
  }

  // detail
  return (
    <CRDetail
      cr={view.cr}
      onBack={goList}
      onEdit={() => setView({ kind: "form", cr: view.cr })}
      onDeleted={goList}
    />
  );
}
