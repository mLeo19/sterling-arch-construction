import Link from "next/link";
import { navLinks, site } from "@/lib/data/site";
import { Button } from "@/components/ui/Button";

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-black pt-16 pb-40 text-white">
      <p
        aria-hidden
        className="pointer-events-none absolute -bottom-[0.12em] left-1/2 w-full -translate-x-1/2 text-center text-[22vw] leading-none font-medium whitespace-nowrap text-white/[0.06] select-none"
      >
        {site.shortName}
      </p>

      <div className="relative mx-auto max-w-6xl px-6 sm:px-10">
        <div className="grid grid-cols-1 gap-12 border-b border-white/10 pb-16 sm:grid-cols-3">
          <div>
            <p className="text-2xl font-semibold text-white">{site.name}</p>
            <p className="mt-3 max-w-[26ch] text-sm text-white/60">
              {site.tagline}
            </p>
            <Button href="/contact" className="mt-6">
              Get a Quote
            </Button>
          </div>

          <div className="font-mono text-xs tracking-[0.08em] text-white/60 uppercase">
            <p className="mb-3 text-white/40">Menu</p>
            <ul className="space-y-2 normal-case">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="transition-colors duration-300 hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="font-mono text-xs tracking-[0.08em] text-white/60 uppercase">
            <p className="mb-3 text-white/40">Studio</p>
            <p className="normal-case">{site.address.line1}</p>
            <p className="normal-case">{site.address.line2}</p>
            <p className="mt-3 normal-case">{site.phone}</p>
            <p className="normal-case">{site.email}</p>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-4 pt-8 font-mono text-[0.65rem] tracking-[0.08em] text-white/40 uppercase sm:flex-row sm:items-center">
          <p>© 2026, {site.name}</p>
          <div className="flex gap-6">
            {site.socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className="transition-colors duration-300 hover:text-white"
              >
                {social.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
