/** Encode flexible protection in special_instructions when DB protection columns are absent. */

const PROTECTION_MARKER = /\[rydez:protection fee=(\d+(?:\.\d+)?)\]/i;

export function appendProtectionToInstructions(
  instructions: string | null | undefined,
  fee: number
): string {
  const base = String(instructions ?? "")
    .replace(PROTECTION_MARKER, "")
    .trim();
  const marker = `[rydez:protection fee=${fee}]`;
  return base ? `${base}\n${marker}` : marker;
}

export function parseProtectionFromInstructions(instructions?: string | null): {
  selected: boolean;
  fee: number;
} {
  const match = String(instructions ?? "").match(PROTECTION_MARKER);
  if (!match) return { selected: false, fee: 0 };
  const fee = Number(match[1]);
  return { selected: fee > 0, fee: Number.isFinite(fee) ? fee : 0 };
}

export function stripProtectionMarker(instructions?: string | null): string {
  return String(instructions ?? "")
    .replace(PROTECTION_MARKER, "")
    .trim();
}
