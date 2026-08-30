/* eslint-disable @next/next/no-head-element, @next/next/no-img-element -- React Email renders a standalone document with absolute image URLs. */
import type { CSSProperties, ReactNode } from "react";

const colors = {
  ink: "#07100b",
  paper: "#f5f1e7",
  surface: "#ffffff",
  signal: "#c8d95b",
  forest: "#315136",
  muted: "#68706a",
  line: "#d9ddd4",
};

export const emailColors = colors;
const fallbackSiteUrl = "https://parigo-ten.vercel.app";

export function getEmailSiteUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL || fallbackSiteUrl;
  return configuredUrl.replace(/\\[nr]/g, "").trim().replace(/\/+$/, "") || fallbackSiteUrl;
}

export function ParigoEmailShell({
  locale,
  preview,
  eyebrow,
  title,
  logoSrc,
  children,
}: {
  locale: "fr" | "en";
  preview: string;
  eyebrow: string;
  title: string;
  logoSrc?: string;
  children: ReactNode;
}) {
  const siteUrl = getEmailSiteUrl();
  const logoUrl = logoSrc || `${siteUrl}/images/parigo-logo-email.png`;
  return (
    <html lang={locale}>
      <head>
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
      </head>
      <body style={body}>
        <div style={previewText}>{preview}</div>
        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style={outerTable}>
          <tbody><tr><td align="center" style={outerCell}>
            <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style={container}>
              <tbody>
                <tr><td style={brandBar}><img src={logoUrl} width="176" alt="Parigo Music" style={brandLogo} /></td></tr>
                <tr><td style={hero}><p style={eyebrowStyle}>{eyebrow}</p><h1 style={heading}>{title}</h1><div style={wave} /></td></tr>
                <tr><td style={content}>{children}</td></tr>
                <tr><td style={footer}>
                  <img src={logoUrl} width="142" alt="Parigo Music" style={footerLogo} />
                  <p style={footerStrong}>MUSIQUE À L’IMAGE · LICENSING · SYNCHRONISATION</p>
                  <p style={footerText}>9 rue Rémy Dumoncel · 75014 Paris · France<br /><a href="tel:+33149239476" style={footerLink}>+33 (0)1 49 23 94 76</a> · <a href="mailto:info@parigomusic.com" style={footerLink}>info@parigomusic.com</a><br /><a href={siteUrl} style={footerLink}>parigomusic.com</a></p>
                  <p style={legalText}>{locale === "fr" ? "Message transactionnel envoyé à la suite d’une demande sur le site Parigo Music." : "Transactional message sent after a request on the Parigo Music website."}</p>
                </td></tr>
              </tbody>
            </table>
          </td></tr></tbody>
        </table>
      </body>
    </html>
  );
}

const body: CSSProperties = { margin: 0, padding: 0, backgroundColor: colors.paper, color: colors.ink, fontFamily: "Arial, Helvetica, sans-serif" };
const previewText: CSSProperties = { display: "none", maxHeight: 0, overflow: "hidden", opacity: 0, color: "transparent", lineHeight: "1px" };
const outerTable: CSSProperties = { width: "100%", backgroundColor: colors.paper };
const outerCell: CSSProperties = { padding: "36px 12px" };
const container: CSSProperties = { width: "100%", maxWidth: "680px", margin: "0 auto", overflow: "hidden", backgroundColor: colors.surface, border: `1px solid ${colors.line}`, borderRadius: "22px" };
const brandBar: CSSProperties = { padding: "24px 30px", backgroundColor: colors.ink };
const brandLogo: CSSProperties = { display: "block", width: "176px", maxWidth: "100%", height: "auto", border: 0 };
const hero: CSSProperties = { padding: "48px 36px 34px", backgroundColor: "#edf3e9" };
const eyebrowStyle: CSSProperties = { margin: "0 0 12px", color: colors.forest, fontSize: "11px", lineHeight: "16px", fontWeight: 700, letterSpacing: "1.8px", textTransform: "uppercase" };
const heading: CSSProperties = { margin: 0, color: colors.ink, fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "38px", lineHeight: "44px", fontWeight: 400, letterSpacing: "-1.2px" };
const wave: CSSProperties = { width: "92px", height: "5px", marginTop: "28px", backgroundColor: colors.signal, borderRadius: "999px" };
const content: CSSProperties = { padding: "34px 36px 42px" };
const footer: CSSProperties = { padding: "28px 36px", backgroundColor: colors.ink, color: colors.paper };
const footerLogo: CSSProperties = { display: "block", width: "142px", maxWidth: "100%", height: "auto", margin: "0 0 22px", border: 0 };
const footerStrong: CSSProperties = { margin: "0 0 10px", color: colors.signal, fontSize: "10px", lineHeight: "15px", fontWeight: 800, letterSpacing: "1.5px" };
const footerText: CSSProperties = { margin: 0, color: "#d8ddd5", fontSize: "12px", lineHeight: "20px" };
const footerLink: CSSProperties = { color: colors.signal, textDecoration: "none" };
const legalText: CSSProperties = { margin: "22px 0 0", color: "#879089", fontSize: "10px", lineHeight: "16px" };
