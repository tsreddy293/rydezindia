const STEPS = [
  { id: 1, label: "Vehicle Details" },
  { id: 2, label: "Photos" },
  { id: 3, label: "Documents" },
  { id: 4, label: "Submit" },
];

interface Props {
  currentStep?: number;
}

export default function VehicleOnboardingSteps({ currentStep = 1 }: Props) {
  return (
    <ol className="mb-8 flex flex-wrap gap-2 md:gap-0 md:justify-between">
      {STEPS.map((step, index) => {
        const active = step.id === currentStep;
        const done = step.id < currentStep;
        return (
          <li
            key={step.id}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs md:text-sm font-medium ${
              active
                ? "bg-primary text-white"
                : done
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-50 text-gray-500"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                active ? "bg-white/20" : done ? "bg-green-200" : "bg-gray-200"
              }`}
            >
              {done ? "✓" : step.id}
            </span>
            {step.label}
            {index < STEPS.length - 1 && (
              <span className="hidden md:inline text-gray-300 ml-2">→</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
