import XLSX from "xlsx-js-style";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import {
  getDevisSections,
  getDevisLignes,
  getPrestationLignes,
  getDefaultCpArticle,
  getDevisCpPourcentage,
} from "./queries";
import { totalLigne, margeLigne } from "./types";
import type { DossierWithClient, DevisLigne, DevisSection, PrestationLigne } from "./types";

// ─── Palette Foliateam ────────────────────────────────────────────────────────

const C = {
  navy:   "2C3C4C",
  blue:   "4E4FEB",
  teal:   "1C9A97",
  orange: "FC9B50",
  light:  "ECF8F9",
  white:  "FFFFFF",
  dark:   "1F2937",
  muted:  "6B7280",
  violet: "5B21B6",
  violetBg: "EDE9F8",
};

// ─── Style factory ────────────────────────────────────────────────────────────

type Align = "left" | "center" | "right";

function st(
  bg?: string,
  fg?: string,
  bold?: boolean,
  italic?: boolean,
  align?: Align,
  sz?: number,
): Record<string, unknown> {
  return {
    font: {
      name: "Calibri",
      sz: sz ?? 11,
      bold: !!bold,
      italic: !!italic,
      color: { rgb: fg ?? C.dark },
    },
    ...(bg ? { fill: { patternType: "solid", fgColor: { rgb: bg } } } : {}),
    alignment: {
      horizontal: align ?? "left",
      vertical: "center",
      wrapText: false,
    },
  };
}

// Présets communs
const S = {
  h1:        st(C.navy,     C.white, true,  false, "center", 13),
  h1sub:     st(C.navy,     C.white, false, false, "center", 10),
  secNavy:   st(C.navy,     C.white, true),
  secBlue:   st(C.blue,     C.white, true),
  teal:      st(C.teal,     C.white, true),
  orange:    st(C.orange,   C.white, true),
  orangeR:   st(C.orange,   C.white, true,  false, "right"),
  colHdr:    st("3A4F61",   C.white, true),
  colHdrR:   st("3A4F61",   C.white, true,  false, "right"),
  cell:      st(undefined,  C.dark),
  cellR:     st(undefined,  C.dark,  false, false, "right"),
  cellB:     st(undefined,  C.dark,  true,  false, "right"),
  altCell:   st(C.light,    C.dark),
  altCellR:  st(C.light,    C.dark,  false, false, "right"),
  altCellB:  st(C.light,    C.dark,  true,  false, "right"),
  muted:     st(undefined,  C.muted, false, true),
  cp:        st(C.violetBg, C.violet, false, true),
  cpR:       st(C.violetBg, C.violet, false, true,  "right"),
  cpBR:      st(C.violetBg, C.violet, true,  true,  "right"),
  blank:     {} as Record<string, unknown>,
};

// ─── Worksheet helpers ────────────────────────────────────────────────────────

type WS = Record<string, unknown>;

function setCell(
  ws: WS,
  col: number,
  row: number,
  val: string | number,
  style: Record<string, unknown>,
) {
  const addr = XLSX.utils.encode_cell({ r: row, c: col });
  ws[addr] = { v: val, t: typeof val === "number" ? "n" : "s", s: style };
}

function addMerge(
  merges: XLSX.Range[],
  r1: number,
  c1: number,
  r2: number,
  c2: number,
) {
  merges.push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
}

