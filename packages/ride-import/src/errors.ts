export type ImportProblemCode =
  | 'UNSUPPORTED_FORMAT'
  | 'PARSE_FAILED'
  | 'TOO_FEW_POINTS'
  | 'NO_ELEVATION'
  | 'NO_CLIMBS';

export interface ImportProblem {
  readonly code: ImportProblemCode;
  /** Shown to the user verbatim, so write it for a person, not a log. */
  readonly message: string;
  readonly cause?: unknown;
}

export type Result<T, E = ImportProblem> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const fail = <E>(error: E): Result<never, E> => ({ ok: false, error });

export function problem(code: ImportProblemCode, message: string, cause?: unknown): ImportProblem {
  return { code, message, cause };
}
