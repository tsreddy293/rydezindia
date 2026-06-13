import PageLayout from "@/components/layout/PageLayout";

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export default function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <PageLayout>
      <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
        <h1 className="text-3xl md:text-4xl font-bold text-secondary mb-2">{title}</h1>
        <p className="text-sm text-gray-500 mb-10">Last updated: {lastUpdated}</p>
        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          {children}
        </div>
      </div>
    </PageLayout>
  );
}
