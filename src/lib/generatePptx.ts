/**
 * Génération de présentation PowerPoint via manipulation ZIP (JSZip)
 * en utilisant le template Foliateam comme base (layouts natifs).
 *
 * Layouts utilisés :
 *  - slideLayout1.xml  → "First"     (couverture)
 *  - slideLayout3.xml  → "2_Type1"   (contenu texte)
 *  - slideLayout5.xml  → "Type2"     (image + texte, schémas)
 */

import JSZip from "jszip";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile, readFile } from "@tauri-apps/plugin-fs";
import { openPath } from "@tauri-apps/plugin-opener";
import {
  getCompteRenduById,
  getOrCreateDevis,
  getDevisLignes,
  getDevisSections,
  getPrestationLignes,
  getSchemas,
  getBibliothequeSlide,
} from "./queries";
import type { DossierWithClient, PresentationBloc } from "./types";
import { totalLigne } from "./types";

// ─── Constantes layout ────────────────────────────────────────────────────────

const LAYOUT_FIRST  = "../slideLayouts/slideLayout1.xml"; // couverture
const LAYOUT_2TYPE1 = "../slideLayouts/slideLayout3.xml"; // texte
const LAYOUT_TYPE2  = "../slideLayouts/slideLayout5.xml"; // image

// Namespaces XML
const SLD_NS =
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';

const RELS_NS =
  'xmlns="http://schemas.openxmlformats.org/package/2006/relationships"';

const CT_SLIDE =
  "application/vnd.openxmlformats-officedocument.presentationml.slide+xml";
const REL_SLIDE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide";
const REL_LAYOUT =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout";
const REL_IMAGE =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";

// ─── Nettoyage HTML (TipTap → texte brut) ────────────────────────────────────

function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/li>/gi, "")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── Helpers XML ──────────────────────────────────────────────────────────────

/** Échappe les caractères spéciaux XML. */
function xe(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Une ligne de texte → `<a:p>`. */
function xmlLine(text: string, bold?: boolean): string {
  if (!text.trim()) return '<a:p><a:endParaRPr lang="fr-FR"/></a:p>';
  const rPr = bold
    ? '<a:rPr lang="fr-FR" b="1"/>'
    : '<a:rPr lang="fr-FR"/>';
  return `<a:p><a:r>${rPr}<a:t>${xe(text)}</a:t></a:r></a:p>`;
}

/** Texte multiligne → suite de `<a:p>`. */
function xmlText(text: string, bold?: boolean): string {
  const lines = text.split("\n");
  if (!lines.some((l) => l.trim()))
    return '<a:p><a:endParaRPr lang="fr-FR"/></a:p>';
  return lines.map((l) => xmlLine(l, bold)).join("");
}

/** Shape placeholder standard. */
function phSp(
  id: number,
  name: string,
  phAttrs: string,
  paragraphs: string
): string {
  return (
    `<p:sp>` +
    `<p:nvSpPr>` +
    `<p:cNvPr id="${id}" name="${xe(name)}"/>` +
    `<p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>` +
    `<p:nvPr><p:ph ${phAttrs}/></p:nvPr>` +
    `</p:nvSpPr>` +
    `<p:spPr/>` +
    `<p:txBody><a:bodyPr/><a:lstStyle/>${paragraphs}</p:txBody>` +
    `</p:sp>`
  );
}

/** En-tête du spTree (requis dans toute slide). */
const GRP_HEADER =
  '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>' +
  '<p:grpSpPr><a:xfrm>' +
  '<a:off x="0" y="0"/><a:ext cx="0" cy="0"/>' +
  '<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/>' +
  "</a:xfrm></p:grpSpPr>";

/** Enveloppe XML d'une slide. */
function wrapSlide(body: string): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<p:sld ${SLD_NS}>` +
    `<p:cSld><p:spTree>${GRP_HEADER}${body}</p:spTree></p:cSld>` +
    `<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>` +
    `</p:sld>`
  );
}

/** Fichier .rels d'une slide. */
function slideRels(layoutTarget: string, extra = ""): string {
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships ${RELS_NS}>` +
    `<Relationship Id="rId1" Type="${REL_LAYOUT}" Target="${layoutTarget}"/>` +
    extra +
    `</Relationships>`
  );
}

// ─── Helpers formatage ────────────────────────────────────────────────────────

function todayFr(): string {
  return new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatEur(v: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v);
}

// ─── Constructeurs de slides ──────────────────────────────────────────────────

interface SlideResult {
  xml: string;
  rels: string;
  media?: { path: string; data: Uint8Array }; // fichier image éventuel
}

