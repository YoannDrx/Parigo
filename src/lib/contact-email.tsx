import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { ContactAcknowledgementEmail, type ContactAcknowledgementEmailProps } from "@/emails/ContactAcknowledgementEmail";
import { ContactNotificationEmail, type ContactNotificationEmailProps } from "@/emails/ContactNotificationEmail";

async function renderEmail(element: ReactElement) {
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { html, text };
}

export function renderContactNotificationEmail(props: ContactNotificationEmailProps) {
  return renderEmail(<ContactNotificationEmail {...props} />);
}

export function renderContactAcknowledgementEmail(props: ContactAcknowledgementEmailProps) {
  return renderEmail(<ContactAcknowledgementEmail {...props} />);
}
