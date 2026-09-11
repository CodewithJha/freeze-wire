/** Domain status codes. Persistence and transitions are on-chain (Phase 2+). */
export const Status = {
  ELIGIBLE: 0,
  RESTRICTED: 1,
} as const;

export type Status = (typeof Status)[keyof typeof Status];