/** Slide de couverture (layout "First"). */
function makeCoverSlide(dossier: DossierWithClient): SlideResult {
  const title = phSp(2, "Titre", 'type="title"', xmlLine(dossier.titre));
  const client = phSp(
    3,
    "Corps10",
    'type="body" sz="quarter" idx="10"',
    xmlLine(dossier.client_nom ?? "")
  );
  const date = phSp(
    4,
    "Corps11",
    'type="body" sz="quarter" idx="11"',
    xmlLine(todayFr())
  );
  return { xml: wrapSlide(title + client + date), rels: slideRels(LAYOUT_FIRST) };
}

/** Slide de contenu texte (layout "2_Type1"). */
function makeContentSlide(
  title: string,
  subtitle: string,
  body: string
): SlideResult {
  const titleSp = phSp(2, "Titre", 'type="title"', xmlLine(title));
  const subSp = phSp(
    3,
    "SousTitre",
    'type="body" sz="quarter" idx="14"',
    xmlLine(subtitle)
  );
  const bodySp = phSp(
    4,
    "Corps",
    'type="body" sz="quarter" idx="13"',
    xmlText(body)
  );
  return {
    xml: wrapSlide(titleSp + subSp + bodySp),
    rels: slideRels(LAYOUT_2TYPE1),
  };
}

/** Slide image (layout "Type2" avec placeholder image côté droit). */
function makeImageSlide(
  title: string,
  subtitle: string,
  imgBytes: Uint8Array,
  mediaPath: string // chemin relatif dans ppt/media/
): SlideResult {
  const titleSp = phSp(2, "Titre", 'type="title"', xmlLine(title));
  const subSp = phSp(
    3,
    "SousTitre",
    'type="body" sz="quarter" idx="14"',
    xmlLine(subtitle)
  );

  // Image positionnée dans la zone droite du layout Type2 (idx=15, x≈6096000)
  // On utilise un <p:pic> libre couvrant toute la surface corps
  // off=(900000,1080001) ext=(10728000,5220000) — pleine zone de contenu
  const pic =
    `<p:pic>` +
    `<p:nvPicPr>` +
    `<p:cNvPr id="5" name="Schema"/>` +
    `<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>` +
    `<p:nvPr/>` +
    `</p:nvPicPr>` +
    `<p:blipFill>` +
    `<a:blip r:embed="rId2"/>` +
    `<a:stretch><a:fillRect/></a:stretch>` +
    `</p:blipFill>` +
    `<p:spPr>` +
    `<a:xfrm><a:off x="900000" y="1080001"/><a:ext cx="10728000" cy="5220000"/></a:xfrm>` +
    `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>` +
    `</p:spPr>` +
    `</p:pic>`;

  const imgRel = `<Relationship Id="rId2" Type="${REL_IMAGE}" Target="../media/${mediaPath}"/>`;

  return {
    xml: wrapSlide(titleSp + subSp + pic),
    rels: slideRels(LAYOUT_TYPE2, imgRel),
    media: { path: `ppt/media/${mediaPath}`, data: imgBytes },
  };
}

// ─── Génération principale ────────────────────────────────────────────────────

