import type { CSSProperties } from "react";
import { emailColors, ParigoEmailShell } from "./ParigoEmailShell";

export interface ContactAcknowledgementEmailProps {
  locale: "fr" | "en";
  name: string;
  receivedAt: string;
  requestId: string;
}

export function ContactAcknowledgementEmail({ locale, name, receivedAt, requestId }: ContactAcknowledgementEmailProps) {
  const fr = locale === "fr";

  return (
    <ParigoEmailShell
      locale={locale}
      preview={fr ? "Votre message a bien été transmis à l’équipe Parigo Music." : "Your message has been sent to the Parigo Music team."}
      eyebrow={fr ? "Message bien reçu" : "Message received"}
      title={fr ? `Merci ${name}.` : `Thank you, ${name}.`}
    >
      <p style={lead}>
        {fr
          ? "Votre demande est maintenant entre les mains de l’équipe Parigo Music. Nous allons l’étudier et vous répondre dès que possible."
          : "Your request is now with the Parigo Music team. We will review it and get back to you as soon as possible."}
      </p>

      <div style={confirmation}>
        <p style={confirmationLabel}>{fr ? "ENVOI CONFIRMÉ" : "DELIVERY CONFIRMED"}</p>
        <p style={confirmationValue}>{receivedAt}</p>
        <p style={confirmationMeta}>
          {fr ? "Référence" : "Reference"} · <span style={mono}>{requestId}</span>
        </p>
      </div>

      <p style={copy}>
        {fr
          ? "Si votre demande est urgente ou si vous souhaitez ajouter une précision, répondez directement à cet e-mail ou écrivez-nous à info@parigomusic.com."
          : "If your request is urgent or you would like to add more information, reply directly to this email or write to us at info@parigomusic.com."}
      </p>

      <a href="mailto:info@parigomusic.com" style={button}>
        {fr ? "Contacter Parigo Music" : "Contact Parigo Music"}
      </a>
    </ParigoEmailShell>
  );
}

const lead: CSSProperties = { margin: "0 0 26px", color: emailColors.ink, fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "21px", lineHeight: "32px" };
const confirmation: CSSProperties = { padding: "24px", backgroundColor: "#edf0e8", borderLeft: `5px solid ${emailColors.signal}` };
const confirmationLabel: CSSProperties = { margin: "0 0 9px", color: emailColors.forest, fontSize: "10px", lineHeight: "15px", fontWeight: 800, letterSpacing: "1.5px" };
const confirmationValue: CSSProperties = { margin: 0, color: emailColors.ink, fontSize: "15px", lineHeight: "22px", fontWeight: 700 };
const confirmationMeta: CSSProperties = { margin: "8px 0 0", color: emailColors.muted, fontSize: "11px", lineHeight: "17px" };
const copy: CSSProperties = { margin: "26px 0 0", color: emailColors.muted, fontSize: "14px", lineHeight: "23px" };
const button: CSSProperties = { display: "inline-block", marginTop: "26px", padding: "14px 20px", backgroundColor: emailColors.ink, color: emailColors.paper, borderRadius: "999px", fontSize: "13px", lineHeight: "18px", fontWeight: 700, textDecoration: "none" };
const mono: CSSProperties = { fontFamily: "monospace" };
