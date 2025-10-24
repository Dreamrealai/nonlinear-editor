import { useState, useCallback, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import { browserLogger } from '@/lib/browserLogger';

interface Voice {
  voice_id: string;
  name: string;
  category?: string;
}

interface UseAudioGenerationProps {
  projectId: string;
}

const MAX_RETRIES = 120; // Maximum 120 retries (10 minutes at 5s intervals)

export function useAudioGeneration({ projectId }: UseAudioGenerationProps) {
  const [generating, setGenerating] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [audioType, setAudioType] = useState<'music' | 'voice' | 'sfx'>('music');

  // Track polling state for cleanup
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef<number>(0);

  // Music generation state (Suno)
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('');
  const [title, setTitle] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [instrumental, setInstrumental] = useState(false);

  // Voice generation state (ElevenLabs)
  const [voiceText, setVoiceText] = useState('');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('EXAVITQu4vr4xnSDxMaL'); // Default: Sarah
  const [loadingVoices, setLoadingVoices] = useState(false);

  // Sound effects generation state (ElevenLabs)
  const [sfxPrompt, setSfxPrompt] = useState('');
  const [sfxDuration, setSfxDuration] = useState(5.0);

  // Cleanup function to stop polling
  const cleanupPolling = useCallback((): void => {
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    retryCountRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect((): () => void => {
    return (): void => {
      cleanupPolling();
    };
  }, [cleanupPolling]);

  // Fetch available voices when switching to voice tab
  useEffect((): void => {
    const fetchVoices = async (): Promise<void> => {
      if (audioType === 'voice' && voices.length === 0) {
        setLoadingVoices(true);
        try {
          const res = await fetch('/api/audio/elevenlabs/voices');
          const json = await res.json();

          if (res.ok && json.voices) {
            setVoices(json.voices);
          } else {
            browserLogger.error({ error: json.error }, 'Failed to fetch voices');
            toast.error('Failed to load voices');
          }
        } catch (error) {
          browserLogger.error({ error }, 'Error fetching voices');
          toast.error('Failed to load voices');
        } finally {
          setLoadingVoices(false);
        }
      }
    };

    fetchVoices();
  }, [audioType, voices.length]);

  const handleGenerateMusic = useCallback(
    async (e: React.FormEvent): Promise<void> => {
      e.preventDefault();

      if (!prompt.trim() && !customMode) {
        toast.error('Please enter a prompt');
        return;
      }

      if (customMode && !style.trim()) {
        toast.error('Please enter a style for custom mode');
        return;
      }

      setGenerating(true);
      toast.loading('Starting music generation...', { id: 'generate-audio' });

      try {
        const res = await fetch('/api/audio/suno/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            prompt,
            style: customMode ? style : undefined,
            title: title.trim() || undefined,
            customMode,
            instrumental,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || 'Music generation failed');
        }

        setTaskId(json.taskId);
        toast.loading('Music generation in progress... This may take 1-2 minutes.', {
          id: 'generate-audio',
        });

        // Clean up any existing polling
        cleanupPolling();
        retryCountRef.current = 0;

        // Poll for music generation status
        const pollInterval = 5000; // 5 seconds
        const poll = async (): Promise<void> => {
          // Check max retries
          if (retryCountRef.current >= MAX_RETRIES) {
            cleanupPolling();
            toast.error(`Music generation timed out after ${MAX_RETRIES} attempts`, {
              id: 'generate-audio',
            });
            setGenerating(false);
            setTaskId(null);
            return;
          }

          retryCountRef.current++;

          try {
            // Create AbortController for this request
            abortControllerRef.current = new AbortController();

            const statusRes = await fetch(
              `/api/audio/suno/status?taskId=${encodeURIComponent(json.taskId)}&projectId=${projectId}`,
              { signal: abortControllerRef.current.signal }
            );
            const statusJson = await statusRes.json();

            if (statusJson.status === 'completed') {
              cleanupPolling();
              toast.success('Music generated successfully!', { id: 'generate-audio' });
              setGenerating(false);
              setTaskId(null);

              // Reset form
              setPrompt('');
              setStyle('');
              setTitle('');
            } else if (statusJson.status === 'failed') {
              cleanupPolling();
              throw new Error(statusJson.error || 'Music generation failed');
            } else {
              // Continue polling
              pollingTimeoutRef.current = setTimeout(poll, pollInterval);
            }
          } catch (pollError) {
            // Ignore abort errors
            if (pollError instanceof Error && pollError.name === 'AbortError') {
              return;
            }

            cleanupPolling();
            browserLogger.error({ error: pollError, projectId }, 'Music generation polling failed');
            toast.error(
              pollError instanceof Error ? pollError.message : 'Music generation failed',
              { id: 'generate-audio' }
            );
            setGenerating(false);
            setTaskId(null);
          }
        };

        pollingTimeoutRef.current = setTimeout(poll, pollInterval);
      } catch (error) {
        cleanupPolling();
        browserLogger.error({ error, projectId }, 'Music generation failed');
        toast.error(error instanceof Error ? error.message : 'Music generation failed', {
          id: 'generate-audio',
        });
        setGenerating(false);
      }
    },
    [projectId, prompt, style, title, customMode, instrumental, cleanupPolling]
  );

  const handleGenerateVoice = useCallback(
    async (e: React.FormEvent): Promise<void> => {
      e.preventDefault();

      if (!voiceText.trim()) {
        toast.error('Please enter text to convert to speech');
        return;
      }

      setGenerating(true);
      toast.loading('Generating voice...', { id: 'generate-voice' });

      try {
        const res = await fetch('/api/audio/elevenlabs/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            text: voiceText,
            voiceId: selectedVoice,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || 'Voice generation failed');
        }

        toast.success('Voice generated successfully!', { id: 'generate-voice' });

        // Reset form
        setVoiceText('');
      } catch (error) {
        browserLogger.error({ error, projectId }, 'Voice generation failed');
        toast.error(error instanceof Error ? error.message : 'Voice generation failed', {
          id: 'generate-voice',
        });
      } finally {
        setGenerating(false);
      }
    },
    [projectId, voiceText, selectedVoice]
  );

  const handleGenerateSFX = useCallback(
    async (e: React.FormEvent): Promise<void> => {
      e.preventDefault();

      if (!sfxPrompt.trim()) {
        toast.error('Please enter a description for the sound effect');
        return;
      }

      setGenerating(true);
      toast.loading('Generating sound effect...', { id: 'generate-sfx' });

      try {
        const res = await fetch('/api/audio/elevenlabs/sfx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            prompt: sfxPrompt,
            duration: sfxDuration,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || 'Sound effect generation failed');
        }

        toast.success('Sound effect generated successfully!', { id: 'generate-sfx' });

        // Reset form
        setSfxPrompt('');
      } catch (error) {
        browserLogger.error({ error, projectId }, 'Sound effect generation failed');
        toast.error(error instanceof Error ? error.message : 'Sound effect generation failed', {
          id: 'generate-sfx',
        });
      } finally {
        setGenerating(false);
      }
    },
    [projectId, sfxPrompt, sfxDuration]
  );

  return {
    // State
    generating,
    taskId,
    audioType,
    setAudioType,

    // Music state
    prompt,
    setPrompt,
    style,
    setStyle,
    title,
    setTitle,
    customMode,
    setCustomMode,
    instrumental,
    setInstrumental,

    // Voice state
    voiceText,
    setVoiceText,
    voices,
    selectedVoice,
    setSelectedVoice,
    loadingVoices,

    // SFX state
    sfxPrompt,
    setSfxPrompt,
    sfxDuration,
    setSfxDuration,

    // Handlers
    handleGenerateMusic,
    handleGenerateVoice,
    handleGenerateSFX,
  };
}