export async function generatePresentation(
  dossier: DossierWithClient,
  blocs: PresentationBloc[]
): Promise<void> {
  // ── 1. Chargement du template ───────────────────────────────────────────
  const resp = await fetch("/Template_powerpoint.pptx");
  if (!resp.ok) throw new Error("Template PPTX introuvable (public/Template_powerpoint.pptx)");
  const templateBuf = await resp.arrayBuffer();
  const zip = await JSZip.loadAsync(templateBuf);

  // ── 2. Suppression des slides template (slide1 + slide2) ───────────────
  const OLD_SLIDES = ["ppt/slides/slide1.xml", "ppt/slides/slide2.xml"];
  const OLD_RELS = [
    "ppt/slides/_rels/slide1.xml.rels",
    "ppt/slides/_rels/slide2.xml.rels",
  ];
  [...OLD_SLIDES, ...OLD_RELS].forEach((f) => zip.remove(f));

  // ── 3. Génération des nouvelles slides ─────────────────────────────────
  const sorted = [...blocs].sort((a, b) => a.ordre - b.ordre);
  const generated: { zipPath: string; id: number }[] = [];

  let slideIdx = 1;
  let mediaIdx = 1;
  // Suivi des extensions médias ajoutées (pour Content_Types)
  const hasMedia = { png: false, jpg: false };

  for (const bloc of sorted) {
    let result: SlideResult | null = null;

    try {
      switch (bloc.type) {
        // ── Page de garde ──────────────────────────────────────────────
        case "page_garde": {
          result = makeCoverSlide(dossier);
          break;
        }

        // ── Compte-rendu ───────────────────────────────────────────────
        case "compte_rendu": {
          if (!bloc.reference_id) continue;
          const cr = await getCompteRenduById(bloc.reference_id);
          if (!cr) continue;

          const lines: string[] = [
            `Date : ${cr.date_rdv}`,
            `Participants : ${cr.participants ?? "—"}`,
          ];

          const contexte = stripHtml(cr.contexte_existant);
          if (contexte) {
            lines.push("", "Contexte :");
            contexte.split("\n").filter(Boolean).forEach((l) => lines.push("  " + l));
          }

          const besoins = stripHtml(cr.besoins_exprimes);
          if (besoins) {
            lines.push("", "Besoins exprimés :");
            besoins.split("\n").filter(Boolean).forEach((l) => lines.push("  " + l));
          }

          const metriques = stripHtml(cr.metriques_cles);
          if (metriques) {
            lines.push("", "Métriques clés :");
            metriques.split("\n").filter(Boolean).forEach((l) => lines.push("  " + l));
          }

          const pistes = stripHtml(cr.pistes_solution);
          if (pistes) {
            lines.push("", "Pistes de solution :");
            pistes.split("\n").filter(Boolean).forEach((l) => lines.push("  " + l));
          }

          const actions = stripHtml(cr.actions_next_steps);
          if (actions) {
            lines.push("", "Actions / Next Steps :");
            actions.split("\n").filter(Boolean).forEach((l) => lines.push("  → " + l));
          }

          result = makeContentSlide(
            cr.titre,
            `Compte-rendu du ${cr.date_rdv}`,
            lines.join("\n")
          );
          break;
        }

        // ── Chiffrage ──────────────────────────────────────────────────
        case "chiffrage": {
          const devis = await getOrCreateDevis(dossier.id);
          const [sections, lignes, prestation] = await Promise.all([
            getDevisSections(devis.id),
            getDevisLignes(devis.id),
            getPrestationLignes(devis.id),
          ]);

          const lines: string[] = [];
          let totalFournitures = 0;

          for (const section of sections) {
            const sLignes = lignes.filter((l) => l.section_id === section.id);
            if (!sLignes.length) continue;
            const sTotal = sLignes.reduce((sum, l) => sum + totalLigne(l), 0);
            totalFournitures += sTotal;
            lines.push(section.nom);
            sLignes.forEach((l) =>
              lines.push(`  ${l.description}   ${formatEur(totalLigne(l))}`)
            );
          }

          const totalPrestation = prestation.reduce(
            (sum, l) => sum + l.tjm * l.jours,
            0
          );

          lines.push(
            "",
            `Fournitures HT   ${formatEur(totalFournitures)}`,
            `Prestation HT    ${formatEur(totalPrestation)}`,
            "",
            `TOTAL HT         ${formatEur(totalFournitures + totalPrestation)}`
          );

          result = makeContentSlide("Chiffrage", dossier.titre, lines.join("\n"));
          break;
        }

        // ── Schéma d'architecture ──────────────────────────────────────
        case "schema": {
          if (!bloc.reference_id) continue;
          const schemas = await getSchemas(dossier.id);
          const schema = schemas.find((s) => s.id === bloc.reference_id);
          if (!schema) continue;

          if (schema.type === "SVG") {
            // SVG non supporté dans PPTX → slide d'avertissement
            result = makeContentSlide(
              schema.nom,
              "Schéma (format SVG)",
              [
                `Schéma SVG : ${schema.nom}`,
                "",
                "Ce format ne peut pas être intégré automatiquement dans la présentation.",
                "→ Veuillez insérer ce schéma manuellement.",
                "",
                `Fichier source : ${schema.chemin_fichier}`,
              ].join("\n")
            );
          } else {
            const imgBytes = await readFile(schema.chemin_fichier);
            const ext = schema.type === "JPEG" ? "jpg" : "png";
            if (ext === "jpg") hasMedia.jpg = true;
            else hasMedia.png = true;
            const mediaFile = `slide${slideIdx}_img${mediaIdx}.${ext}`;
            mediaIdx++;
            result = makeImageSlide(schema.nom, schema.type, imgBytes, mediaFile);
          }
          break;
        }

        // ── Slide bibliothèque ─────────────────────────────────────────
        case "bibliotheque": {
          if (!bloc.reference_id) continue;
          const bs = await getBibliothequeSlide(bloc.reference_id);
          if (!bs) continue;
          const tags = (JSON.parse(bs.tags || "[]") as string[]).join(", ");
          const body = [
            "Ce slide est géré manuellement depuis la bibliothèque.",
            "",
            `Fichier : ${bs.fichier_path}`,
            ...(tags ? [`Tags : ${tags}`] : []),
          ].join("\n");
          result = makeContentSlide(bs.nom, "Bibliothèque de slides", body);
          break;
        }
      }
    } catch (e) {
      console.error(`[generatePptx] Erreur bloc ${bloc.type} #${bloc.reference_id}:`, e);
    }

    if (!result) continue;

    const slideZipPath = `ppt/slides/slide${slideIdx}.xml`;
    const relsZipPath = `ppt/slides/_rels/slide${slideIdx}.xml.rels`;

    zip.file(slideZipPath, result.xml);
    zip.file(relsZipPath, result.rels);
    if (result.media) {
      zip.file(result.media.path, result.media.data);
    }

    generated.push({ zipPath: slideZipPath, id: 256 + slideIdx });
    slideIdx++;
  }

  // ── 4. Mise à jour de presentation.xml (<p:sldIdLst>) ──────────────────
  const presXmlOrig = await zip.file("ppt/presentation.xml")!.async("text");

  // rIds pour les slides : on commence à rId10 pour ne pas collisionner
  const newSldIdLst = generated
    .map((s, i) => `<p:sldId id="${s.id}" r:id="rId${i + 10}"/>`)
    .join("");

  // Flag /s (dotAll) : traverse les sauts de ligne dans sldIdLst multiligne
  const presXmlUpdated = presXmlOrig.replace(
    /<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/,
    `<p:sldIdLst>${newSldIdLst}</p:sldIdLst>`
  );
  zip.file("ppt/presentation.xml", presXmlUpdated);

  // ── 5. Mise à jour de presentation.xml.rels ────────────────────────────
  const presRelsOrig = await zip
    .file("ppt/_rels/presentation.xml.rels")!
    .async("text");

  // Supprimer les anciennes relations de type "slide"
  const presRelsClean = presRelsOrig.replace(
    /<Relationship[^>]*Target="slides\/slide\d+\.xml"[^>]*\/>/g,
    ""
  );

  // Ajouter les nouvelles
  const newSlideRels = generated
    .map((s, i) => {
      const target = s.zipPath.replace("ppt/", "");
      return `<Relationship Id="rId${i + 10}" Type="${REL_SLIDE}" Target="${target}"/>`;
    })
    .join("");

  const presRelsUpdated = presRelsClean.replace(
    "</Relationships>",
    newSlideRels + "</Relationships>"
  );
  zip.file("ppt/_rels/presentation.xml.rels", presRelsUpdated);

  // ── 6. Mise à jour de [Content_Types].xml ─────────────────────────────
  const ctOrig = await zip.file("[Content_Types].xml")!.async("text");

  // Supprimer les anciennes Override de slides
  // Note : [^>]*\/> utilise le backtracking pour éviter que [^/]* stoppe
  //        au premier '/' du ContentType (application/vnd.openxmlformats...)
  const ctClean = ctOrig.replace(
    /<Override PartName="\/ppt\/slides\/slide\d+\.xml"[^>]*\/>/g,
    ""
  );

  // Nouvelles Override pour les slides générées
  const newSlideOverrides = generated
    .map((s) => {
      const part = "/" + s.zipPath; // "/ppt/slides/slideN.xml"
      return `<Override PartName="${part}" ContentType="${CT_SLIDE}"/>`;
    })
    .join("");

  // Ajouter les Default manquants pour les extensions médias utilisées
  const mediaDefaults: string[] = [];
  if (hasMedia.png && !ctClean.includes('Extension="png"')) {
    mediaDefaults.push('<Default Extension="png" ContentType="image/png"/>');
  }
  if (hasMedia.jpg && !ctClean.includes('Extension="jpg"')) {
    mediaDefaults.push('<Default Extension="jpg" ContentType="image/jpeg"/>');
  }

  const ctUpdated = ctClean.replace(
    "</Types>",
    mediaDefaults.join("") + newSlideOverrides + "</Types>"
  );
  zip.file("[Content_Types].xml", ctUpdated);

  // ── 7. Sauvegarde ──────────────────────────────────────────────────────
  const clientSlug = (dossier.client_nom ?? "Propulse")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .slice(0, 20);
  const dossierSlug = dossier.titre.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
  const dateStr = new Date().toISOString().slice(0, 10);
  const defaultName = `Propulse_${clientSlug}_${dossierSlug}_${dateStr}.pptx`;

  const path = await save({
    defaultPath: defaultName,
    filters: [{ name: "PowerPoint", extensions: ["pptx"] }],
  });
  if (!path) return;

  const buf = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  await writeFile(path, buf);

  // Ouverture automatique avec l'application par défaut
  await openPath(path);
}
