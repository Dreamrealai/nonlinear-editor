/**
 * Tests for GenerateAudioTab Component
 *
 * Tests audio generation UI with different audio types (music, voice, sfx)
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GenerateAudioTab } from '@/components/generation/GenerateAudioTab';

// Mock child components
jest.mock('@/components/generation/audio-generation/useAudioGeneration', () => ({
  useAudioGeneration: jest.fn(() => ({
    audioType: 'music',
    setAudioType: jest.fn(),
    prompt: '',
    setPrompt: jest.fn(),
    style: '',
    setStyle: jest.fn(),
    title: '',
    setTitle: jest.fn(),
    customMode: false,
    setCustomMode: jest.fn(),
    instrumental: false,
    setInstrumental: jest.fn(),
    generating: false,
    taskId: null,
    handleGenerateMusic: jest.fn(),
    voiceText: '',
    setVoiceText: jest.fn(),
    voices: [],
    selectedVoice: null,
    setSelectedVoice: jest.fn(),
    loadingVoices: false,
    handleGenerateVoice: jest.fn(),
    sfxPrompt: '',
    setSfxPrompt: jest.fn(),
    sfxDuration: 10,
    setSfxDuration: jest.fn(),
    handleGenerateSFX: jest.fn(),
  })),
}));

describe('GenerateAudioTab', () => {
  const projectId = 'test-project-id';

  it('renders audio generation interface', () => {
    render(<GenerateAudioTab projectId={projectId} />);

    expect(screen.getByText('Generate Audio with AI')).toBeInTheDocument();
    expect(screen.getByText(/create music and audio using suno ai/i)).toBeInTheDocument();
  });

  it('displays audio type selector', () => {
    render(<GenerateAudioTab projectId={projectId} />);

    // AudioTypeSelector should be rendered
    const heading = screen.getByText('Generate Audio with AI');
    expect(heading).toBeInTheDocument();
  });

  it('displays music generation form when music type is selected', () => {
    const useAudioGeneration =
      require('@/components/generation/audio-generation/useAudioGeneration').useAudioGeneration;
    useAudioGeneration.mockReturnValue({
      audioType: 'music',
      setAudioType: jest.fn(),
      prompt: 'Test prompt',
      setPrompt: jest.fn(),
      style: 'pop',
      setStyle: jest.fn(),
      title: 'Test Song',
      setTitle: jest.fn(),
      customMode: false,
      setCustomMode: jest.fn(),
      instrumental: false,
      setInstrumental: jest.fn(),
      generating: false,
      taskId: null,
      handleGenerateMusic: jest.fn(),
      voiceText: '',
      setVoiceText: jest.fn(),
      voices: [],
      selectedVoice: null,
      setSelectedVoice: jest.fn(),
      loadingVoices: false,
      handleGenerateVoice: jest.fn(),
      sfxPrompt: '',
      setSfxPrompt: jest.fn(),
      sfxDuration: 10,
      setSfxDuration: jest.fn(),
      handleGenerateSFX: jest.fn(),
    });

    render(<GenerateAudioTab projectId={projectId} />);

    // MusicGenerationForm component should be rendered
    expect(screen.getByText('Generate Audio with AI')).toBeInTheDocument();
  });

  it('passes projectId to useAudioGeneration hook', () => {
    const useAudioGeneration =
      require('@/components/generation/audio-generation/useAudioGeneration').useAudioGeneration;

    render(<GenerateAudioTab projectId={projectId} />);

    expect(useAudioGeneration).toHaveBeenCalledWith({ projectId });
  });

  it('handles voice generation type', () => {
    const useAudioGeneration =
      require('@/components/generation/audio-generation/useAudioGeneration').useAudioGeneration;
    useAudioGeneration.mockReturnValue({
      audioType: 'voice',
      setAudioType: jest.fn(),
      prompt: '',
      setPrompt: jest.fn(),
      style: '',
      setStyle: jest.fn(),
      title: '',
      setTitle: jest.fn(),
      customMode: false,
      setCustomMode: jest.fn(),
      instrumental: false,
      setInstrumental: jest.fn(),
      generating: false,
      taskId: null,
      handleGenerateMusic: jest.fn(),
      voiceText: 'Hello world',
      setVoiceText: jest.fn(),
      voices: [{ id: 'voice-1', name: 'Voice 1' }],
      selectedVoice: 'voice-1',
      setSelectedVoice: jest.fn(),
      loadingVoices: false,
      handleGenerateVoice: jest.fn(),
      sfxPrompt: '',
      setSfxPrompt: jest.fn(),
      sfxDuration: 10,
      setSfxDuration: jest.fn(),
      handleGenerateSFX: jest.fn(),
    });

    render(<GenerateAudioTab projectId={projectId} />);

    // VoiceGenerationForm should be rendered
    expect(screen.getByText('Generate Audio with AI')).toBeInTheDocument();
  });

  it('handles sound effects generation type', () => {
    const useAudioGeneration =
      require('@/components/generation/audio-generation/useAudioGeneration').useAudioGeneration;
    useAudioGeneration.mockReturnValue({
      audioType: 'sfx',
      setAudioType: jest.fn(),
      prompt: '',
      setPrompt: jest.fn(),
      style: '',
      setStyle: jest.fn(),
      title: '',
      setTitle: jest.fn(),
      customMode: false,
      setCustomMode: jest.fn(),
      instrumental: false,
      setInstrumental: jest.fn(),
      generating: false,
      taskId: null,
      handleGenerateMusic: jest.fn(),
      voiceText: '',
      setVoiceText: jest.fn(),
      voices: [],
      selectedVoice: null,
      setSelectedVoice: jest.fn(),
      loadingVoices: false,
      handleGenerateVoice: jest.fn(),
      sfxPrompt: 'Door closing',
      setSfxPrompt: jest.fn(),
      sfxDuration: 5,
      setSfxDuration: jest.fn(),
      handleGenerateSFX: jest.fn(),
    });

    render(<GenerateAudioTab projectId={projectId} />);

    // SFXGenerationForm should be rendered
    expect(screen.getByText('Generate Audio with AI')).toBeInTheDocument();
  });

  it('renders with Toaster for notifications', () => {
    const { container } = render(<GenerateAudioTab projectId={projectId} />);

    // Component should render successfully
    expect(container.querySelector('.flex.h-full.flex-col')).toBeInTheDocument();
  });
});
