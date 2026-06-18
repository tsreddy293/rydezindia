import { rmSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const nextDir = join(root, ".next");

try {
  rmSync(nextDir, { recursive: true, force: true });
  console.log("Removed .next cache");
} catch (error) {
  console.error(
    "Could not remove .next — stop all running `npm run dev` terminals first (Ctrl+C), then run again."
  );
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
