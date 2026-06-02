import type { AISummary, QuizQuestion } from '../../shared/types';

export interface AIProvider {
  summarize(transcript: string, videoId: string): Promise<AISummary>;
  generateNotes(transcript: string, videoId: string): Promise<string>;
  generateQuiz(transcript: string, videoId: string): Promise<QuizQuestion[]>;
}
