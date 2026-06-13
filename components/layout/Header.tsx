"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, Car } from "lucide-react";
import Button from "@/components/ui/Button";

const NAV_LINKS = [
  { href: "/#search", label: "Book" },
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/investors", label: "Investors" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-gray-200/50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white transition-transform group-hover:scale-105">
            <Car className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xl font-bold text-secondary">Rydez</span>
            <span className="text-xl font-bold text-primary"> India</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-700 transition-colors hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button href="/owner/register" variant="outline" size="sm">
            List Your Car
          </Button>
          <Button href="/user/register" variant="primary" size="sm">
            Sign Up
          </Button>
        </div>

        <button
          className="lg:hidden p-2 text-secondary"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-gray-200 bg-white px-4 py-6">
          <nav className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-base font-medium text-gray-700"
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-4 flex flex-col gap-3">
              <Button href="/owner/register" variant="outline" size="sm">
                List Your Car
              </Button>
              <Button href="/user/register" variant="primary" size="sm">
                Sign Up
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
