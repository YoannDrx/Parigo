"use client";

import { InstitutionalShell } from "@/components/layout/InstitutionalShell";
import { LegalDocument } from "@/components/institutional/LegalDocument";
import { useI18n } from "@/components/providers/I18nProvider";

export default function RightsPage() {
  const { locale } = useI18n();
  const sections = locale === "fr" ? [
    { title: "Œuvres et données protégées", content: <p>Les compositions, enregistrements, paroles, métadonnées, pochettes, photographies, sélections éditoriales et bases de données accessibles via Parigo restent la propriété de leurs titulaires de droits.</p> },
    { title: "Réservation expresse", content: <p>Sauf autorisation écrite, PARIGO et les titulaires concernés réservent tous droits de reproduction, représentation, adaptation, extraction et réutilisation, y compris pour la fouille de textes et de données dans la mesure où la loi permet une telle réservation.</p> },
    { title: "Systèmes automatisés & IA", content: <p>Les contenus ne peuvent pas être utilisés pour constituer un jeu de données, entraîner, tester ou alimenter un modèle génératif ou un système de reconnaissance musicale sans accord préalable définissant les œuvres, usages, durées et contreparties.</p> },
    { title: "Demander une autorisation", content: <p>Pour une licence, une recherche, un partenariat de données ou toute réutilisation : <a href="mailto:info@parigomusic.com">info@parigomusic.com</a>.</p> },
  ] : [
    { title: "Protected works and data", content: <p>Compositions, recordings, lyrics, metadata, artwork, photographs, editorial selections and databases available through Parigo remain the property of their rights holders.</p> },
    { title: "Express reservation", content: <p>Unless authorised in writing, PARIGO and the relevant rights holders reserve all rights of reproduction, communication, adaptation, extraction and reuse, including text and data mining where the law allows such reservation.</p> },
    { title: "Automated systems & AI", content: <p>Content may not be used to build a dataset, train, test or supply a generative model or music-recognition system without prior agreement defining works, uses, term and consideration.</p> },
    { title: "Request permission", content: <p>For licensing, search, data partnerships or any reuse: <a href="mailto:info@parigomusic.com">info@parigomusic.com</a>.</p> },
  ];
  return <InstitutionalShell eyebrow={locale === "fr" ? "Propriété intellectuelle" : "Intellectual property"} title={locale === "fr" ? "Réservation des droits" : "Reservation of rights"} intro={locale === "fr" ? "Les œuvres sont faites pour circuler avec une autorisation claire, pas pour être absorbées sans consentement." : "Works are made to circulate with clear permission, not to be absorbed without consent."}><LegalDocument sections={sections} /></InstitutionalShell>;
}
