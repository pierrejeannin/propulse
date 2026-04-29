import XLSX from "xlsx-js-style";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";
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
  darkBlue: "2C3C4C", // fond titres de section, totaux
  teal:     "1C9A97", // fond en-têtes de colonnes, sous-totaux valeurs
  bgLight:  "ECF8F9", // fond lignes alternées claires, blocs info
  orange:   "FC9B50", // fond cellules valeurs de totaux principaux
  white:    "FFFFFF",
  gray:     "F5F5F5",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type CellStyle = Record<string, unknown>;
type WS = Record<string, unknown>;

function mkCell(v: string | number, s?: CellStyle, z?: string): Record<string, unknown> {
  const t = typeof v === "number" ? "n" : "s";
  const cell: Record<string, unknown> = { v, t };
  if (s) cell.s = s;
  if (z) cell.z = z;
  return cell;
}

function fillSolid(rgb: string) {
  return { patternType: "solid", fgColor: { rgb } };
}

function writeCell(ws: WS, r: number, c: number, cell: Record<string, unknown>) {
  ws[XLSX.utils.encode_cell({ r, c })] = cell;
}

function addMerge(ws: WS, r1: number, c1: number, r2: number, c2: number) {
  if (!ws["!merges"]) ws["!merges"] = [];
  (ws["!merges"] as XLSX.Range[]).push({ s: { r: r1, c: c1 }, e: { r: r2, c: c2 } });
}

function setRowHeight(ws: WS, r: number, hpx: number) {
  if (!ws["!rows"]) ws["!rows"] = [];
  (ws["!rows"] as { hpx?: number }[])[r] = { hpx };
}

function updateRef(ws: WS, maxR: number, maxC: number) {
  ws["!ref"] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxR, c: maxC } });
}

/** Remplit toutes les cellules vides d'une ligne avec un fond. */
function fillRow(ws: WS, r: number, ncols: number, bgRgb: string) {
  for (let c = 0; c < ncols; c++) {
    const addr = XLSX.utils.encode_cell({ r, c });
    if (!ws[addr]) {
      ws[addr] = { v: "", t: "s", s: { fill: fillSolid(bgRgb) } };
    }
  }
}

