interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  as?: "input" | "textarea" | "select";
  options?: { value: string; label: string }[];
  rows?: number;
}

export default function FormField({
  label,
  name,
  type = "text",
  placeholder,
  required,
  defaultValue,
  as = "input",
  options,
  rows = 4,
}: FormFieldProps) {
  const baseClass =
    "w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition";

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {as === "textarea" ? (
        <textarea id={name} name={name} rows={rows} placeholder={placeholder} required={required} defaultValue={defaultValue} className={baseClass} />
      ) : as === "select" ? (
        <select id={name} name={name} required={required} defaultValue={defaultValue} className={baseClass}>
          <option value="">Select {label}</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : (
        <input id={name} name={name} type={type} placeholder={placeholder} required={required} defaultValue={defaultValue} className={baseClass} />
      )}
    </div>
  );
}