function finalizeSheet(
  ws: WS,
  merges: XLSX.Range[],
  colWidths: number[],
  lastRow: number,
  lastCol: number,
  rowHeights?: Record<number, number>,
): XLSX.WorkSheet {
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: lastCol } });
  ws["!merges"] = merges;
  ws["!cols"] = colWidths.map((wch) => ({ wch }));
  if (rowHeights) {
    ws["!rows"] = Object.entries(rowHeights).reduce<{ hpt?: number }[]>((arr, [idx, h]) => {
      arr[Number(idx)] = { hpt: h };
      return arr;
    }, []);
  }
  return ws as XLSX.WorkSheet;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtEur(v: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

function fmtDate(d: string | null): string {
  if (!d) return "—";
  if (d.includes("T") || d.length > 10) {
    return new Date(d).toLocaleDateString("fr-FR");
  }
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
}

function fmtJours(j: number): string {
  return j % 1 === 0 ? `${j} j` : `${j.toFixed(1)} j`;
}

function roundHalf(n: number): number {
  return Math.round(n * 2) / 2;
}

function sanitize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\-_ ]/g, "")
    .trim()
    .replace(/ +/g, "_");
}

// ─── Onglet Synthèse ──────────────────────────────────────────────────────────

function buildSynthese(
  dossier: DossierWithClient,
  fournituresHT: number,
  prestationHT: number,
  margeArticles: number | null,
): XLSX.WorkSheet {
  const ws: WS = {};
  const merges: XLSX.Range[] = [];
  const totalHT = fournituresHT + prestationHT;
  const today = new Date().toLocaleDateString("fr-FR");
  const C2 = 2; // dernière colonne

  let r = 0;

  // Titre principal
  setCell(ws, 0, r, `PROPULSE – ${dossier.titre}`, S.h1);
  addMerge(merges, r, 0, r, C2);
  r++;

  // Sous-titre client + date
  const clientStr = dossier.client_nom ?? "Sans client";
  setCell(ws, 0, r, `Client : ${clientStr}   |   Exporté le : ${today}`, S.h1sub);
  addMerge(merges, r, 0, r, C2);
  r++;

  // Séparateur
  setCell(ws, 0, r, "", S.blank);
  addMerge(merges, r, 0, r, C2);
  r++;

  // Section Informations
  setCell(ws, 0, r, "INFORMATIONS", S.secNavy);
  addMerge(merges, r, 0, r, C2);
  r++;

  const infoData: [string, string][] = [
    ["Statut",           dossier.statut],
    ["Date de rendu",    fmtDate(dossier.date_rendu)],
    ["Date de création", fmtDate(dossier.created_at)],
  ];
  for (const [label, val] of infoData) {
    setCell(ws, 0, r, label, S.cell);
    setCell(ws, 1, r, val,   S.cellR);
    setCell(ws, 2, r, "",    S.blank);
    r++;
  }

  // Séparateur
  setCell(ws, 0, r, "", S.blank);
  addMerge(merges, r, 0, r, C2);
  r++;

  // Section Récapitulatif financier
  setCell(ws, 0, r, "RÉCAPITULATIF FINANCIER", S.secNavy);
  addMerge(merges, r, 0, r, C2);
  r++;

  setCell(ws, 0, r, "Fournitures HT",                     S.cell);
  setCell(ws, 1, r, fmtEur(fournituresHT),                S.cellR);
  setCell(ws, 2, r, "",                                    S.blank);
  r++;
  setCell(ws, 0, r, "Prestation HT (dont pilotage projet)", S.cell);
  setCell(ws, 1, r, fmtEur(prestationHT),                 S.cellR);
  setCell(ws, 2, r, "",                                    S.blank);
  r++;

  // Total global — orange
  setCell(ws, 0, r, "TOTAL GLOBAL HT",  S.orange);
  setCell(ws, 1, r, fmtEur(totalHT),    S.orangeR);
  setCell(ws, 2, r, "",                 S.orange);
  r++;

  if (margeArticles !== null) {
    setCell(ws, 0, r, "Marge articles (estimation)", S.cell);
    setCell(ws, 1, r, `${margeArticles.toFixed(1)} %`, S.cellR);
    setCell(ws, 2, r, "", S.blank);
    r++;
  }

  return finalizeSheet(ws, merges, [38, 22, 4], r - 1, C2, { 0: 24, 1: 18 });
}

// ─── Onglet Fournitures ───────────────────────────────────────────────────────

