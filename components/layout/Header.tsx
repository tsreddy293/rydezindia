"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu, X, Car } from "lucide-react";
import Button from "@/components/ui/Button";

const NAV_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/investors", label: "Investors" },
  { href: "/contact", label: "Contact" },
];

const BOOK_LINKS = [
  { href: "/search-return", label: "Return Journey" },
  { href: "/search-self-drive", label: "Self Drive" },
  { href: "/search-driver", label: "With Driver" },
];

const REGISTER_LINKS = [
  { href: "/vehicles/add", label: "Return Journey Vehicle" },
  { href: "/vehicles/self-drive", label: "Self Drive Vehicle" },
  { href: "/vehicles/driver", label: "Driver Vehicle" },
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
          <div className="group relative">
            <button className="flex items-center gap-1 text-sm font-medium text-gray-700 transition-colors hover:text-primary">
              Book <ChevronDown className="h-4 w-4" />
            </button>
            <div className="invisible absolute left-0 top-full z-50 mt-3 w-52 rounded-2xl border border-gray-100 bg-white p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
              {BOOK_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-xl px-4 py-2 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="group relative">
            <button className="flex items-center gap-1 text-sm font-medium text-gray-700 transition-colors hover:text-primary">
              Register Vehicle <ChevronDown className="h-4 w-4" />
            </button>
            <div className="invisible absolute left-0 top-full z-50 mt-3 w-60 rounded-2xl border border-gray-100 bg-white p-2 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
              {REGISTER_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-xl px-4 py-2 text-sm text-gray-700 hover:bg-primary/5 hover:text-primary"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
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
          <Button href="/owner/login" variant="outline" size="sm">
            Owner Panel
          </Button>
          <Button href="/login" variant="ghost" size="sm">
            Login
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
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Book</p>
              <div className="flex flex-col gap-3">
                {BOOK_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-base font-medium text-gray-700"
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Register Vehicle</p>
              <div className="flex flex-col gap-3">
                {REGISTER_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-base font-medium text-gray-700"
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
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
              <Button href="/owner/login" variant="outline" size="sm">
                Owner Panel
              </Button>
              <Button href="/login" variant="ghost" size="sm">
                Login
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
