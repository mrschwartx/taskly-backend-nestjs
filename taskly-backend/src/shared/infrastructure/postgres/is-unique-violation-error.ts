const UNIQUE_VIOLATION_CODE = '23505';

export const isUniqueViolationError = (error: unknown): boolean =>
  (error as { code?: string } | null | undefined)?.code ===
  UNIQUE_VIOLATION_CODE;