function buildFournitures(
  dossier: DossierWithClient,
  sections: DevisSection[],
  lignes: DevisLigne[],
): XLSX.WorkSheet {
  const ws: WS = {};
  const merges: XLSX.Range[] = [];
  const LC = 4; // 5 colonnes : 0..4
  const today = new Date().toLocaleDateString("fr-FR");
  const clientStr = dossier.client_nom ?? "Sans client";

  let r = 0;

  // En-tête
  setCell(ws, 0, r, `FOURNITURES – ${dossier.titre}`, S.h1);
  addMerge(merges, r, 0, r, LC);
  r++;
  setCell(ws, 0, r, `Client : ${clientStr}   |   Exporté le : ${today}`, S.h1sub);
  addMerge(merges, r, 0, r, LC);
  r++;

  // Ligne vide
  for (let c = 0; c <= LC; c++) setCell(ws, c, r, "", S.blank);
  r++;

  // En-têtes colonnes
  const hdrs: [string, Record<string, unknown>][] = [
    ["Désignation", S.colHdr],
    ["Qté",         S.colHdrR],
    ["PU HT",       S.colHdrR],
    ["Remise %",    S.colHdrR],
    ["Total HT",    S.colHdrR],
  ];
  hdrs.forEach(([h, sty], c) => setCell(ws, c, r, h, sty));
  r++;

  let grandTotal = 0;

  function writeSection(nom: string, sLignes: DevisLigne[]) {
    // Titre section (bleu)
    setCell(ws, 0, r, nom, S.secBlue);
    addMerge(merges, r, 0, r, LC);
    r++;

    let sectionTotal = 0;

    if (sLignes.length === 0) {
      setCell(ws, 0, r, "(aucune ligne)", S.muted);
      addMerge(merges, r, 0, r, LC);
      r++;
    } else {
      sLignes.forEach((l, i) => {
        const total = totalLigne(l);
        sectionTotal += total;
        const alt = i % 2 === 1;
        setCell(ws, 0, r, l.description,                           alt ? S.altCell  : S.cell);
        setCell(ws, 1, r, l.quantite,                              alt ? S.altCellR : S.cellR);
        setCell(ws, 2, r, fmtEur(l.prix_unitaire),                 alt ? S.altCellR : S.cellR);
        setCell(ws, 3, r, l.remise > 0 ? `${l.remise} %` : "—",   alt ? S.altCellR : S.cellR);
        setCell(ws, 4, r, fmtEur(total),                           alt ? S.altCellB : S.cellB);
        r++;
      });
    }

    grandTotal += sectionTotal;

    // Total section (teal)
    setCell(ws, 0, r, `Total ${nom}`, S.teal);
    addMerge(merges, r, 0, r, LC - 1);
    setCell(ws, LC, r, fmtEur(sectionTotal), S.teal);
    r++;
  }

  if (sections.length === 0 && lignes.length === 0) {
    setCell(ws, 0, r, "Aucune fourniture renseignée.", S.muted);
    addMerge(merges, r, 0, r, LC);
    r++;
  } else {
    sections.forEach((sec) => {
      writeSection(sec.nom, lignes.filter((l) => l.section_id === sec.id));
    });
    const orphans = lignes.filter((l) => l.section_id === null);
    if (orphans.length > 0) writeSection("Sans section", orphans);
  }

  // Total global (orange)
  setCell(ws, 0, r, "TOTAL FOURNITURES HT", S.orange);
  addMerge(merges, r, 0, r, LC - 1);
  setCell(ws, LC, r, fmtEur(grandTotal), S.orangeR);

  return finalizeSheet(ws, merges, [42, 8, 14, 10, 14], r, LC, { 0: 24, 1: 18 });
}

// ─── Onglet Prestation ────────────────────────────────────────────────────────

