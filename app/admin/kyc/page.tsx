import { AdminPageShell, AdminTable } from "@/components/admin/AdminTable";
import { getAdminOwnerKycList } from "@/lib/supabase/queries";
import { updateOwnerKycByUserId } from "@/server/actions/phase2Admin";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

function DocumentLinks({
  documents,
}: {
  documents: {
    aadhaar?: string;
    pan?: string;
    license?: string;
    rc?: string;
    insurance?: string;
  };
}) {
  const entries = [
    { label: "Aadhaar", url: documents.aadhaar },
    { label: "PAN", url: documents.pan },
    { label: "License", url: documents.license },
    { label: "RC", url: documents.rc },
    { label: "Insurance", url: documents.insurance },
  ].filter((entry) => entry.url);

  if (entries.length === 0) {
    return <span className="text-xs text-gray-400">No uploads yet</span>;
  }

  return (
    <div className="space-y-1 text-xs">
      {entries.map((entry) => (
        <a
          key={entry.label}
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-primary underline"
        >
          View {entry.label}
        </a>
      ))}
    </div>
  );
}

export default async function AdminKycPage() {
  await requireRole("admin");
  const rows = await getAdminOwnerKycList();

  return (
    <AdminPageShell
      title="Owner KYC"
      description="Review owner identity and registration documents"
    >
      <AdminTable
        headers={[
          "Owner Name",
          "Email",
          "Mobile",
          "Aadhaar",
          "Driving License",
          "Status",
          "Documents",
          "Actions",
        ]}
        rows={rows.map((owner) => [
          owner.name,
          owner.email || "-",
          owner.mobile || "-",
          owner.aadhaar,
          owner.license,
          owner.status,
          <DocumentLinks key="docs" documents={owner.documents} />,
          <div key="actions" className="flex flex-wrap gap-2">
            <form
              action={async () => {
                "use server";
                await updateOwnerKycByUserId(owner.id, "approved");
              }}
            >
              <button className="rounded-lg border px-3 py-1 text-xs text-green-700 hover:bg-green-50">
                Approve
              </button>
            </form>
            <form
              action={async () => {
                "use server";
                await updateOwnerKycByUserId(owner.id, "rejected");
              }}
            >
              <button className="rounded-lg border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50">
                Reject
              </button>
            </form>
          </div>,
        ])}
      />
    </AdminPageShell>
  );
}
