"use client";

import Link from "next/link";
import { Mail, Linkedin, Youtube, Music } from "lucide-react";
import { Input, Button } from "@/components/ui";

const footerLinks = {
  navigation: [
    { name: "Recherche", href: "/search" },
    { name: "Albums", href: "/albums" },
    { name: "Playlists", href: "/playlists" },
    { name: "Labels", href: "/labels" },
  ],
  company: [
    { name: "À propos", href: "/about" },
    { name: "Tarifs", href: "/licensing" },
    { name: "Contact", href: "/contact" },
  ],
  legal: [
    { name: "Mentions légales", href: "/legal" },
    { name: "Politique de confidentialité", href: "/privacy" },
    { name: "CGU", href: "/terms" },
  ],
};

const socialLinks = [
  { name: "LinkedIn", href: "https://linkedin.com", icon: Linkedin },
  { name: "YouTube", href: "https://youtube.com", icon: Youtube },
];

export function Footer() {
  return (
    <footer className="bg-[var(--color-black)] text-white mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-[var(--color-primary)] border-2 border-white rounded-[var(--radius-sm)] flex items-center justify-center">
                <span className="text-white font-bold text-xl">P</span>
              </div>
              <span className="font-bold text-xl">Parigo Music</span>
            </div>
            <p className="text-[var(--color-gray-400)] mb-6 max-w-md">
              Bibliothèque de musique de production pour vos projets audiovisuels.
              Plus de 350 000 œuvres, 100+ labels internationaux.
            </p>

            {/* Newsletter */}
            <div className="space-y-3">
              <p className="font-semibold">Newsletter</p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="votre@email.com"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:border-[var(--color-primary)] focus:shadow-[3px_3px_0px_var(--color-primary)]"
                />
                <Button variant="primary" size="md">
                  <Mail size={18} />
                </Button>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h3 className="font-semibold mb-4">Navigation</h3>
            <ul className="space-y-2">
              {footerLinks.navigation.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-[var(--color-gray-400)] hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="font-semibold mb-4">Entreprise</h3>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-[var(--color-gray-400)] hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-semibold mb-4">Légal</h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-[var(--color-gray-400)] hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[var(--color-gray-400)] text-sm">
            © {new Date().getFullYear()} Parigo Music. Tous droits réservés.
          </p>

          {/* Social Links */}
          <div className="flex items-center gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-[var(--radius-sm)] border-2 border-white/20 flex items-center justify-center hover:bg-[var(--color-primary)] hover:border-[var(--color-primary)] transition-all"
                aria-label={social.name}
              >
                <social.icon size={18} />
              </a>
            ))}
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 text-xs text-[var(--color-gray-400)]">
            <Music size={14} />
            <span>Membre SACEM depuis 2013</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
