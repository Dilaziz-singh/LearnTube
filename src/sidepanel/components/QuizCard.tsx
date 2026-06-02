import React, { useState, useEffect } from 'react';
import { Check, X, ArrowRight, HelpCircle } from 'lucide-react';
import type { QuizQuestion } from '../../shared/types';

interface QuizCardProps {
  question: QuizQuestion;
  onAnswer: (answer: string, isCorrect: boolean) => void;
  savedAnswer?: { answer: string; correct: boolean };
}

export const QuizCard: React.FC<QuizCardProps> = ({ question, onAnswer, savedAnswer }) => {
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [shortAnswerText, setShortAnswerText] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);

  useEffect(() => {
    if (savedAnswer) {
      setSelectedOption(savedAnswer.answer);
      setShortAnswerText(savedAnswer.answer);
      setSubmitted(true);
      setIsAnswerCorrect(savedAnswer.correct);
    } else {
      setSelectedOption('');
      setShortAnswerText('');
      setSubmitted(false);
      setIsAnswerCorrect(false);
    }
  }, [question, savedAnswer]);

  const handleSubmitOption = (option: string) => {
    if (submitted) return;
    setSelectedOption(option);
    const correct = option.toLowerCase() === question.correctAnswer.toLowerCase();
    setIsAnswerCorrect(correct);
    setSubmitted(true);
    onAnswer(option, correct);
  };

  const handleSubmitShortAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitted || !shortAnswerText.trim()) return;
    
    // Simple similarity check for short answers
    const cleanAnswer = shortAnswerText.trim().toLowerCase();
    const cleanCorrect = question.correctAnswer.trim().toLowerCase();
    const correct = cleanAnswer.includes(cleanCorrect) || cleanCorrect.includes(cleanAnswer);
    
    setIsAnswerCorrect(correct);
    setSubmitted(true);
    onAnswer(shortAnswerText, correct);
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl p-4 bg-zinc-900/40 border border-zinc-900 animate-slide-up">
      {/* Header / Question Type */}
      <div className="flex items-center gap-1.5">
        <HelpCircle size={13} className="text-zinc-500" />
        <span className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">
          {question.type === 'multiple-choice' ? 'Multiple Choice' : 'Short Answer'}
        </span>
      </div>

      {/* Question Text */}
      <p className="text-xs font-medium text-zinc-200 leading-relaxed">{question.question}</p>

      {/* Answer Area */}
      {question.type === 'multiple-choice' ? (
        <div className="flex flex-col gap-2">
          {question.options?.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isCorrectOption = option.toLowerCase() === question.correctAnswer.toLowerCase();
            
            let btnStyle = "border-zinc-800/80 bg-zinc-950/20 hover:border-zinc-700 hover:bg-zinc-900/30 text-zinc-300";
            if (submitted) {
              if (isCorrectOption) {
                btnStyle = "border-zinc-100 bg-zinc-100/10 text-zinc-100";
              } else if (isSelected) {
                btnStyle = "border-zinc-800 bg-zinc-950/40 text-zinc-500 opacity-60";
              } else {
                btnStyle = "border-zinc-900 bg-zinc-950/40 text-zinc-600 opacity-40";
              }
            }

            return (
              <button
                key={idx}
                disabled={submitted}
                onClick={() => handleSubmitOption(option)}
                className={`w-full flex items-center justify-between text-left text-xs rounded-xl p-3 border font-normal transition-all duration-150 cursor-pointer disabled:pointer-events-none ${btnStyle}`}
              >
                <span>{option}</span>
                {submitted && isCorrectOption && <Check size={12} className="text-zinc-100 shrink-0 ml-2" />}
                {submitted && isSelected && !isCorrectOption && <X size={12} className="text-zinc-500 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      ) : (
        <form onSubmit={handleSubmitShortAnswer} className="flex flex-col gap-3">
          <input
            type="text"
            value={shortAnswerText}
            onChange={(e) => setShortAnswerText(e.target.value)}
            disabled={submitted}
            placeholder="Type your answer here..."
            className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-zinc-200 outline-none placeholder-zinc-600 focus:border-zinc-700 transition-colors disabled:opacity-60"
          />
          {!submitted && (
            <button
              type="submit"
              disabled={!shortAnswerText.trim()}
              className="flex items-center justify-center gap-1.5 self-end rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold py-2 px-4 transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
            >
              <span>Submit Answer</span>
              <ArrowRight size={12} />
            </button>
          )}
        </form>
      )}

      {/* Answer feedback & Explanation */}
      {submitted && (
        <div className="flex flex-col gap-2 border-t border-zinc-900 pt-3.5 mt-1.5 animate-fade-in">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isAnswerCorrect ? 'text-zinc-300' : 'text-zinc-500'}`}>
              {isAnswerCorrect ? 'Correct' : 'Incorrect'}
            </span>
            {!isAnswerCorrect && (
              <span className="text-[10px] text-zinc-500 font-normal">
                (Correct: <span className="font-semibold">{question.correctAnswer}</span>)
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed font-normal">{question.explanation}</p>
        </div>
      )}
    </div>
  );
};
