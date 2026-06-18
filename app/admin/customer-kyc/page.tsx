import { AdminPageShell, AdminTable } from "@/components/admin/AdminTable";
import { getAdminCustomerKycList } from "@/lib/supabase/queries";
import { updateCustomerKycByUserId } from "@/server/actions/phase2Admin";
import { requireRole } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

function DocumentLinks({
  documents,
}: {
  documents: {
    aadhaar?: string;
    license?: string;
    selfie?: string;
  };
}) {
  const entries = [
    { label: "Aadhaar", url: documents.aadhaar },
    { label: "License", url: documents.license },
    { label: "Selfie", url: documents.selfie },
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

export default async function AdminCustomerKycPage() {
  await requireRole("admin");
  const rows = await getAdminCustomerKycList();

  return (
    <AdminPageShell title="Customer KYC" description="Review rider identity documents">
      <AdminTable
        headers={["Name", "Email", "Mobile", "Aadhaar", "Status", "Documents", "Actions"]}
        rows={rows.map((customer) => [
          customer.name,
          customer.email || "-",
          customer.mobile || "-",
          customer.aadhaar,
          customer.status,
          <DocumentLinks key="docs" documents={customer.documents} />,
          <div key="actions" className="flex flex-wrap gap-2">
            <form
              action={async () => {
                "use server";
                await updateCustomerKycByUserId(customer.id, "verified");
              }}
            >
              <button className="rounded-lg border px-3 py-1 text-xs text-green-700 hover:bg-green-50">
                Approve
              </button>
            </form>
            <form
              action={async () => {
                "use server";
                await updateCustomerKycByUserId(customer.id, "rejected", "Rejected by admin");
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
