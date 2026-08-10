import "server-only";

import { serviceRequest } from "./client";

export interface HarvestContactEmailInput {
  name: string;
  email: string;
  subject: string;
  message: string;
  phoneNumber?: string;
}

export function buildHarvestContactEmail(input: HarvestContactEmailInput) {
  return {
    Name: input.name,
    Email: input.email,
    PhoneNumber: input.phoneNumber || "",
    Subject: input.subject,
    Message: input.message,
  };
}

export async function sendHarvestContactEmail(input: HarvestContactEmailInput) {
  await serviceRequest((token) => `/sendcontactusemail/${token}`, {
    method: "POST",
    body: JSON.stringify(buildHarvestContactEmail(input)),
  });
}
