"use client";

import { InstitutionalShell } from "@/components/layout/InstitutionalShell";
import { LegalDocument } from "@/components/institutional/LegalDocument";
import { useI18n } from "@/components/providers/I18nProvider";

export default function LegalPage() {
  const { locale } = useI18n();
  const sections = locale === "fr" ? [
    { title: "Éditeur du site", content: <><p><strong>PARIGO</strong>, société par actions simplifiée au capital de 10 000 euros, immatriculée au RCS de Paris sous le numéro B 477 670 244.</p><p>TVA intracommunautaire : FR62 477 670 244.</p><p>Siège social : 9 rue Rémy Dumoncel, 75014 Paris, France.</p><p>Téléphone : <a href="tel:+33149239476">+33 (0)1 49 23 94 76</a> · E-mail : <a href="mailto:info@parigomusic.com">info@parigomusic.com</a></p></> },
    { title: "Direction de la publication", content: <p>La direction de la publication est assurée par le représentant légal de PARIGO. Pour toute demande relative au site ou à son contenu : <a href="mailto:info@parigomusic.com">info@parigomusic.com</a>.</p> },
    { title: "Hébergement", content: <><p>Le site est hébergé par <strong>OVH SAS</strong>, 2 rue Kellermann, 59100 Roubaix, France.</p><p>OVH SAS est une filiale de la société OVH Groupe SA, immatriculée au RCS de Lille sous le numéro 537 407 926.</p></> },
    { title: "Conception & développement", content: <p>Webmaster : <strong>Yodev</strong> · <a href="mailto:yoann.andrieux@gmail.com">yoann.andrieux@gmail.com</a>.</p> },
    { title: "Propriété intellectuelle", content: <><p>La structure du site, son identité visuelle, les textes, visuels, marques, catalogues, extraits sonores et bases de données sont protégés. Leur mise à disposition ne transfère aucun droit de propriété intellectuelle.</p><p>Toute reproduction, extraction, diffusion, adaptation ou exploitation non autorisée est interdite, sous réserve des exceptions prévues par la loi et des licences expressément accordées.</p></> },
    { title: "Responsabilité & liens", content: <><p>PARIGO veille à l’exactitude des informations publiées mais ne peut garantir une disponibilité permanente ni l’absence totale d’erreurs. Les liens vers des services tiers sont fournis à titre informatif ; leurs contenus et pratiques relèvent de leurs éditeurs.</p><p>Les tarifs et informations de licensing sont indicatifs. Seuls le devis et l’autorisation signés définissent les droits concédés.</p></> },
    { title: "Contact", content: <p>Pour signaler un contenu, exercer un droit ou demander une information : <a href="mailto:info@parigomusic.com">info@parigomusic.com</a> ou PARIGO, 9 rue Rémy Dumoncel, 75014 Paris.</p> },
  ] : [
    { title: "Website publisher", content: <><p><strong>PARIGO</strong>, a French simplified joint-stock company with share capital of €10,000, registered with the Paris Trade and Companies Register under number B 477 670 244.</p><p>EU VAT number: FR62 477 670 244.</p><p>Registered office: 9 rue Rémy Dumoncel, 75014 Paris, France.</p><p>Phone: <a href="tel:+33149239476">+33 (0)1 49 23 94 76</a> · Email: <a href="mailto:info@parigomusic.com">info@parigomusic.com</a></p></> },
    { title: "Publication director", content: <p>Publication is directed by PARIGO’s legal representative. Website enquiries may be sent to <a href="mailto:info@parigomusic.com">info@parigomusic.com</a>.</p> },
    { title: "Hosting", content: <><p>The website is hosted by <strong>OVH SAS</strong>, 2 rue Kellermann, 59100 Roubaix, France.</p><p>OVH SAS is a subsidiary of OVH Groupe SA, registered with the Lille Trade and Companies Register under number 537 407 926.</p></> },
    { title: "Design & development", content: <p>Webmaster: <strong>Yodev</strong> · <a href="mailto:yoann.andrieux@gmail.com">yoann.andrieux@gmail.com</a>.</p> },
    { title: "Intellectual property", content: <><p>The website structure, visual identity, copy, images, trademarks, catalogues, audio previews and databases are protected. Access does not transfer any intellectual property rights.</p><p>Unauthorised reproduction, extraction, distribution, adaptation or exploitation is prohibited, except as permitted by law or an express licence.</p></> },
    { title: "Liability & links", content: <><p>PARIGO seeks to keep information accurate but cannot guarantee continuous availability or an absolute absence of errors. Third-party links are provided for information; their publishers remain responsible for their content and practices.</p><p>Licensing rates and information are indicative. Only a signed quotation and licence define the rights granted.</p></> },
    { title: "Contact", content: <p>To report content, exercise a right or request information: <a href="mailto:info@parigomusic.com">info@parigomusic.com</a> or PARIGO, 9 rue Rémy Dumoncel, 75014 Paris, France.</p> },
  ];
  return <InstitutionalShell eyebrow={locale === "fr" ? "Informations légales" : "Legal information"} title={locale === "fr" ? "Mentions légales" : "Legal notice"} intro={locale === "fr" ? "L’éditeur, l’hébergement et les règles qui encadrent ce site." : "The publisher, hosting provider and rules governing this website."}><LegalDocument sections={sections} /></InstitutionalShell>;
}
