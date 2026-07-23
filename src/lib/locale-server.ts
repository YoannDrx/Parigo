import "server-only";

import { headers } from "next/headers";
import type { Locale } from "@/i18n/messages";
import { isLocale } from "./locale";

export async function getRequestLocale(): Promise<Locale> {
  const value = (await headers()).get("x-parigo-locale");
  return isLocale(value) ? value : "fr";
}
