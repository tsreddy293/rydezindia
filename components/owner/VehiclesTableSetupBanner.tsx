"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import Button from "@/components/ui/Button";

interface Props {
  sql: string;
  projectUrl: string;
}

export default function VehiclesTableSetupBanner({ sql, projectUrl }: Props) {
  const [copied, setCopied] = useState(false);

  const sqlEditorUrl = projectUrl.includes("supabase.com/dashboard/project")
    ? `${projectUrl.replace(/\/$/, "")}/sql/new`
    : "https://supabase.com/dashboard";

  async function copySql() {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="text-lg font-bold text-amber-900">Database setup required</h2>
      <p className="mt-2 text-sm text-amber-800">
        The <code className="rounded bg-amber-100 px-1">public.vehicles</code> table has not been created in
        Supabase yet. Copy <strong>only</strong> the SQL below — do not paste migration filenames like{" "}
        <code className="rounded bg-amber-100 px-1">003_bootstrap...</code> at the end.
      </p>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-amber-900">
        <li>Open Supabase SQL Editor</li>
        <li>Paste the SQL below and click <strong>Run</strong></li>
        <li>Return here and submit your vehicle again</li>
      </ol>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" variant="primary" size="sm" onClick={copySql}>
          {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy SQL</>}
        </Button>
        <a
          href={sqlEditorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl border-2 border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-white transition-colors"
        >
          Open SQL Editor
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      <pre className="mt-4 max-h-48 overflow-auto rounded-xl bg-gray-900 p-4 text-xs text-green-300">
        {sql.slice(0, 1200)}
        {sql.length > 1200 ? "\n... (use Copy SQL for full script)" : ""}
      </pre>
    </div>
  );
}
