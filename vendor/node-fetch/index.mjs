const globalObj = globalThis;

if (!globalObj || typeof globalObj.fetch !== 'function') {
  throw new Error('Global fetch is not available in this runtime. Upgrade to Node 18+ or provide a fetch polyfill.');
}

const fetchImpl = globalObj.fetch.bind(globalObj);
const HeadersCtor = globalObj.Headers;
const RequestCtor = globalObj.Request;
const ResponseCtor = globalObj.Response;
const FormDataCtor = globalObj.FormData ?? null;
const BlobCtor = globalObj.Blob ?? null;
const FileCtor = globalObj.File ?? (BlobCtor
  ? class FilePolyfill extends BlobCtor {
      constructor(parts, name, options = {}) {
        super(parts, options);
        this.name = name;
        this.lastModified = options.lastModified ?? Date.now();
      }
    }
  : null);
const AbortControllerCtor = globalObj.AbortController;
const AbortSignalCtor = globalObj.AbortSignal;

if (!HeadersCtor || !RequestCtor || !ResponseCtor) {
  throw new Error('Fetch globals are not fully available in this runtime.');
}

class FetchError extends Error {
  constructor(message, type = 'system', systemError) {
    super(message);
    this.name = 'FetchError';
    this.type = type;
    if (systemError && typeof systemError === 'object') {
      const { errno, code, syscall } = systemError;
      if (errno !== undefined) this.errno = errno;
      if (code !== undefined) this.code = code;
      if (syscall !== undefined) this.syscall = syscall;
    }
  }
}

class AbortError extends FetchError {
  constructor(message = 'The operation was aborted') {
    super(message, 'aborted');
    this.name = 'AbortError';
  }
}

const isRedirect = (code) => [301, 302, 303, 307, 308].includes(code);

const fetchWrapper = (...args) => fetchImpl(...args);

fetchWrapper.Headers = HeadersCtor;
fetchWrapper.Request = RequestCtor;
fetchWrapper.Response = ResponseCtor;
fetchWrapper.FormData = FormDataCtor;
fetchWrapper.Blob = BlobCtor;
fetchWrapper.File = FileCtor;
fetchWrapper.AbortController = AbortControllerCtor;
fetchWrapper.AbortSignal = AbortSignalCtor;
fetchWrapper.FetchError = FetchError;
fetchWrapper.AbortError = AbortError;
fetchWrapper.isRedirect = isRedirect;
fetchWrapper.default = fetchWrapper;

export default fetchWrapper;
export {
  fetchWrapper as fetch,
  HeadersCtor as Headers,
  RequestCtor as Request,
  ResponseCtor as Response,
  FormDataCtor as FormData,
  BlobCtor as Blob,
  FileCtor as File,
  AbortControllerCtor as AbortController,
  AbortSignalCtor as AbortSignal,
  FetchError,
  AbortError,
  isRedirect,
};
