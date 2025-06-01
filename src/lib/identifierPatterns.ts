export const identifierPatterns: Record<string, RegExp> = {
  // 1. Basic programming language function or variable name, only allow string separated with underscore (_) (default)
  standard: /^[a-zA-Z_][a-zA-Z0-9_]*/,

  // 2. Extended with hyphens (good for CSS, HTML, kebab-case)
  withHyphens: /^[a-zA-Z_][a-zA-Z0-9_-]*/,

  // 3. More permissive - allows hyphens and dots
  permissive: /^[a-zA-Z_][a-zA-Z0-9_.-]*/,

  // 4. CSS-like identifiers (can start with hyphen too)
  cssLike: /^-?[a-zA-Z_][a-zA-Z0-9_-]*/,

  // 5. Unicode-aware (supports international characters)
  unicode: /^[\p{L}_][\p{L}\p{N}_-]*/u,

  // 6. Very permissive (almost anything except whitespace and common delimiters)
  veryPermissive: /^[^\s\(\)\[\]{},;:"'`<>=+*/\\|&!?]*/,

  // 7. Custom boundary-aware pattern
  boundaryAware: /^[a-zA-Z_][a-zA-Z0-9_-]*(?![a-zA-Z0-9_-])/
}
