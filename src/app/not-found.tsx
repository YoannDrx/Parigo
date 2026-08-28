import Image from "next/image";
import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { SignedTitle } from "@/components/ui/SignedTitle";
import { localizedPath } from "@/lib/locale";
import { getRequestLocale } from "@/lib/locale-server";

const NOT_FOUND_IMAGE = "/images/editorial/parigo-real/r05-orgue-commandes-1600x1200.avif";

export const metadata = { robots: { index: false, follow: false } };

export default async function NotFound() {
  const locale = await getRequestLocale();
  const homePath = localizedPath(locale, "/");
  const searchPath = localizedPath(locale, "/search");

  return (
    <main className="relative isolate flex min-h-[100svh] w-full items-center justify-center overflow-hidden bg-[#0b110d] px-4 py-10 text-[#f2f1ed] sm:px-8">
      <Image
        src={NOT_FOUND_IMAGE}
        alt=""
        fill
        preload
        sizes="100vw"
        data-testid="not-found-background"
        className="-z-30 origin-center scale-[1.12] object-cover object-center"
      />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(115deg,rgba(6,10,7,.72)_0%,rgba(6,10,7,.46)_46%,rgba(6,10,7,.12)_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(6,10,7,.56),transparent_48%,rgba(6,10,7,.14))]" />

      <section
        aria-labelledby="not-found-title"
        className="parigo-frame [--foreground:#f2f1ed] [--signal-strong:#68bf83] flex w-full max-w-[920px] flex-col items-center border border-white/25 bg-[#0b110d]/62 px-5 py-8 text-center shadow-[12px_14px_0_rgba(104,191,131,.14),0_32px_100px_rgba(0,0,0,.42)] backdrop-blur-[3px] sm:px-10 sm:py-10 md:px-14 md:py-12"
      >
        <p aria-hidden="true" className="select-none font-[var(--font-editorial)] text-[clamp(6rem,23vw,13rem)] font-bold leading-[.7] tracking-[-.09em] text-[#68bf83]">
          404
        </p>
        <SignedTitle
          id="not-found-title"
          as="h1"
          className="relative mx-auto mt-3 max-w-[12ch] font-[var(--font-editorial)] text-[clamp(2.6rem,8vw,5.8rem)] font-semibold leading-[.9] tracking-[-.06em] text-[#f2f1ed]"
        >
          {locale === "fr" ? "La piste s’arrête ici." : "The track ends here."}
        </SignedTitle>
        <p className="mx-auto mt-6 max-w-xl text-sm leading-6 text-[#d7d9d4] sm:text-base sm:leading-7">
          {locale === "fr"
            ? "Cette page a quitté le catalogue — mais la musique continue."
            : "This page has left the catalogue — but the music keeps playing."}
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href={homePath}
            className="parigo-button inline-flex min-h-12 items-center justify-center gap-2 !bg-[#68bf83] px-6 font-semibold !text-[#0b110d] transition hover:!bg-[#f2f1ed] hover:!text-[#0b110d] focus-visible:!bg-[#f2f1ed] focus-visible:!text-[#0b110d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2f1ed] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b110d]"
          >
            <Home size={17} aria-hidden="true" />
            {locale === "fr" ? "Retour à l’accueil" : "Back home"}
          </Link>
          <Link
            href={searchPath}
            className="parigo-button inline-flex min-h-12 items-center justify-center gap-2 border border-white/35 bg-white/5 px-6 font-semibold text-[#f2f1ed] transition hover:border-[#68bf83] hover:bg-[#68bf83] hover:text-[#0b110d] focus-visible:border-[#68bf83] focus-visible:bg-[#68bf83] focus-visible:text-[#0b110d] focus-visible:outline-none"
          >
            <Compass size={17} aria-hidden="true" />
            {locale === "fr" ? "Explorer le catalogue" : "Explore the catalogue"}
          </Link>
        </div>
      </section>
    </main>
  );
}
