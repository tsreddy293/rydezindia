import { cn } from "@/lib/utils";

export default function OwnerSection({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  id?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("animate-in fade-in duration-500", className)}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-secondary md:text-xl">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
