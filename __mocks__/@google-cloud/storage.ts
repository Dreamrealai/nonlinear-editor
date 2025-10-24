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
  constructor(config?: { projectId?: string; keyFilename?: string }) {
    // Mock constructor
  }

  bucket(name: string) {
    return {
      file: (filename: string) => ({
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
export function mockUploadSuccess(publicUrl: string) {
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
export function mockFileExists(exists: boolean) {
  mockExists.mockResolvedValue([exists]);
}

/**
 * Helper to mock file download
 */
export function mockDownloadSuccess(content: Buffer | string) {
  const buffer = typeof content === 'string' ? Buffer.from(content) : content;
  mockDownload.mockResolvedValue([buffer]);
}

/**
 * Helper to mock storage error
 */
export function mockStorageError(error: string, code = 500) {
  const errorObj = new Error(error);
  (errorObj as any).code = code;

  mockUpload.mockRejectedValue(errorObj);
  mockDownload.mockRejectedValue(errorObj);
  mockDelete.mockRejectedValue(errorObj);
}

/**
 * Reset all mocks
 */
export function resetStorageMocks() {
  mockUpload.mockReset();
  mockDownload.mockReset();
  mockDelete.mockReset();
  mockExists.mockReset();
  mockGetSignedUrl.mockReset();
  mockMakePublic.mockReset();
  mockGetMetadata.mockReset();
  mockSetMetadata.mockReset();
}
