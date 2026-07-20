"use client";

import { InstitutionalShell } from "@/components/layout/InstitutionalShell";
import { LegalDocument } from "@/components/institutional/LegalDocument";
import { useI18n } from "@/components/providers/I18nProvider";

export default function TermsPage() {
  const { locale } = useI18n();
  const sections = locale === "fr" ? [
    { title: "Objet & acceptation", content: <p>Ces conditions encadrent l’accès au site Parigo, au catalogue, aux extraits audio et aux espaces personnels. En utilisant le service, vous acceptez les présentes conditions et la politique de confidentialité.</p> },
    { title: "Compte utilisateur", content: <><p>Vous devez fournir des informations exactes, protéger vos identifiants et signaler toute utilisation non autorisée. Vous restez responsable des actions effectuées depuis votre compte.</p><p>PARIGO peut suspendre un compte en cas de fraude, d’atteinte à la sécurité, de violation des droits ou d’usage contraire aux présentes conditions.</p></> },
    { title: "Catalogue & extraits", content: <><p>Les extraits sont fournis pour l’écoute, la recherche et la préparation d’un projet. Ils ne constituent ni une autorisation de synchronisation, ni un transfert de droits.</p><p>Il est interdit de copier, extraire massivement, republier, entraîner un système automatisé, contourner une protection ou exploiter les contenus sans autorisation.</p></> },
    { title: "Licences & téléchargements", content: <p>Toute utilisation d’une œuvre dans une production nécessite les autorisations adaptées aux médias, territoires, durée, formats et usages concernés. Seuls le devis accepté et l’autorisation de synchronisation font foi. Les redevances de sociétés de gestion collective peuvent rester dues séparément.</p> },
    { title: "Disponibilité", content: <p>PARIGO peut faire évoluer le catalogue et les fonctionnalités, interrompre temporairement le service pour maintenance ou retirer un contenu. Aucune lecture ou téléchargement ne doit être considéré comme garanti de manière permanente.</p> },
    { title: "Responsabilité", content: <p>Dans les limites permises par la loi, PARIGO ne répond pas des dommages indirects, pertes de données ou décisions prises sur la base d’informations indicatives. Rien dans ces conditions n’exclut une responsabilité qui ne peut légalement l’être.</p> },
    { title: "Droit applicable", content: <p>Les présentes conditions sont régies par le droit français. Après tentative de résolution amiable, les juridictions compétentes seront déterminées selon les règles applicables ; pour les relations entre professionnels, compétence est attribuée aux tribunaux de Paris.</p> },
    { title: "Contact", content: <p>Questions sur les conditions, le catalogue ou une licence : <a href="mailto:info@parigomusic.com">info@parigomusic.com</a>.</p> },
  ] : [
    { title: "Purpose & acceptance", content: <p>These terms govern access to the Parigo website, catalogue, audio previews and personal areas. By using the service, you accept these terms and the privacy policy.</p> },
    { title: "User account", content: <><p>You must provide accurate information, protect your credentials and report unauthorised use. You remain responsible for actions performed through your account.</p><p>PARIGO may suspend an account in case of fraud, security risk, infringement or use contrary to these terms.</p></> },
    { title: "Catalogue & previews", content: <><p>Previews are supplied for listening, search and project preparation. They are neither a synchronisation licence nor a transfer of rights.</p><p>Copying, bulk extraction, republication, automated-system training, circumvention of protections or unauthorised exploitation is prohibited.</p></> },
    { title: "Licences & downloads", content: <p>Any use of a work in a production requires permissions for the relevant media, territories, term, formats and uses. Only an accepted quotation and synchronisation licence are binding. Collective-management royalties may remain payable separately.</p> },
    { title: "Availability", content: <p>PARIGO may evolve the catalogue and features, temporarily interrupt service for maintenance, or remove content. Playback and downloads are not guaranteed permanently.</p> },
    { title: "Liability", content: <p>To the extent permitted by law, PARIGO is not liable for indirect damage, data loss or decisions based on indicative information. Nothing excludes liability that cannot legally be excluded.</p> },
    { title: "Governing law", content: <p>These terms are governed by French law. After an attempt at amicable resolution, jurisdiction is determined under applicable rules; business-to-business disputes fall within the jurisdiction of the Paris courts.</p> },
    { title: "Contact", content: <p>Questions about these terms, the catalogue or a licence: <a href="mailto:info@parigomusic.com">info@parigomusic.com</a>.</p> },
  ];
  return <InstitutionalShell eyebrow={locale === "fr" ? "Règles du service" : "Service rules"} title={locale === "fr" ? "Conditions d’utilisation" : "Terms of use"} intro={locale === "fr" ? "Écouter, sélectionner, télécharger et licencier : le cadre d’utilisation du service Parigo." : "Listening, selecting, downloading and licensing: the framework for using Parigo."}><LegalDocument sections={sections} /></InstitutionalShell>;
}
