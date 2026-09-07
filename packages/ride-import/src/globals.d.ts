/**
 * This package is isomorphic: it runs in a browser, in Node, and in a future
 * service. Rather than pulling in the DOM or Node type libraries — either of
 * which would let `document` or `fs` slip in unnoticed — it declares the two
 * platform globals it actually uses.
 */
declare class TextDecoder {
  constructor(label?: string);
  decode(input?: ArrayBufferView | ArrayBuffer): string;
}
