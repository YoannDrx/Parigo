import { Cookie } from "lucide-react";
import type { Locale } from "@/i18n/messages";
import { CONSENT_BANNER_ID } from "@/lib/consent";
import { CookieConsentActions } from "./CookieConsentActions";

export function CookieConsentBanner({ locale }: { locale: Locale }) {
  const title = locale === "fr" ? "Vos choix, sans bruit de fond." : "Your choices, without the background noise.";
  const description = locale === "fr"
    ? "Parigo utilise des cookies nécessaires au fonctionnement du site. Les catégories optionnelles ne seront activées qu’avec votre accord."
    : "Parigo uses cookies required for the website to work. Optional categories will only be enabled with your consent.";
  const mobileDescription = locale === "fr"
    ? "Cookies nécessaires uniquement, sauf accord de votre part."
    : "Necessary cookies only, unless you choose otherwise.";

  return (
    <aside id={CONSENT_BANNER_ID} aria-label={locale === "fr" ? "Préférences de cookies" : "Cookie preferences"} className="parigo-frame !fixed inset-x-3 bottom-3 z-[120] border border-white/18 bg-[#0c0d0b] p-5 text-[#f3f0e8] shadow-[0_24px_90px_rgba(0,0,0,.45)] md:inset-x-auto md:bottom-6 md:left-6 md:max-w-[620px] md:p-7">
      <div className="grid gap-6 md:grid-cols-[auto_1fr]">
        <span className="grid h-12 w-12 place-items-center bg-[var(--signal)] text-[#10110e]"><Cookie size={20} /></span>
        <div>
          <h2 className="font-[var(--font-editorial)] text-xl font-normal md:text-3xl">{title}</h2>
          <p className="mt-2 text-xs leading-relaxed text-white/64 md:hidden">{mobileDescription}</p>
          <p className="mt-3 hidden text-sm leading-relaxed text-white/58 md:block">{description}</p>
        </div>
      </div>
      <CookieConsentActions locale={locale} />
    </aside>
  );
}