/** Écrit la cellule principale d'une ligne fusionnée + remplit le reste avec une couleur de fond. */
function writeMergedRow(
  ws: WS,
  r: number,
  ncols: number,
  cell: Record<string, unknown>,
  bgRgb: string,
) {
  writeCell(ws, r, 0, cell);
  for (let c = 1; c < ncols; c++) {
    writeCell(ws, r, c, mkCell("", { fill: fillSolid(bgRgb) }));
  }
  addMerge(ws, r, 0, r, ncols - 1);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sTitreDoc: CellStyle = {
  font:      { bold: true, sz: 20, color: { rgb: C.white } },
  fill:      fillSolid(C.darkBlue),
  alignment: { horizontal: "center", vertical: "center" },
};

const sSousTitre: CellStyle = {
  font:      { italic: true, sz: 12, color: { rgb: C.teal } },
  fill:      fillSolid(C.bgLight),
  alignment: { horizontal: "center", vertical: "center" },
};

const sHdrKey: CellStyle = {
  fill:      fillSolid(C.bgLight),
  font:      { bold: true, sz: 11, color: { rgb: C.darkBlue } },
  alignment: { horizontal: "left", vertical: "center" },
};

const sHdrVal: CellStyle = {
  fill:      fillSolid(C.bgLight),
  font:      { sz: 10, color: { rgb: C.darkBlue } },
  alignment: { horizontal: "left", vertical: "center" },
};

const sSection: CellStyle = {
  fill:      fillSolid(C.darkBlue),
  font:      { bold: true, sz: 11, color: { rgb: C.white } },
  alignment: { horizontal: "left", vertical: "center" },
};

const sColHdrL: CellStyle = {
  fill: fillSolid(C.teal), font: { bold: true, sz: 10, color: { rgb: C.white } },
  alignment: { horizontal: "left", vertical: "center" },
};
const sColHdrC: CellStyle = {
  fill: fillSolid(C.teal), font: { bold: true, sz: 10, color: { rgb: C.white } },
  alignment: { horizontal: "center", vertical: "center" },
};
const sColHdrR: CellStyle = {
  fill: fillSolid(C.teal), font: { bold: true, sz: 10, color: { rgb: C.white } },
  alignment: { horizontal: "right", vertical: "center" },
};

function sDataRow(idx: number) {
  const bg = idx % 2 === 0 ? C.white : C.bgLight;
  return {
    L: { fill: fillSolid(bg), font: { sz: 10, color: { rgb: C.darkBlue } }, alignment: { horizontal: "left",   vertical: "center" } },
    C: { fill: fillSolid(bg), font: { sz: 10, color: { rgb: C.darkBlue } }, alignment: { horizontal: "center", vertical: "center" } },
    R: { fill: fillSolid(bg), font: { sz: 10, color: { rgb: C.darkBlue } }, alignment: { horizontal: "right",  vertical: "center" } },
  };
}

const sSubLbl: CellStyle = {
  fill:      fillSolid(C.bgLight),
  font:      { bold: true, sz: 10, color: { rgb: C.darkBlue } },
  alignment: { horizontal: "right", vertical: "center" },
};

const sSubVal: CellStyle = {
  fill:      fillSolid(C.teal),
  font:      { bold: true, sz: 10, color: { rgb: C.white } },
  alignment: { horizontal: "right", vertical: "center" },
};

const sTotLbl: CellStyle = {
  fill:      fillSolid(C.darkBlue),
  font:      { bold: true, sz: 12, color: { rgb: C.white } },
  alignment: { horizontal: "right", vertical: "center" },
};

const sTotVal: CellStyle = {
  fill:      fillSolid(C.orange),
  font:      { bold: true, sz: 12, color: { rgb: C.white } },
  alignment: { horizontal: "right", vertical: "center" },
};

const sHint: CellStyle = {
  fill:      fillSolid(C.bgLight),
  font:      { italic: true, sz: 9, color: { rgb: C.darkBlue } },
  alignment: { horizontal: "right", vertical: "center" },
};

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtDate(d: string | null): string {
  if (!d) return "—";
  if (d.includes("T") || d.length > 10) return new Date(d).toLocaleDateString("fr-FR");
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
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9-_ ]/g, "")
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
  const NCOLS = 2; // A: libellé · B: valeur
  const totalHT = fournituresHT + prestationHT;
  let row = 0;

  // Titre : nom du client
  writeMergedRow(ws, row, NCOLS, mkCell(dossier.client_nom ?? "Sans client", sTitreDoc), C.darkBlue);
  setRowHeight(ws, row, 36); row++;

  // Sous-titre : nom du projet
  writeMergedRow(ws, row, NCOLS, mkCell(dossier.titre, sSousTitre), C.bgLight);
  setRowHeight(ws, row, 24); row++;

  // Ligne vide
  fillRow(ws, row, NCOLS, C.white); setRowHeight(ws, row, 10); row++;

  // Bloc info
  writeCell(ws, row, 0, mkCell("Date de création", sHdrKey));
  writeCell(ws, row, 1, mkCell(fmtDate(dossier.created_at), sHdrVal));
  setRowHeight(ws, row, 20); row++;

  // Ligne vide
  fillRow(ws, row, NCOLS, C.white); setRowHeight(ws, row, 10); row++;

  // Section récapitulatif financier
  writeMergedRow(ws, row, NCOLS, mkCell("RÉCAPITULATIF FINANCIER", sSection), C.darkBlue);
  setRowHeight(ws, row, 22); row++;

  // En-têtes colonnes
  writeCell(ws, row, 0, mkCell("Poste", sColHdrL));
  writeCell(ws, row, 1, mkCell("Montant HT", sColHdrR));
  setRowHeight(ws, row, 18); row++;

  // Fournitures
  const s0 = sDataRow(0);
  writeCell(ws, row, 0, mkCell("Fournitures", s0.L));
  writeCell(ws, row, 1, mkCell(fournituresHT, s0.R, "#,##0.00 €"));
  setRowHeight(ws, row, 18); row++;

  // Prestation
  const s1 = sDataRow(1);
  writeCell(ws, row, 0, mkCell("Prestation (dont pilotage projet)", s1.L));
  writeCell(ws, row, 1, mkCell(prestationHT, s1.R, "#,##0.00 €"));
  setRowHeight(ws, row, 18); row++;

  // Marge articles (optionnelle, discrète)
  if (margeArticles !== null) {
    const s2 = sDataRow(2);
    writeCell(ws, row, 0, mkCell("Marge articles (estimation)", s2.L));
    writeCell(ws, row, 1, mkCell(`${margeArticles.toFixed(1)} %`, s2.R));
    setRowHeight(ws, row, 18); row++;
  }

  // Total global
  writeCell(ws, row, 0, mkCell("TOTAL GLOBAL HT", sTotLbl));
  writeCell(ws, row, 1, mkCell(totalHT, sTotVal, "#,##0.00 €"));
  setRowHeight(ws, row, 22); row++;

  updateRef(ws, row - 1, NCOLS - 1);
  ws["!cols"] = [44, 22].map((w) => ({ wch: w }));

  return ws as XLSX.WorkSheet;
}

