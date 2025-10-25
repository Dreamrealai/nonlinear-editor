/// <reference types="node" />

type RequestInfo = globalThis.RequestInfo;
type RequestInit = globalThis.RequestInit;

declare function fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;

declare namespace fetch {
  const default: typeof fetch;
  const Headers: typeof globalThis.Headers;
  const Request: typeof globalThis.Request;
  const Response: typeof globalThis.Response;
  const FormData: typeof globalThis.FormData;
  const Blob: typeof globalThis.Blob;
  const File: typeof globalThis.File;
  const AbortController: typeof globalThis.AbortController;
  const AbortSignal: typeof globalThis.AbortSignal;
  const FetchError: typeof FetchError;
  const AbortError: typeof AbortError;
  function isRedirect(code: number): boolean;
}

export declare class FetchError extends Error {
  constructor(message: string, type?: string, systemError?: NodeJS.ErrnoException | null);
  type: string;
  errno?: number | string;
  code?: string;
  syscall?: string;
}

export declare class AbortError extends FetchError {
  constructor(message?: string);
}

export declare const Headers: typeof globalThis.Headers;
export declare const Request: typeof globalThis.Request;
export declare const Response: typeof globalThis.Response;
export declare const FormData: typeof globalThis.FormData;
export declare const Blob: typeof globalThis.Blob;
export declare const File: typeof globalThis.File;
export declare const AbortController: typeof globalThis.AbortController;
export declare const AbortSignal: typeof globalThis.AbortSignal;
export declare const isRedirect: (code: number) => boolean;

export { fetch as default, fetch, Headers, Request, Response, FormData, Blob, File, AbortController, AbortSignal, FetchError, AbortError, isRedirect };
