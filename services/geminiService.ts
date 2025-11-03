
import { GoogleGenAI, Modality } from "@google/genai";
import { VoiceOption } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateSummaryAndSpeech(
  articleText: string,
  voice: VoiceOption
): Promise<{ summary: string; audioBase64: string }> {
  // Step 1: Generate the summary
  const summaryPrompt = `Summarize the following news article in a concise and engaging manner, suitable for an audio briefing. Focus on the key facts and implications. Article:\n\n${articleText}`;
  
  const summaryResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: summaryPrompt,
  });

  const summary = summaryResponse.text;

  if (!summary) {
    throw new Error("Failed to generate summary.");
  }

  // Step 2: Generate speech from the summary
  const ttsResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say with a clear and professional tone: ${summary}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
      },
    },
  });

  const audioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!audioBase64) {
    throw new Error("Failed to generate audio from summary.");
  }

  return { summary, audioBase64 };
}