// ─── Onglet Fournitures ───────────────────────────────────────────────────────

function buildFournitures(
  dossier: DossierWithClient,
  sections: DevisSection[],
  lignes: DevisLigne[],
): XLSX.WorkSheet {
  const ws: WS = {};
  const NCOLS = 5; // Désignation · Qté · PU HT · Remise % · Total HT
  let row = 0;
  let dataIdx = 0; // compteur global pour alternance cross-sections

  // Titre
  writeMergedRow(ws, row, NCOLS, mkCell(dossier.client_nom ?? "Sans client", sTitreDoc), C.darkBlue);
  setRowHeight(ws, row, 36); row++;

  // Sous-titre
  writeMergedRow(ws, row, NCOLS, mkCell(`${dossier.titre}  ·  Fournitures`, sSousTitre), C.bgLight);
  setRowHeight(ws, row, 24); row++;

  let grandTotal = 0;

  function writeSection(nom: string, sLignes: DevisLigne[]) {
    // Ligne vide avant section
    fillRow(ws, row, NCOLS, C.white); setRowHeight(ws, row, 8); row++;

    // Titre de section
    writeMergedRow(ws, row, NCOLS, mkCell(nom, sSection), C.darkBlue);
    setRowHeight(ws, row, 22); row++;

    // En-têtes colonnes
    (["Désignation", "Qté", "PU HT", "Remise %", "Total HT"] as const).forEach((h, c) => {
      const sty = c === 0 ? sColHdrL : c === 1 ? sColHdrC : sColHdrR;
      writeCell(ws, row, c, mkCell(h, sty));
    });
    setRowHeight(ws, row, 18); row++;

    let sectionTotal = 0;

    if (sLignes.length === 0) {
      writeMergedRow(ws, row, NCOLS, mkCell("(aucune ligne)", sHint), C.bgLight);
      setRowHeight(ws, row, 18); row++;
    } else {
      sLignes.forEach((l) => {
        const total = totalLigne(l);
        sectionTotal += total;
        const s = sDataRow(dataIdx++);
        writeCell(ws, row, 0, mkCell(l.description, s.L));
        writeCell(ws, row, 1, mkCell(l.quantite, s.C));
        writeCell(ws, row, 2, mkCell(l.prix_unitaire, s.R, "#,##0.00 €"));
        writeCell(ws, row, 3, mkCell(l.remise > 0 ? `${l.remise} %` : "—", s.C));
        writeCell(ws, row, 4, mkCell(total, s.R, "#,##0.00 €"));
        setRowHeight(ws, row, 18); row++;
      });
    }

    grandTotal += sectionTotal;

    // Sous-total section
    writeCell(ws, row, 0, mkCell(`Sous-total ${nom}`, sSubLbl));
    for (let c = 1; c < NCOLS - 1; c++) writeCell(ws, row, c, mkCell("", sSubLbl));
    addMerge(ws, row, 0, row, NCOLS - 2);
    writeCell(ws, row, NCOLS - 1, mkCell(sectionTotal, sSubVal, "#,##0.00 €"));
    setRowHeight(ws, row, 20); row++;
  }

  if (sections.length === 0 && lignes.length === 0) {
    fillRow(ws, row, NCOLS, C.white); setRowHeight(ws, row, 10); row++;
    writeMergedRow(ws, row, NCOLS, mkCell("Aucune fourniture renseignée.", sHint), C.bgLight);
    setRowHeight(ws, row, 18); row++;
  } else {
    sections.forEach((sec) =>
      writeSection(sec.nom, lignes.filter((l) => l.section_id === sec.id))
    );
    const orphans = lignes.filter((l) => l.section_id === null);
    if (orphans.length > 0) writeSection("Sans section", orphans);
  }

  // Ligne vide
  fillRow(ws, row, NCOLS, C.white); setRowHeight(ws, row, 10); row++;

  // Total global
  writeCell(ws, row, 0, mkCell("TOTAL FOURNITURES HT", sTotLbl));
  for (let c = 1; c < NCOLS - 1; c++) writeCell(ws, row, c, mkCell("", sTotLbl));
  addMerge(ws, row, 0, row, NCOLS - 2);
  writeCell(ws, row, NCOLS - 1, mkCell(grandTotal, sTotVal, "#,##0.00 €"));
  setRowHeight(ws, row, 22); row++;

  updateRef(ws, row - 1, NCOLS - 1);
  ws["!cols"] = [44, 8, 14, 10, 16].map((w) => ({ wch: w }));

  return ws as XLSX.WorkSheet;
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
  const NCOLS = 6; // Tâche · Description · Profil · Jours · TJM · Total HT
  let row = 0;

  // Titre
  writeMergedRow(ws, row, NCOLS, mkCell(dossier.client_nom ?? "Sans client", sTitreDoc), C.darkBlue);
  setRowHeight(ws, row, 36); row++;

  // Sous-titre
  writeMergedRow(ws, row, NCOLS, mkCell(`${dossier.titre}  ·  Prestation`, sSousTitre), C.bgLight);
  setRowHeight(ws, row, 24); row++;

  // Calcul pilotage projet (CP)
  const totalJoursPrestation = lignes.reduce((s, l) => s + l.jours, 0);
  const showCp = totalJoursPrestation > 2 && cpNom !== null;
  const cpJours = showCp ? roundHalf(totalJoursPrestation * (cpPourcentage / 100)) : 0;
  const cpTotal = cpJours * cpTjm;

  // Ligne vide
  fillRow(ws, row, NCOLS, C.white); setRowHeight(ws, row, 8); row++;

  // Section lignes de prestation
  writeMergedRow(ws, row, NCOLS, mkCell("LIGNES DE PRESTATION", sSection), C.darkBlue);
  setRowHeight(ws, row, 22); row++;

  // En-têtes colonnes
  (["Tâche", "Description", "Profil", "Jours", "TJM", "Total HT"] as const).forEach((h, c) => {
    const sty = c < 3 ? sColHdrL : sColHdrR;
    writeCell(ws, row, c, mkCell(h, sty));
  });
  setRowHeight(ws, row, 18); row++;

  if (lignes.length === 0 && !showCp) {
    writeMergedRow(ws, row, NCOLS, mkCell("Aucune ligne de prestation renseignée.", sHint), C.bgLight);
    setRowHeight(ws, row, 18); row++;
  } else {
    lignes.forEach((l, i) => {
      const total = l.jours * l.tjm;
      const s = sDataRow(i);
      writeCell(ws, row, 0, mkCell(l.tache, s.L));
      writeCell(ws, row, 1, mkCell(l.description ?? "—", s.L));
      writeCell(ws, row, 2, mkCell(l.profil_label || "—", s.L));
      writeCell(ws, row, 3, mkCell(fmtJours(l.jours), s.R));
      writeCell(ws, row, 4, mkCell(l.tjm > 0 ? l.tjm : 0, s.R, l.tjm > 0 ? "#,##0.00 €" : undefined));
      writeCell(ws, row, 5, mkCell(total, s.R, "#,##0.00 €"));
      setRowHeight(ws, row, 18); row++;
    });

    // Ligne pilotage projet (CP)
    if (showCp && cpNom) {
      const sCp: CellStyle = {
        fill:      fillSolid(C.bgLight),
        font:      { italic: true, sz: 10, color: { rgb: C.teal } },
        alignment: { horizontal: "left", vertical: "center" },
      };
      const sCpR: CellStyle = { ...sCp, alignment: { horizontal: "right", vertical: "center" } };
      writeCell(ws, row, 0, mkCell("Pilotage projet", sCp));
      writeCell(ws, row, 1, mkCell("—", sCp));
      writeCell(ws, row, 2, mkCell(cpNom, sCp));
      writeCell(ws, row, 3, mkCell(fmtJours(cpJours), sCpR));
      writeCell(ws, row, 4, mkCell(cpTjm > 0 ? cpTjm : 0, sCpR, cpTjm > 0 ? "#,##0.00 €" : undefined));
      writeCell(ws, row, 5, mkCell(cpTotal, sCpR, "#,##0.00 €"));
      setRowHeight(ws, row, 18); row++;
    }
  }

  // ── Synthèse par profil ──
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
    // Ligne vide
    fillRow(ws, row, NCOLS, C.white); setRowHeight(ws, row, 8); row++;

    // Section synthèse par profil
    writeMergedRow(ws, row, NCOLS, mkCell("SYNTHÈSE PAR PROFIL", sSection), C.darkBlue);
    setRowHeight(ws, row, 22); row++;

    // En-têtes
    (["Profil", "", "", "Jours", "", "Total HT"] as const).forEach((h, c) => {
      const sty = c < 3 ? sColHdrL : sColHdrR;
      writeCell(ws, row, c, mkCell(h, sty));
    });
    setRowHeight(ws, row, 18); row++;

    profilTotaux.forEach(([label, { jours, total }], i) => {
      const s = sDataRow(i);
      writeCell(ws, row, 0, mkCell(label, s.L));
      writeCell(ws, row, 1, mkCell("", s.L));
      writeCell(ws, row, 2, mkCell("", s.L));
      writeCell(ws, row, 3, mkCell(fmtJours(jours), s.R));
      writeCell(ws, row, 4, mkCell("", s.R));
      writeCell(ws, row, 5, mkCell(total, s.R, "#,##0.00 €"));
      setRowHeight(ws, row, 18); row++;
    });
  }

  // Ligne vide
  fillRow(ws, row, NCOLS, C.white); setRowHeight(ws, row, 10); row++;

  // Total prestation
  const totalJours = totalJoursPrestation + (showCp ? cpJours : 0);
  const totalEur = lignes.reduce((s, l) => s + l.jours * l.tjm, 0) + (showCp ? cpTotal : 0);

  writeCell(ws, row, 0, mkCell("TOTAL PRESTATION HT", sTotLbl));
  for (let c = 1; c < NCOLS - 1; c++) writeCell(ws, row, c, mkCell("", sTotLbl));
  addMerge(ws, row, 0, row, NCOLS - 2);
  writeCell(ws, row, NCOLS - 1, mkCell(totalEur, sTotVal, "#,##0.00 €"));
  setRowHeight(ws, row, 22); row++;

  // Mention jours totaux
  writeMergedRow(ws, row, NCOLS, mkCell(`Total : ${fmtJours(totalJours)}`, sHint), C.bgLight);
  setRowHeight(ws, row, 16); row++;

  updateRef(ws, row - 1, NCOLS - 1);
  ws["!cols"] = [28, 30, 22, 10, 14, 16].map((w) => ({ wch: w }));

  return ws as XLSX.WorkSheet;
}

