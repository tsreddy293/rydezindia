"use client";

import { createContext, useContext, type ReactNode } from "react";

const BookingAuthContext = createContext(false);

export function BookingAuthProvider({
  authed,
  children,
}: {
  authed: boolean;
  children: ReactNode;
}) {
  return <BookingAuthContext.Provider value={authed}>{children}</BookingAuthContext.Provider>;
}

/** True only after client session verification succeeded inside BookingAuthGate. */
export function useBookingAuthReady(): boolean {
  return useContext(BookingAuthContext);
}
