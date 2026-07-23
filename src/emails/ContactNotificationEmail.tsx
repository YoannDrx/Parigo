import type { CSSProperties } from "react";
import { emailColors, ParigoEmailShell } from "./ParigoEmailShell";

export interface ContactTrackSummary {
  title: string;
  albumTitle: string | null;
  reference: string;
  verified: boolean;
}

export interface ContactNotificationEmailProps {
  requestId: string;
  receivedAt: string;
  name: string;
  company: string;
  email: string;
  message: string;
  locale: "fr" | "en";
  track: ContactTrackSummary | null;
}

export function ContactNotificationEmail(props: ContactNotificationEmailProps) {
  const replyHref = `mailto:${encodeURIComponent(props.email)}?subject=${encodeURIComponent(`Re: demande Parigo Music — ${props.name}`)}`;

  return (
    <ParigoEmailShell
      locale="fr"
      preview={`Nouveau message de ${props.name}${props.company ? ` · ${props.company}` : ""}`}
      eyebrow="Nouvelle demande reçue"
      title="Un nouveau projet arrive."
    >
      <p style={intro}>
        Une personne vient d’utiliser le formulaire Parigo Music. Voici toutes les informations nécessaires pour lui répondre et qualifier sa demande.
      </p>

      <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style={metaTable}>
        <tbody>
          <InfoRow label="Reçu le" value={props.receivedAt} />
          <InfoRow label="Nom" value={props.name} />
          <InfoRow label="Société" value={props.company || "Non renseignée"} />
          <InfoRow label="E-mail" value={props.email} href={`mailto:${props.email}`} />
          <InfoRow label="Langue du formulaire" value={props.locale === "fr" ? "Français" : "Anglais"} />
        </tbody>
      </table>

      {props.track && (
        <div style={trackCard}>
          <p style={sectionEyebrow}>{props.track.verified ? "PISTE VÉRIFIÉE DANS HARVEST" : "RÉFÉRENCE DEMANDÉE"}</p>
          <p style={trackTitle}>{props.track.title}</p>
          {props.track.albumTitle && <p style={trackMeta}>{props.track.albumTitle}</p>}
          <p style={trackReference}>{props.track.reference}</p>
        </div>
      )}

      <div style={messageBlock}>
        <p style={sectionEyebrow}>MESSAGE</p>
        <p style={messageText}>{props.message}</p>
      </div>

      <a href={replyHref} style={button}>Répondre à {props.name}</a>

      <p style={requestMeta}>
        Identifiant de demande : <span style={mono}>{props.requestId}</span>
      </p>
    </ParigoEmailShell>
  );
}

function InfoRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <tr>
      <td style={labelCell}>{label}</td>
      <td style={valueCell}>{href ? <a href={href} style={valueLink}>{value}</a> : value}</td>
    </tr>
  );
}

const intro: CSSProperties = { margin: "0 0 26px", color: emailColors.muted, fontSize: "15px", lineHeight: "24px" };
const metaTable: CSSProperties = { width: "100%", borderTop: `1px solid ${emailColors.line}` };
const labelCell: CSSProperties = { width: "34%", padding: "13px 12px 13px 0", borderBottom: `1px solid ${emailColors.line}`, color: emailColors.muted, fontSize: "11px", lineHeight: "18px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase", verticalAlign: "top" };
const valueCell: CSSProperties = { padding: "13px 0", borderBottom: `1px solid ${emailColors.line}`, color: emailColors.ink, fontSize: "14px", lineHeight: "20px", fontWeight: 600, verticalAlign: "top" };
const valueLink: CSSProperties = { color: emailColors.forest, textDecoration: "underline" };
const trackCard: CSSProperties = { marginTop: "28px", padding: "22px", backgroundColor: "#edf0e8", borderLeft: `5px solid ${emailColors.signal}` };
const sectionEyebrow: CSSProperties = { margin: "0 0 10px", color: emailColors.forest, fontSize: "10px", lineHeight: "15px", fontWeight: 800, letterSpacing: "1.5px" };
const trackTitle: CSSProperties = { margin: 0, color: emailColors.ink, fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "24px", lineHeight: "30px" };
const trackMeta: CSSProperties = { margin: "7px 0 0", color: emailColors.muted, fontSize: "13px", lineHeight: "19px" };
const trackReference: CSSProperties = { margin: "12px 0 0", color: emailColors.muted, fontFamily: "monospace", fontSize: "11px", lineHeight: "17px" };
const messageBlock: CSSProperties = { marginTop: "28px", padding: "24px", border: `1px solid ${emailColors.line}`, backgroundColor: "#fbfcfa" };
const messageText: CSSProperties = { margin: 0, color: emailColors.ink, fontSize: "16px", lineHeight: "27px", whiteSpace: "pre-wrap" };
const button: CSSProperties = { display: "inline-block", marginTop: "28px", padding: "14px 20px", backgroundColor: emailColors.ink, color: emailColors.paper, borderRadius: "999px", fontSize: "13px", lineHeight: "18px", fontWeight: 700, textDecoration: "none" };
const requestMeta: CSSProperties = { margin: "24px 0 0", color: emailColors.muted, fontSize: "10px", lineHeight: "16px" };
const mono: CSSProperties = { fontFamily: "monospace" };
