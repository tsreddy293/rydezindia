import Link from "next/link";

export default function BookingMinimalFooter() {
  return (
    <footer className="border-t border-gray-100 bg-white py-5">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-500">
          <Link href="/privacy-policy" className="hover:text-primary transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms-and-conditions" className="hover:text-primary transition-colors">
            Terms &amp; Conditions
          </Link>
          <Link href="/contact-us" className="hover:text-primary transition-colors">
            Support
          </Link>
        </nav>
        <p className="text-xs text-gray-400">© Rydez India</p>
      </div>
    </footer>
  );
}
