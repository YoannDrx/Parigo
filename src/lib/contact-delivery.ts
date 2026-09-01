import "server-only";

import { sendHarvestContactEmail } from "./harvest/contact";

export interface ContactDeliveryInput {
  name: string;
  email: string;
  subject: string;
  harvestMessage: string;
}

export async function deliverContactMessage(input: ContactDeliveryInput): Promise<void> {
  await sendHarvestContactEmail({
    name: input.name,
    email: input.email,
    subject: input.subject,
    message: input.harvestMessage,
  });
}
