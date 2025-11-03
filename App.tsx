
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { VoiceOption } from './types';
import { generateSummaryAndSpeech } from './services/geminiService';
import { decode, decodeAudioData } from './utils/audioUtils';
import { PlayIcon, PauseIcon, SpeakerIcon, LoadingSpinner } from './components/icons';

const App: React.FC = () => {
  const [articleText, setArticleText] = useState('');
  const [summary, setSummary] = useState('');
  const [audioBase64, setAudioBase64] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(VoiceOption.Zephyr);

  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    if (!audioBase64) return;

    const decodeAndSetupAudio = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        const audioContext = audioContextRef.current;
        const decodedBytes = decode(audioBase64);
        const buffer = await decodeAudioData(decodedBytes, audioContext, 24000, 1);
        audioBufferRef.current = buffer;
        // Auto-play after generation
        togglePlayPause();
      } catch (e) {
        console.error("Error decoding audio:", e);
        setError("Failed to process generated audio.");
      }
    };
    
    decodeAndSetupAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBase64]);
  
  const togglePlayPause = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current) return;
    
    const audioContext = audioContextRef.current;

    if (isPlaying) {
      audioSourceRef.current?.stop();
      setIsPlaying(false);
    } else {
      audioContext.resume();
      const source = audioContext.createBufferSource();
      source.buffer = audioBufferRef.current;
      source.connect(audioContext.destination);
      source.onended = () => {
        setIsPlaying(false);
      };
      source.start(0);
      audioSourceRef.current = source;
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleText.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setSummary('');
    setAudioBase64('');
    if(isPlaying) {
        togglePlayPause();
    }
    audioBufferRef.current = null;
    
    try {
        setLoadingMessage('Crafting the perfect summary...');
        await new Promise(res => setTimeout(res, 500)); // for UX
        setLoadingMessage('Generating audio narration...');
        const result = await generateSummaryAndSpeech(articleText, selectedVoice);
        setSummary(result.summary);
        setAudioBase64(result.audioBase64);
    } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex flex-col items-center p-4 sm:p-6 lg:p-8">
      <header className="w-full max-w-4xl text-center mb-8">
        <div className="flex items-center justify-center gap-4 mb-2">
            <SpeakerIcon className="w-10 h-10 text-cyan-400"/>
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Commute Summary
            </h1>
        </div>
        <p className="text-lg text-gray-400">Your news, summarized and narrated for your commute.</p>
      </header>

      <main className="w-full max-w-4xl flex-grow">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-700">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="article" className="block text-lg font-medium text-gray-300 mb-2">
                Paste your news article here
              </label>
              <textarea
                id="article"
                value={articleText}
                onChange={(e) => setArticleText(e.target.value)}
                placeholder="Start by pasting the full text of a news article..."
                className="w-full h-48 p-4 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-colors duration-200 resize-y text-gray-200"
                disabled={isLoading}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <label htmlFor="voice" className="block text-sm font-medium text-gray-400 mb-1">
                  Narration Voice
                </label>
                <select
                  id="voice"
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value as VoiceOption)}
                  className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  disabled={isLoading}
                >
                  {Object.values(VoiceOption).map((voice) => (
                    <option key={voice} value={voice}>{voice}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={isLoading || !articleText.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-3 text-lg font-semibold bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 focus:outline-none focus:ring-4 focus:ring-cyan-500/50 transition-all duration-200 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner className="w-6 h-6"/>
                    <span>Generating...</span>
                  </>
                ) : (
                  'Create Audio Summary'
                )}
              </button>
            </div>
          </form>
        </div>

        {isLoading && (
            <div className="mt-8 text-center text-cyan-400">
                <p>{loadingMessage}</p>
            </div>
        )}

        {error && (
            <div className="mt-8 bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg">
                <h3 className="font-bold">Error</h3>
                <p>{error}</p>
            </div>
        )}

        {summary && (
          <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-6 sm:p-8 border border-gray-700">
            <h2 className="text-2xl font-bold mb-4 text-white">Your Summary</h2>
            
            {audioBase64 && (
                <div className="flex items-center gap-4 bg-gray-900 p-4 rounded-lg mb-6 border border-gray-700">
                    <button onClick={togglePlayPause} className="p-3 bg-cyan-600 rounded-full text-white hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-400">
                        {isPlaying ? <PauseIcon className="w-6 h-6"/> : <PlayIcon className="w-6 h-6"/>}
                    </button>
                    <div className="text-gray-300 font-medium">
                        {isPlaying ? 'Playing Narration...' : 'Listen to your summary'}
                    </div>
                </div>
            )}

            <p className="text-gray-300 leading-relaxed text-lg whitespace-pre-wrap">{summary}</p>
          </div>
        )}
      </main>

      <footer className="w-full max-w-4xl text-center mt-12">
        <p className="text-sm text-gray-500">Powered by Gemini. Built for you.</p>
      </footer>
    </div>
  );
};

export default App;

