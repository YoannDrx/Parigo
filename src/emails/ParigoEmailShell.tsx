/* eslint-disable @next/next/no-head-element -- React Email renders a standalone HTML document, not a Next.js page. */
import type { CSSProperties, ReactNode } from "react";

interface ParigoEmailShellProps {
  locale: "fr" | "en";
  preview: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}

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

export function ParigoEmailShell({ locale, preview, eyebrow, title, children }: ParigoEmailShellProps) {
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
          <tbody>
            <tr>
              <td align="center" style={outerCell}>
                <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style={container}>
                  <tbody>
                    <tr>
                      <td style={brandBar}>
                        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0">
                          <tbody>
                            <tr>
                              <td style={brandName}>PARIGO</td>
                              <td align="right" style={brandDescriptor}>PRODUCTION MUSIC · PARIS</td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style={hero}>
                        <p style={eyebrowStyle}>{eyebrow}</p>
                        <h1 style={heading}>{title}</h1>
                        <div style={wave} />
                      </td>
                    </tr>
                    <tr>
                      <td style={content}>{children}</td>
                    </tr>
                    <tr>
                      <td style={footer}>
                        <p style={footerStrong}>PARIGO MUSIC</p>
                        <p style={footerText}>
                          Musique à l’image · Licensing · Synchronisation<br />
                          <a href="mailto:info@parigomusic.com" style={footerLink}>info@parigomusic.com</a>
                        </p>
                        <p style={legalText}>
                          {locale === "fr"
                            ? "Message transactionnel envoyé à la suite d’une demande sur le site Parigo Music."
                            : "Transactional message sent after a request on the Parigo Music website."}
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

const body: CSSProperties = { margin: 0, padding: 0, backgroundColor: colors.paper, color: colors.ink, fontFamily: "Arial, Helvetica, sans-serif" };
const previewText: CSSProperties = { display: "none", maxHeight: 0, overflow: "hidden", opacity: 0, color: "transparent", lineHeight: "1px" };
const outerTable: CSSProperties = { width: "100%", backgroundColor: colors.paper };
const outerCell: CSSProperties = { padding: "32px 12px" };
const container: CSSProperties = { width: "100%", maxWidth: "680px", margin: "0 auto", backgroundColor: colors.surface, border: `1px solid ${colors.line}` };
const brandBar: CSSProperties = { padding: "22px 28px", backgroundColor: colors.ink, color: colors.paper };
const brandName: CSSProperties = { fontSize: "28px", lineHeight: "32px", fontWeight: 800, letterSpacing: "4px" };
const brandDescriptor: CSSProperties = { color: colors.signal, fontSize: "10px", lineHeight: "14px", fontWeight: 700, letterSpacing: "1.8px" };
const hero: CSSProperties = { padding: "44px 36px 30px", backgroundColor: "#edf0e8" };
const eyebrowStyle: CSSProperties = { margin: "0 0 12px", color: colors.forest, fontSize: "11px", lineHeight: "16px", fontWeight: 700, letterSpacing: "1.8px", textTransform: "uppercase" };
const heading: CSSProperties = { margin: 0, color: colors.ink, fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "38px", lineHeight: "44px", fontWeight: 400, letterSpacing: "-1.2px" };
const wave: CSSProperties = { width: "92px", height: "5px", marginTop: "26px", backgroundColor: colors.signal, borderRadius: "999px" };
const content: CSSProperties = { padding: "34px 36px 42px" };
const footer: CSSProperties = { padding: "28px 36px", backgroundColor: colors.ink, color: colors.paper };
const footerStrong: CSSProperties = { margin: "0 0 8px", fontSize: "12px", fontWeight: 800, letterSpacing: "2px" };
const footerText: CSSProperties = { margin: 0, color: "#d8ddd5", fontSize: "12px", lineHeight: "20px" };
const footerLink: CSSProperties = { color: colors.signal, textDecoration: "none" };
const legalText: CSSProperties = { margin: "22px 0 0", color: "#879089", fontSize: "10px", lineHeight: "16px" };
