/**
 * Mock for @google-cloud/storage package
 * Used for testing Google Cloud Storage operations without actual cloud calls
 */

export const mockUpload = jest.fn();
export const mockDownload = jest.fn();
export const mockDelete = jest.fn();
export const mockExists = jest.fn();
export const mockGetSignedUrl = jest.fn();
export const mockMakePublic = jest.fn();
export const mockGetMetadata = jest.fn();
export const mockSetMetadata = jest.fn();

export class Storage {
  constructor(_config?: { projectId?: string; keyFilename?: string }) {
    // Mock constructor
  }

  bucket(_name: string): {
    file: (_filename: string) => unknown;
    upload: typeof mockUpload;
    getFiles: jest.Mock;
    deleteFiles: jest.Mock;
    exists: typeof mockExists;
    create: jest.Mock;
    delete: typeof mockDelete;
  } {
    return {
      file: (_filename: string): unknown => ({
        upload: mockUpload,
        download: mockDownload,
        delete: mockDelete,
        exists: mockExists,
        getSignedUrl: mockGetSignedUrl,
        makePublic: mockMakePublic,
        getMetadata: mockGetMetadata,
        setMetadata: mockSetMetadata,
        save: jest.fn(),
        createWriteStream: jest.fn(),
        createReadStream: jest.fn(),
      }),
      upload: mockUpload,
      getFiles: jest.fn(),
      deleteFiles: jest.fn(),
      exists: mockExists,
      create: jest.fn(),
      delete: mockDelete,
    };
  }
}

/**
 * Helper to mock successful file upload
 */
export function mockUploadSuccess(publicUrl: string): void {
  mockUpload.mockResolvedValue([
    {
      metadata: {
        name: 'test-file.mp4',
        bucket: 'test-bucket',
        size: 1024000,
        contentType: 'video/mp4',
      },
    },
  ]);

  mockMakePublic.mockResolvedValue([]);
  mockGetSignedUrl.mockResolvedValue([publicUrl]);
}

/**
 * Helper to mock file existence check
 */
export function mockFileExists(exists: boolean): void {
  mockExists.mockResolvedValue([exists]);
}

/**
 * Helper to mock file download
 */
export function mockDownloadSuccess(content: Buffer | string): void {
  const buffer = typeof content === 'string' ? Buffer.from(content) : content;
  mockDownload.mockResolvedValue([buffer]);
}

/**
 * Helper to mock storage error
 */
export function mockStorageError(error: string, code = 500): void {
  const errorObj = new Error(error);
  (errorObj as unknown as { code: number }).code = code;

  mockUpload.mockRejectedValue(errorObj);
  mockDownload.mockRejectedValue(errorObj);
  mockDelete.mockRejectedValue(errorObj);
}

/**
 * Reset all mocks
 */
export function resetStorageMocks(): void {
  mockUpload.mockReset();
  mockDownload.mockReset();
  mockDelete.mockReset();
  mockExists.mockReset();
  mockGetSignedUrl.mockReset();
  mockMakePublic.mockReset();
  mockGetMetadata.mockReset();
  mockSetMetadata.mockReset();
}
