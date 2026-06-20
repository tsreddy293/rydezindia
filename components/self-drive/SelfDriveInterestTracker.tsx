"use client";

import { useEffect } from "react";
import { recordSelfDriveInterestAction } from "@/server/actions/selfDrive";

/** Marks self-drive interest when a logged-in rider views self-drive search. */
export default function SelfDriveInterestTracker() {
  useEffect(() => {
    void recordSelfDriveInterestAction();
  }, []);

  return null;
}
