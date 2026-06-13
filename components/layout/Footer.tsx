import Link from "next/link";
import { Car, Mail, Phone, Globe } from "lucide-react";
import { COMPANY } from "@/lib/data";
import { socialLinks } from "@/lib/seo";

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}
const FOOTER_LINKS = {
  Platform: [
    { href: "/search-return", label: "Return Journeys" },
    { href: "/search-self-drive", label: "Self Drive" },
    { href: "/search-driver", label: "With Driver" },
    { href: "/owner", label: "Register as Owner" },
    { href: "/owner/dashboard", label: "Owner Dashboard" },
  ],
  Company: [
    { href: "/investors", label: "Investors" },
    { href: "/contact", label: "Contact Us" },
    { href: "/#faq", label: "FAQ" },
    { href: "/#testimonials", label: "Testimonials" },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms & Conditions" },
    { href: "/refund", label: "Refund Policy" },
    { href: "/owner-agreement", label: "Owner Agreement" },
    { href: "/user-agreement", label: "User Agreement" },
  ],
};

const SOCIAL = [
  { href: socialLinks.facebook, label: "Facebook", icon: FacebookIcon },
  { href: socialLinks.instagram, label: "Instagram", icon: InstagramIcon },
  { href: socialLinks.twitter, label: "Twitter / X", icon: TwitterIcon },
  { href: socialLinks.linkedin, label: "LinkedIn", icon: LinkedinIcon },
  { href: socialLinks.youtube, label: "YouTube", icon: YoutubeIcon },
];
export default function Footer() {
  return (
    <footer className="bg-secondary text-white">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <Car className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xl font-bold">Rydez</span>
                <span className="text-xl font-bold text-accent"> India</span>
              </div>
            </Link>
            <p className="mt-4 text-white/70 max-w-sm">
              {COMPANY.tagline} — India&apos;s trusted AI-powered vehicle sharing platform.
            </p>
            <div className="mt-6 space-y-3">
              <a
                href={`tel:+91${COMPANY.phone}`}
                className="flex items-center gap-2 text-white/70 hover:text-accent transition-colors"
              >
                <Phone className="h-4 w-4 shrink-0" />
                +91 {COMPANY.phone}
              </a>
              <a
                href={`mailto:${COMPANY.email}`}
                className="flex items-center gap-2 text-white/70 hover:text-accent transition-colors"
              >
                <Mail className="h-4 w-4 shrink-0" />
                {COMPANY.email}
              </a>
              <a
                href={`https://${COMPANY.website}`}
                className="flex items-center gap-2 text-white/70 hover:text-accent transition-colors"
              >
                <Globe className="h-4 w-4 shrink-0" />
                {COMPANY.website}
              </a>
            </div>

            {/* Social media placeholders */}
            <div className="mt-8">
              <p className="text-sm font-medium text-accent mb-3">Follow Us</p>
              <div className="flex flex-wrap gap-3">
                {SOCIAL.map(({ href, label, icon: Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white/70 hover:bg-primary hover:text-white transition-colors"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />                  </a>
                ))}
              </div>
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h3 className="font-semibold text-accent mb-4">{title}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/70 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <p className="text-sm text-white/50">
            &copy; {new Date().getFullYear()} Rydez India. All rights reserved.
          </p>
          <p className="text-sm text-white/50">
            Hyderabad, Telangana, India ·{" "}
            <a href="https://rydezindia.com" className="hover:text-accent transition-colors">
              rydezindia.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
