import type { SupabaseClient } from '@supabase/supabase-js';
import type { BaseAssetRow } from '@/types/assets';
import * as frameUtils from '@/lib/utils/frameUtils';

describe('frameUtils utilities', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('createAssetMap indexes assets by id', () => {
    const assets: BaseAssetRow[] = [
      {
        id: 'asset-1',
        storage_url: 'supabase://assets/asset-1',
        metadata: { filename: 'video.mp4' },
        title: 'Test asset',
      },
    ];

    const map = frameUtils.createAssetMap(assets);

    expect(map.size).toBe(1);
    expect(map.get('asset-1')).toBe(assets[0]);
  });

  it('generateFrameFileName includes asset id and suffix', () => {
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_654_321_000_000);

    const name = frameUtils.generateFrameFileName('asset-42', 'preview');

    expect(name).toBe('asset-42/custom/1654321000000-preview.png');

    nowSpy.mockRestore();
  });

  it('insertSceneFrame forwards payload to Supabase', async () => {
    const insertMock = jest.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: jest.fn(() => ({ insert: insertMock })),
    } as unknown as SupabaseClient;

    await frameUtils.insertSceneFrame(supabase, {
      projectId: 'project-1',
      assetId: 'asset-9',
      kind: 'custom',
      timeMs: 1234,
      storagePath: 'supabase://frames/asset-9/frame.png',
      width: 1920,
      height: 1080,
    });

    expect(supabase.from).toHaveBeenCalledWith('scene_frames');
    expect(insertMock).toHaveBeenCalledWith({
      project_id: 'project-1',
      asset_id: 'asset-9',
      scene_id: null,
      kind: 'custom',
      t_ms: 1234,
      storage_path: 'supabase://frames/asset-9/frame.png',
      width: 1920,
      height: 1080,
    });
  });

  it('insertSceneFrame throws on Supabase error', async () => {
    const supabaseError = new Error('insert failed');
    const insertMock = jest.fn().mockResolvedValue({ error: supabaseError });
    const supabase = {
      from: jest.fn(() => ({ insert: insertMock })),
    } as unknown as SupabaseClient;

    await expect(
      frameUtils.insertSceneFrame(supabase, {
        projectId: 'project-1',
        assetId: 'asset-9',
        kind: 'custom',
        timeMs: 0,
        storagePath: 'supabase://frames/a.png',
        width: 100,
        height: 100,
      })
    ).rejects.toBe(supabaseError);
  });

  it('uploadFrameBlob uploads to frames bucket and returns storage url', async () => {
    const uploadMock = jest.fn().mockResolvedValue({ error: null });
    const storageFromMock = jest.fn(() => ({ upload: uploadMock }));
    const supabase = {
      storage: { from: storageFromMock },
    } as unknown as SupabaseClient;

    const blob = new Blob(['frame-bytes'], { type: 'image/png' });
    const result = await frameUtils.uploadFrameBlob(
      supabase,
      'asset-9/custom/frame.png',
      blob,
      'image/png'
    );

    expect(storageFromMock).toHaveBeenCalledWith('frames');
    expect(uploadMock).toHaveBeenCalledWith('asset-9/custom/frame.png', blob, {
      contentType: 'image/png',
      upsert: false,
    });
    expect(result).toBe('supabase://frames/asset-9/custom/frame.png');
  });

  it('uploadFrameBlob throws on storage error', async () => {
    const uploadError = new Error('upload failed');
    const uploadMock = jest.fn().mockResolvedValue({ error: uploadError });
    const supabase = {
      storage: { from: jest.fn(() => ({ upload: uploadMock })) },
    } as unknown as SupabaseClient;

    await expect(
      frameUtils.uploadFrameBlob(supabase, 'asset/frame.png', new Blob(), 'image/png')
    ).rejects.toBe(uploadError);
  });

  it('extractVideoFrame captures a frame to canvas', async () => {
    const drawImage = jest.fn();
    const toBlob = jest.fn((callback: (blob: Blob | null) => void) => {
      callback(new Blob(['frame'], { type: 'image/png' }));
    });

    const canvas = {
      width: 0,
      height: 0,
      getContext: jest.fn(() => ({ drawImage })),
      toBlob,
    } as unknown as HTMLCanvasElement;

    const video = {
      videoWidth: 640,
      videoHeight: 360,
    } as HTMLVideoElement;

    const result = await frameUtils.extractVideoFrame(video, canvas);

    expect(canvas.width).toBe(640);
    expect(canvas.height).toBe(360);
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 640, 360);
    expect(result.width).toBe(640);
    expect(result.height).toBe(360);
    expect(result.blob).toBeInstanceOf(Blob);
  });

  it('loadImageFromFile resolves dimensions from image load', async () => {
    const originalImage = global.Image;
    const revokeSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');

    class MockImage {
      width = 800;
      height = 600;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;

      set src(_value: string) {
        this.onload?.();
      }
    }

    // @ts-expect-error override for test environment
    global.Image = MockImage;

    try {
      const file = new File(['image'], 'frame.png', { type: 'image/png' });
      const result = await frameUtils.loadImageFromFile(file);

      expect(result.width).toBe(800);
      expect(result.height).toBe(600);
      expect(revokeSpy).toHaveBeenCalledWith('blob:mock-url');
    } finally {
      global.Image = originalImage;
    }
  });

  it('extractAndSaveVideoFrame orchestrates upload and database insert', async () => {
    const supabase = {} as unknown as SupabaseClient;
    const mockBlob = new Blob(['frame']);

    const extractSpy = jest
      .spyOn(frameUtils, 'extractVideoFrame')
      .mockResolvedValue({ blob: mockBlob, width: 1280, height: 720 });
    const generateSpy = jest
      .spyOn(frameUtils, 'generateFrameFileName')
      .mockReturnValue('asset-7/custom/frame.png');
    const uploadSpy = jest
      .spyOn(frameUtils, 'uploadFrameBlob')
      .mockResolvedValue('supabase://frames/asset-7/custom/frame.png');
    const insertSpy = jest.spyOn(frameUtils, 'insertSceneFrame').mockResolvedValue(undefined);

    const video = { currentTime: 2.5 } as HTMLVideoElement;
    const canvas = {} as HTMLCanvasElement;
    const assets: BaseAssetRow[] = [
      {
        id: 'asset-7',
        storage_url: 'supabase://assets/asset-7',
        metadata: { project_id: 'project-77' },
        title: null,
      },
    ];

    await frameUtils.extractAndSaveVideoFrame(supabase, video, canvas, 'asset-7', assets);

    expect(extractSpy).toHaveBeenCalledWith(video, canvas);
    expect(generateSpy).toHaveBeenCalledWith('asset-7', '2500ms');
    expect(uploadSpy).toHaveBeenCalledWith(
      supabase,
      'asset-7/custom/frame.png',
      mockBlob,
      'image/png'
    );
    expect(insertSpy).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        projectId: 'project-77',
        assetId: 'asset-7',
        storagePath: 'supabase://frames/asset-7/custom/frame.png',
        width: 1280,
        height: 720,
        timeMs: 2500,
      })
    );
  });

  it('uploadAndSaveImageFrame uploads file and logs frame metadata', async () => {
    const supabase = {} as unknown as SupabaseClient;
    const mockFile = new File(['image-bytes'], 'still.png', { type: 'image/png' });

    const loadSpy = jest.spyOn(frameUtils, 'loadImageFromFile').mockResolvedValue({
      img: {} as HTMLImageElement,
      width: 640,
      height: 480,
    });
    const generateSpy = jest
      .spyOn(frameUtils, 'generateFrameFileName')
      .mockReturnValue('asset-3/custom/still.png');
    const uploadSpy = jest
      .spyOn(frameUtils, 'uploadFrameBlob')
      .mockResolvedValue('supabase://frames/asset-3/custom/still.png');
    const insertSpy = jest.spyOn(frameUtils, 'insertSceneFrame').mockResolvedValue(undefined);

    const assets: BaseAssetRow[] = [
      {
        id: 'asset-3',
        storage_url: 'supabase://assets/asset-3',
        metadata: { project_id: 'project-5' },
        title: null,
      },
    ];

    await frameUtils.uploadAndSaveImageFrame(supabase, mockFile, 'asset-3', assets, 500);

    expect(loadSpy).toHaveBeenCalledWith(mockFile);
    expect(generateSpy).toHaveBeenCalledWith('asset-3', mockFile.name);
    expect(uploadSpy).toHaveBeenCalledWith(
      supabase,
      'asset-3/custom/still.png',
      mockFile,
      'image/png'
    );
    expect(insertSpy).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        projectId: 'project-5',
        assetId: 'asset-3',
        storagePath: 'supabase://frames/asset-3/custom/still.png',
        width: 640,
        height: 480,
        timeMs: 500,
      })
    );
  });
});
