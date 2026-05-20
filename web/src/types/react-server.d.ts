// Makes this file a TypeScript module so the block below is treated as a
// module augmentation (merges with existing React types) rather than a
// module declaration (which would replace all React exports).
export {};

// React.cache is available in Next.js 14 App Router via React's canary/RSC build.
// @types/react@18.3 does not yet include it in the stable declarations.
declare module 'react' {
  export function cache<CachedFunction extends Function>(fn: CachedFunction): CachedFunction;
}
