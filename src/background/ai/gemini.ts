import { GoogleGenerativeAI } from '@google/generative-ai';
import { storageService } from '../storage-service';
import type { AIProvider } from './provider';
import type { AISummary, QuizQuestion } from '../../shared/types';

export class GeminiProvider implements AIProvider {
  private async getClient(): Promise<GoogleGenerativeAI> {
    const settings = await storageService.getSettings();
    const apiKey = settings.ai.apiKey;
    if (!apiKey) {
      throw new Error('Gemini API key is not configured. Please enter your API key in settings.');
    }
    return new GoogleGenerativeAI(apiKey);
  }

  private async getModelName(): Promise<string> {
    const settings = await storageService.getSettings();
    return settings.ai.model || 'gemini-2.0-flash';
  }

  async summarize(transcript: string, videoId: string): Promise<AISummary> {
    const genAI = await this.getClient();
    const modelName = await this.getModelName();
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `
      You are an expert learning assistant. Summarize the following video transcript into a highly structured JSON object.
      The output MUST match this JSON schema exactly:
      {
        "overview": "A concise paragraph (3-4 sentences) summarizing the main theme and objective of the video.",
        "keyConcepts": ["Concept 1 with detail", "Concept 2 with detail", "Concept 3 with detail"],
        "takeaways": ["Important lesson or insight 1", "Important lesson or insight 2"],
        "actionItems": ["Practical next step 1", "Practical next step 2"],
        "chapters": [
          { "title": "Logical chapter/section title 1", "timestamp": 0 },
          { "title": "Logical chapter/section title 2", "timestamp": 120 }
        ]
      }

      For the "chapters" array, estimate logical section start times in seconds (e.g. 0 for start, 120 for 2 minutes) based on transcript context.

      Transcript:
      ${transcript}
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    return {
      videoId,
      overview: parsed.overview || '',
      keyConcepts: parsed.keyConcepts || [],
      takeaways: parsed.takeaways || [],
      actionItems: parsed.actionItems || [],
      chapters: parsed.chapters || [],
      generatedAt: Date.now(),
    };
  }

  async generateNotes(transcript: string, videoId: string): Promise<string> {
    const genAI = await this.getClient();
    const modelName = await this.getModelName();
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
      You are a master student. Write extremely detailed, clean, and comprehensive study notes in beautiful Markdown format based on the following transcript.
      Use clear heading hierarchy (# for main title, ## for sections, ### for details), bullet points, bold text for key terms, code blocks if code is discussed, and concise summaries.
      Do not add introductory or concluding meta-commentary (like "Here are your notes"). Start directly with the main heading.

      Transcript:
      ${transcript}
    `;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }

  async generateQuiz(transcript: string, videoId: string): Promise<QuizQuestion[]> {
    const genAI = await this.getClient();
    const modelName = await this.getModelName();
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });

    const prompt = `
      Create an interactive, challenging quiz with 5-7 questions to test understanding of the following video transcript.
      Include a mix of multiple-choice and short-answer questions.
      The output MUST match this JSON schema exactly (an array of objects):
      [
        {
          "id": "q1",
          "type": "multiple-choice",
          "question": "Clear, challenging question testing a key concept?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "Option A",
          "explanation": "Brief explanation of why this answer is correct."
        },
        {
          "id": "q2",
          "type": "short-answer",
          "question": "A concept question requiring a specific terminology or brief answer?",
          "correctAnswer": "Exact term or expected phrase",
          "explanation": "Explanation of what is expected and why."
        }
      ]

      Transcript:
      ${transcript}
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsed = JSON.parse(text) as QuizQuestion[];

    // Ensure IDs are present and unique
    return parsed.map((q, idx) => ({
      ...q,
      id: q.id || `q_${idx}_${Date.now()}`,
    }));
  }
}
