declare module 'uuid' {
  export function v4(): string;
  export function v4(options?: { random?: number[]; rng?: () => number[] }): string;
  export function v4(options?: { random?: number[]; rng?: () => number[]; buffer?: number[] | Uint8Array; offset?: number }): string | Uint8Array;
}
