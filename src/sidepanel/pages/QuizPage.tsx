import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Award, RefreshCw, VideoOff, CheckCircle2, ChevronRight, HelpCircle } from 'lucide-react';
import type { QuizQuestion, QuizAttempt } from '../../shared/types';
import { QuizCard } from '../components/QuizCard';

export const QuizPage: React.FC = () => {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [hasTranscript, setHasTranscript] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quiz state
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; answer: string; correct: boolean }[]>([]);
  const [quizFinished, setQuizFinished] = useState(false);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);

  const fetchQuizData = useCallback((vId: string) => {
    setLoading(true);
    setError(null);
    chrome.runtime.sendMessage({ type: 'GET_QUIZ_ATTEMPTS', payload: { videoId: vId } }, (response) => {
      if (response?.success && response.data) {
        setAttempts(response.data);
      }
      // Check for transcript existence
      chrome.runtime.sendMessage({ type: 'GET_TRANSCRIPT', payload: { videoId: vId } }, (res) => {
        setHasTranscript(!!res?.data && res.data.length > 0);
        setLoading(false);
      });
    });
  }, []);

  const init = useCallback(() => {
    chrome.runtime.sendMessage({ type: 'GET_CURRENT_VIDEO' }, (response) => {
      if (response?.data?.videoId) {
        setVideoId(response.data.videoId);
        fetchQuizData(response.data.videoId);
      } else {
        setVideoId(null);
        setLoading(false);
      }
    });
  }, [fetchQuizData]);

  useEffect(() => {
    init();
  }, [init]);

  const handleGenerate = useCallback(() => {
    if (!videoId) return;
    setGenerating(true);
    setError(null);
    chrome.runtime.sendMessage(
      { type: 'GENERATE_QUIZ', payload: { videoId } },
      (response) => {
        setGenerating(false);
        if (response?.success && response.data) {
          setQuestions(response.data);
          setCurrentIndex(0);
          setAnswers([]);
          setQuizFinished(false);
        } else {
          setError(response?.error || 'Failed to generate quiz. Please check your Gemini API key in settings.');
        }
      }
    );
  }, [videoId]);

  const handleAnswerQuestion = useCallback(
    (answerText: string, correct: boolean) => {
      const q = questions[currentIndex];
      setAnswers((prev) => [
        ...prev.filter((a) => a.questionId !== q.id),
        { questionId: q.id, answer: answerText, correct },
      ]);
    },
    [currentIndex, questions]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Finished!
      const correctCount = answers.filter((a) => a.correct).length;
      const finalScore = Math.round((correctCount / questions.length) * 100);
      setScore(finalScore);
      setQuizFinished(true);

      // Save attempt
      const attempt: QuizAttempt = {
        id: `attempt_${Date.now()}`,
        videoId: videoId!,
        questions,
        answers,
        score: finalScore,
        totalQuestions: questions.length,
        completedAt: Date.now(),
      };

      chrome.runtime.sendMessage({ type: 'SAVE_QUIZ', payload: { videoId, attempt } }, () => {
        // Refresh attempts list
        chrome.runtime.sendMessage({ type: 'GET_QUIZ_ATTEMPTS', payload: { videoId } }, (res) => {
          if (res?.success && res.data) {
            setAttempts(res.data);
          }
        });
      });
    }
  }, [currentIndex, questions, answers, videoId]);

  const handleReset = useCallback(() => {
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers([]);
    setQuizFinished(false);
    setError(null);
  }, []);

  const hasAnsweredCurrent = useMemo(() => {
    if (questions.length === 0) return false;
    const q = questions[currentIndex];
    return answers.some((a) => a.questionId === q.id);
  }, [currentIndex, questions, answers]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3" style={{ height: '350px' }}>
        <RefreshCw size={24} className="animate-spin text-zinc-600" />
        <span className="text-xs text-zinc-500 font-medium">Loading quiz details...</span>
      </div>
    );
  }

  if (!videoId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-20 text-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-zinc-900 border border-zinc-800">
          <VideoOff size={24} className="text-zinc-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-400">No active video detected</p>
          <p className="text-xs text-zinc-500 max-w-xs mt-1">Open a YouTube video watch page to test your knowledge.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col px-4 pt-5 pb-6 gap-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Award size={16} className="text-zinc-400" />
        <h1 className="text-lg font-semibold tracking-tight text-zinc-100">Knowledge Test</h1>
      </div>

      {questions.length === 0 ? (
        <div className="flex flex-col gap-5">
          {/* Main Action Call */}
          <div className="flex flex-col items-center justify-center gap-5 px-4 py-14 text-center bg-zinc-900/20 border border-zinc-800/40 rounded-xl">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-950 border border-zinc-900">
              <HelpCircle size={22} className="text-zinc-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-300">Generate Video Quiz</p>
              <p className="text-xs text-zinc-500 max-w-xs mt-2 leading-relaxed">
                {!hasTranscript
                  ? 'To generate an AI quiz, please load the transcript first in the Transcript tab.'
                  : 'Test your retention and understanding by generating a custom quiz based on this video transcript.'}
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating || !hasTranscript}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-semibold text-zinc-950 bg-zinc-100 hover:bg-white active:scale-[0.98] transition-all duration-150 disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
            >
              {generating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Creating Quiz...</span>
                </>
              ) : (
                <span>Generate Video Quiz</span>
              )}
            </button>
            {error && <p className="text-xs text-zinc-400 font-medium px-2">{error}</p>}
          </div>

          {/* Previous Attempts */}
          {attempts.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">Previous Attempts</h2>
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                {attempts.map((att, idx) => (
                  <div
                    key={att.id || idx}
                    className="flex items-center justify-between gap-3 rounded-xl p-3 bg-zinc-900/30 border border-zinc-900/60"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-zinc-500 font-medium">
                        {new Date(att.completedAt).toLocaleDateString()} at{' '}
                        {new Date(att.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-xs font-semibold text-zinc-200">
                        {att.score}% Score
                      </span>
                    </div>
                    <span className="text-[10px] text-zinc-400 bg-zinc-900 px-2 py-1 rounded-lg">
                      {att.answers.filter((a) => a.correct).length}/{att.totalQuestions} Correct
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : quizFinished ? (
        <div className="flex flex-col gap-5 text-center animate-fade-in">
          {/* Finish Panel */}
          <div className="flex flex-col items-center justify-center gap-4 px-4 py-12 bg-zinc-900/20 border border-zinc-800/40 rounded-xl">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-zinc-950 border border-zinc-900 text-zinc-200">
              <CheckCircle2 size={28} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-200">Quiz Completed</h2>
              <p className="text-[28px] font-bold text-zinc-100 tracking-tight mt-2">{score}%</p>
              <p className="text-xs text-zinc-500 mt-1.5">
                You got {answers.filter((a) => a.correct).length} out of {questions.length} questions correct.
              </p>
            </div>
            
            <div className="flex w-full gap-2 mt-2">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold py-3 transition-all cursor-pointer"
              >
                {generating ? <RefreshCw size={12} className="animate-spin" /> : <span>New Quiz</span>}
              </button>
              <button
                onClick={handleReset}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold py-3 transition-all cursor-pointer"
              >
                <span>Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 animate-fade-in">
          {/* Progress Indicator */}
          <div className="flex justify-between items-center text-[10px] text-zinc-500 font-semibold uppercase tracking-wider px-1">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>
              {answers.filter((a) => a.correct).length} correct
            </span>
          </div>

          <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
            <div
              className="bg-zinc-350 h-full rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>

          {/* Current Question */}
          <QuizCard
            question={questions[currentIndex]}
            onAnswer={handleAnswerQuestion}
            savedAnswer={answers.find((a) => a.questionId === questions[currentIndex].id)}
          />

          {/* Control Bar */}
          {hasAnsweredCurrent && (
            <button
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold py-3.5 transition-all cursor-pointer animate-fade-in"
            >
              <span>{currentIndex < questions.length - 1 ? 'Next Question' : 'View Quiz Results'}</span>
              <ChevronRight size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
