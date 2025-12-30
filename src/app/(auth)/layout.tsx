import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-gray-100)]">
      {/* Simple Header */}
      <header className="py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <Link href="/" className="text-2xl font-bold text-[var(--color-black)]">
            Parigo<span className="text-[var(--color-primary)]">.</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>

      {/* Simple Footer */}
      <footer className="py-4 px-4 text-center text-sm text-[var(--color-gray-600)]">
        <p>&copy; {new Date().getFullYear()} Parigo Music. Tous droits réservés.</p>
      </footer>
    </div>
  );
}