// ─── Point d'entrée public ────────────────────────────────────────────────────

export async function exportDevisExcel(
  dossier: DossierWithClient,
  devisId: number,
  fournituresHT: number,
  prestationHT: number,
): Promise<void> {
  const dateStr = new Date().toISOString().slice(0, 10);
  const clientPart = sanitize(dossier.client_nom ?? "SansClient");
  const dossierPart = sanitize(dossier.titre);
  const defaultName = `Propulse_${clientPart}_${dossierPart}_${dateStr}.xlsx`;

  const savePath = await save({
    filters: [{ name: "Classeur Excel", extensions: ["xlsx"] }],
    defaultPath: defaultName,
  });
  if (!savePath) return;

  const [sections, lignes, prestLignes, cpArticle, cpPct] = await Promise.all([
    getDevisSections(devisId),
    getDevisLignes(devisId),
    getPrestationLignes(devisId),
    getDefaultCpArticle(),
    getDevisCpPourcentage(devisId),
  ]);

  const lignesAvecMarge = lignes.filter((l) => l.prix_achat > 0 && l.prix_unitaire > 0);
  const margeArticles =
    lignesAvecMarge.length > 0
      ? lignesAvecMarge.reduce((s, l) => s + (margeLigne(l) ?? 0), 0) / lignesAvecMarge.length
      : null;

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
    buildPrestation(dossier, prestLignes, cpArticle?.nom ?? null, cpArticle?.prix_vente ?? 0, cpPct),
    "Prestation",
  );

  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  await writeFile(savePath, new Uint8Array(buf));
  await openPath(savePath);
}
