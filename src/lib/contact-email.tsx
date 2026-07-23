import { render } from "@react-email/render";
import type { ReactElement } from "react";
import {
  ContactNotificationEmail,
  type ContactNotificationEmailProps,
} from "@/emails/ContactNotificationEmail";
import {
  ContactAcknowledgementEmail,
  type ContactAcknowledgementEmailProps,
} from "@/emails/ContactAcknowledgementEmail";

interface RenderedEmail {
  html: string;
  text: string;
}

async function renderEmail(element: ReactElement): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([
    render(element),
    render(element, { plainText: true }),
  ]);
  return { html, text };
}

export function renderContactNotificationEmail(props: ContactNotificationEmailProps) {
  return renderEmail(<ContactNotificationEmail {...props} />);
}

export function renderContactAcknowledgementEmail(props: ContactAcknowledgementEmailProps) {
  return renderEmail(<ContactAcknowledgementEmail {...props} />);
}
