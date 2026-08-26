"use client";

import { InstitutionalShell } from "@/components/layout/InstitutionalShell";
import { LegalDocument } from "@/components/institutional/LegalDocument";
import { useI18n } from "@/components/providers/I18nProvider";

export default function RightsPage() {
  const { locale } = useI18n();
  const sections = locale === "fr" ? [
    { title: "Œuvres, enregistrements & données protégés", content: <p>Les compositions, arrangements, paroles, enregistrements master, métadonnées, pochettes, photographies, marques, textes, sélections éditoriales et bases de données accessibles via Parigo restent la propriété de PARIGO ou de leurs titulaires respectifs. Les prestataires techniques en assurent l’infrastructure de distribution sans devenir titulaires de ces droits.</p> },
    { title: "Aucune licence implicite", content: <><p>La consultation du site, l’écoute d’un extrait, le partage d’une sélection, un téléchargement autorisé ou la création d’une cue sheet n’emportent aucune cession ni licence implicite.</p><p>Sauf autorisation écrite, PARIGO et les titulaires concernés réservent expressément tous droits de reproduction, représentation, adaptation, synchronisation, mise à disposition, extraction et réutilisation, y compris pour la fouille de textes et de données dans la mesure permise par la loi.</p></> },
    { title: "Systèmes automatisés & IA", content: <p>Les contenus ne peuvent pas être aspirés ou utilisés pour constituer ou enrichir un jeu de données, entraîner, tester, évaluer ou alimenter un modèle génératif, un système de reconnaissance musicale ou tout autre dispositif automatisé sans accord préalable écrit.</p> },
    { title: "Demander une autorisation", content: <p>Toute autorisation doit identifier les œuvres ou données concernées et définir les finalités, supports, territoires, durée, formats, modalités de diffusion et contreparties. Pour une licence, une recherche, un partenariat de données ou toute réutilisation : <a href="mailto:info@parigomusic.com">info@parigomusic.com</a>.</p> },
  ] : [
    { title: "Protected works, recordings & data", content: <p>Compositions, arrangements, lyrics, master recordings, metadata, artwork, photographs, trademarks, copy, editorial selections and databases available through Parigo remain the property of PARIGO or their respective rights holders. Technical providers supply the distribution infrastructure without acquiring those rights.</p> },
    { title: "No implied licence", content: <><p>Viewing the website, listening to a preview, sharing a selection, making an authorised download or creating a cue sheet grants no assignment or implied licence.</p><p>Unless authorised in writing, PARIGO and the relevant rights holders expressly reserve all reproduction, communication, adaptation, synchronisation, making-available, extraction and reuse rights, including text and data mining where the law allows such reservation.</p></> },
    { title: "Automated systems & AI", content: <p>Content may not be scraped or used to build or enrich a dataset, train, test, evaluate or supply a generative model, music-recognition system or other automated system without prior written agreement.</p> },
    { title: "Request permission", content: <p>Every permission must identify the relevant works or data and define purposes, media, territories, term, formats, transmission conditions and consideration. For licensing, search, data partnerships or any reuse: <a href="mailto:info@parigomusic.com">info@parigomusic.com</a>.</p> },
  ];
  return <InstitutionalShell title={locale === "fr" ? "Réservation des droits" : "Reservation of rights"} intro={locale === "fr" ? "Les œuvres sont faites pour circuler avec une autorisation claire, pas pour être absorbées sans consentement. Dernière mise à jour : 7 août 2026." : "Works are made to circulate with clear permission, not to be absorbed without consent. Last updated: 7 August 2026."}><LegalDocument sections={sections} /></InstitutionalShell>;
}