function buildPrestation(
  dossier: DossierWithClient,
  lignes: PrestationLigne[],
  cpNom: string | null,
  cpTjm: number,
  cpPourcentage: number,
): XLSX.WorkSheet {
  const ws: WS = {};
  const merges: XLSX.Range[] = [];
  const LC = 5; // 6 colonnes : 0..5
  const today = new Date().toLocaleDateString("fr-FR");
  const clientStr = dossier.client_nom ?? "Sans client";

  let r = 0;

  // En-tête
  setCell(ws, 0, r, `PRESTATION – ${dossier.titre}`, S.h1);
  addMerge(merges, r, 0, r, LC);
  r++;
  setCell(ws, 0, r, `Client : ${clientStr}   |   Exporté le : ${today}`, S.h1sub);
  addMerge(merges, r, 0, r, LC);
  r++;

  // Ligne vide
  for (let c = 0; c <= LC; c++) setCell(ws, c, r, "", S.blank);
  r++;

  // En-têtes colonnes
  [
    ["Tâche",       S.colHdr],
    ["Description", S.colHdr],
    ["Profil",      S.colHdr],
    ["Jours",       S.colHdrR],
    ["TJM",         S.colHdrR],
    ["Total HT",    S.colHdrR],
  ].forEach(([h, sty], c) =>
    setCell(ws, c, r, h as string, sty as Record<string, unknown>)
  );
  r++;

  // Calcul CP
  const totalJoursPrestation = lignes.reduce((s, l) => s + l.jours, 0);
  const showCp = totalJoursPrestation > 2 && cpNom !== null;
  const cpJours = showCp ? roundHalf(totalJoursPrestation * (cpPourcentage / 100)) : 0;
  const cpTotal = cpJours * cpTjm;

  if (lignes.length === 0 && !showCp) {
    setCell(ws, 0, r, "Aucune ligne de prestation renseignée.", S.muted);
    addMerge(merges, r, 0, r, LC);
    r++;
  } else {
    // Lignes prestation
    lignes.forEach((l, i) => {
      const total = l.jours * l.tjm;
      const alt   = i % 2 === 1;
      setCell(ws, 0, r, l.tache,              alt ? S.altCell  : S.cell);
      setCell(ws, 1, r, l.description ?? "—", alt ? S.altCell  : S.cell);
      setCell(ws, 2, r, l.profil_label || "—",alt ? S.altCell  : S.cell);
      setCell(ws, 3, r, fmtJours(l.jours),    alt ? S.altCellR : S.cellR);
      setCell(ws, 4, r, l.tjm > 0 ? fmtEur(l.tjm) : "—", alt ? S.altCellR : S.cellR);
      setCell(ws, 5, r, fmtEur(total),        alt ? S.altCellB : S.cellB);
      r++;
    });

    // Ligne CDP (violet)
    if (showCp && cpNom) {
      setCell(ws, 0, r, `Pilotage projet · ${cpPourcentage} %`, S.cp);
      setCell(ws, 1, r, "—",                     S.cp);
      setCell(ws, 2, r, cpNom,                   S.cp);
      setCell(ws, 3, r, fmtJours(cpJours),        S.cpR);
      setCell(ws, 4, r, cpTjm > 0 ? fmtEur(cpTjm) : "—", S.cpR);
      setCell(ws, 5, r, fmtEur(cpTotal),          S.cpBR);
      r++;
    }
  }

  // Ligne vide
  for (let c = 0; c <= LC; c++) setCell(ws, c, r, "", S.blank);
  r++;

  // Synthèse par profil
  const profilMap = new Map<string, { jours: number; total: number }>();
  for (const l of lignes) {
    if (!l.profil_label) continue;
    const ex = profilMap.get(l.profil_label);
    if (ex) { ex.jours += l.jours; ex.total += l.jours * l.tjm; }
    else profilMap.set(l.profil_label, { jours: l.jours, total: l.jours * l.tjm });
  }
  if (showCp && cpNom) {
    const ex = profilMap.get(cpNom);
    if (ex) { ex.jours += cpJours; ex.total += cpTotal; }
    else profilMap.set(cpNom, { jours: cpJours, total: cpTotal });
  }
  const profilTotaux = Array.from(profilMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  if (profilTotaux.length > 0) {
    // Titre synthèse (bleu)
    setCell(ws, 0, r, "SYNTHÈSE PAR PROFIL", S.secBlue);
    addMerge(merges, r, 0, r, LC);
    r++;

    profilTotaux.forEach(([label, { jours, total }], i) => {
      const alt = i % 2 === 1;
      setCell(ws, 0, r, label,           alt ? S.altCell  : S.cell);
      setCell(ws, 1, r, "",              alt ? S.altCell  : S.cell);
      setCell(ws, 2, r, "",              alt ? S.altCell  : S.cell);
      setCell(ws, 3, r, fmtJours(jours), alt ? S.altCellR : S.cellR);
      setCell(ws, 4, r, "",              alt ? S.altCellR : S.cellR);
      setCell(ws, 5, r, fmtEur(total),   alt ? S.altCellB : S.cellB);
      r++;
    });
  }

  // Total prestation (orange)
  const totalJours = totalJoursPrestation + (showCp ? cpJours : 0);
  const totalEur   = lignes.reduce((s, l) => s + l.jours * l.tjm, 0) + (showCp ? cpTotal : 0);

  setCell(ws, 0, r, "TOTAL PRESTATION HT", S.orange);
  addMerge(merges, r, 0, r, 2);
  setCell(ws, 3, r, fmtJours(totalJours), S.orangeR);
  setCell(ws, 4, r, "",                   S.orange);
  setCell(ws, 5, r, fmtEur(totalEur),     S.orangeR);

  return finalizeSheet(ws, merges, [30, 30, 22, 10, 14, 14], r, LC, { 0: 24, 1: 18 });
}

// ─── Point d'entrée public ────────────────────────────────────────────────────

export async function exportDevisExcel(
  dossier: DossierWithClient,
  devisId: number,
  fournituresHT: number,
  prestationHT: number,
): Promise<void> {
  // Chemin de sauvegarde
  const dateStr  = new Date().toISOString().slice(0, 10);
  const clientPart = sanitize(dossier.client_nom ?? "SansClient");
  const dossierPart = sanitize(dossier.titre);
  const defaultName = `Propulse_${clientPart}_${dossierPart}_${dateStr}.xlsx`;

  const savePath = await save({
    filters: [{ name: "Classeur Excel", extensions: ["xlsx"] }],
    defaultPath: defaultName,
  });
  if (!savePath) return; // annulé

  // Chargement des données
  const [sections, lignes, prestLignes, cpArticle, cpPct] = await Promise.all([
    getDevisSections(devisId),
    getDevisLignes(devisId),
    getPrestationLignes(devisId),
    getDefaultCpArticle(),
    getDevisCpPourcentage(devisId),
  ]);

  // Marge articles pondérée (confidentiel → Synthèse seulement)
  const lignesAvecMarge = lignes.filter((l) => l.prix_achat > 0 && l.prix_unitaire > 0);
  const margeArticles =
    lignesAvecMarge.length > 0
      ? lignesAvecMarge.reduce((s, l) => s + (margeLigne(l) ?? 0), 0) / lignesAvecMarge.length
      : null;

  // Construction du classeur
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    buildSynthese(dossier, fournituresHT, prestationHT, margeArticles),
    "Synthèse",
  );
  XLSX.utils.book_append_sheet(
    wb,
    buildFournitures(dossier, sections, lignes),
    "Fournitures",
  );
  XLSX.utils.book_append_sheet(
    wb,
    buildPrestation(
      dossier,
      prestLignes,
      cpArticle?.nom ?? null,
      cpArticle?.prix_vente ?? 0,
      cpPct,
    ),
    "Prestation",
  );

  // Écriture en buffer puis sauvegarde via Tauri
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  await writeFile(savePath, new Uint8Array(buf));
}
