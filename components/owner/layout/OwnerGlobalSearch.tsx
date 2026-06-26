"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";

export default function OwnerGlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ type: string; label: string; sublabel: string; href: string }>>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const res = await fetch(`/api/owner/search?q=${encodeURIComponent(q)}`);
    const data = (await res.json()) as { results: typeof results };
    setResults(data.results ?? []);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative flex-1 max-w-md" ref={ref}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search vehicles, registration…"
        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-10 pr-4 text-sm outline-none focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
      />
      {open && query.length >= 2 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border bg-white shadow-lg">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No results</p>
          ) : (
            <ul className="py-1">
              {results.map((r, i) => (
                <li key={`${r.label}-${i}`}>
                  <Link href={r.href} onClick={() => { setOpen(false); setQuery(""); }} className="block px-4 py-2.5 hover:bg-gray-50">
                    <p className="text-sm font-medium">{r.label}</p>
                    <p className="text-xs text-gray-500">{r.sublabel}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
