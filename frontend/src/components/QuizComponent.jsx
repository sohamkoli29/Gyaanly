import { useState, useEffect } from 'react';
import { quizAPI } from '../services/api';

export default function QuizComponent({ courseId, onQuizComplete }) {
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [timeSpent, setTimeSpent] = useState(0);

  useEffect(() => {
    fetchQuiz();
    
    const timer = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [courseId]);

  const fetchQuiz = async () => {
    try {
      const data = await quizAPI.getQuizByCourse(courseId);
      if (data.quiz) {
        setQuiz(data.quiz);
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestion < quiz.quiz_questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!confirm('Ready to submit your assessment? This action cannot be undone.')) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await quizAPI.submitQuizAttempt(quiz.id, {
        answers,
        time_spent_seconds: timeSpent
      });
      
      setResults(result);
      onQuizComplete?.(result);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('Error submitting assessment: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-cyan-400/20 rounded w-3/4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-cyan-400/20 rounded"></div>
            <div className="h-4 bg-cyan-400/20 rounded"></div>
            <div className="h-4 bg-cyan-400/20 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="glass-card p-6 text-center border-2 border-cyan-400/20">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-bold gradient-text mb-2">Assessment Unavailable</h3>
        <p className="text-gray-400">This course doesn't have an assessment yet.</p>
      </div>
    );
  }

  if (results) {
    return (
      <div className="glass-card border-2 border-cyan-400/20 p-6">
        <div className={`text-center p-6 rounded-xl border-2 mb-6 ${
          results.passed 
            ? 'border-green-400/30 bg-green-400/10 shadow-neon-sm' 
            : 'border-red-400/30 bg-red-400/10'
        }`}>
          <div className="text-6xl mb-4">
            {results.passed ? '🎉' : '💀'}
          </div>
          <h3 className="text-2xl font-bold gradient-text mb-4">
            {results.passed ? 'Assessment Passed!' : 'Assessment Failed'}
          </h3>
          <div className="text-4xl font-bold mb-2 neon-text">
            {results.score}%
          </div>
          <p className="text-cyan-400 text-lg">
            {results.total_score} out of {results.total_possible} points
          </p>
          <div className="flex justify-center gap-6 mt-4 text-sm text-gray-400">
            <span>Passing score: {quiz.passing_score}%</span>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-xl font-bold gradient-text flex items-center gap-2">
            <span>📊</span>
            Performance Analysis
          </h4>
          {quiz.quiz_questions.map((question, index) => {
            const userAnswer = results.answers.find(a => a.question_id === question.id);
            const isCorrect = userAnswer?.is_correct;
            
            return (
              <div key={question.id} className="glass-card border-2 border-cyan-400/20 p-4">
                <p className="font-bold text-white mb-4 flex items-center gap-2">
                  <span className={`badge-cyber ${
                    isCorrect 
                      ? 'bg-green-400/20 text-green-400 border-green-400/40' 
                      : 'bg-red-400/20 text-red-400 border-red-400/40'
                  }`}>
                    {index + 1}
                  </span>
                  {question.question_text}
                </p>
                <div className="space-y-2">
                  {Object.entries(question.options).map(([key, value]) => (
                    <div key={key} className={`p-3 rounded-lg border-2 ${
                      key === question.correct_answer
                        ? 'border-green-400/50 bg-green-400/10'
                        : key === userAnswer?.user_answer && !userAnswer?.is_correct
                        ? 'border-red-400/50 bg-red-400/10'
                        : 'border-cyan-400/20 bg-cyan-400/5'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-white">
                          <strong className="text-cyan-400">{key}.</strong> {value}
                        </span>
                        <div className="flex space-x-2">
                          {key === question.correct_answer && (
                            <span className="badge-cyber bg-green-400/20 text-green-400 border-green-400/40 text-xs">
                              ✅
                            </span>
                          )}
                          {key === userAnswer?.user_answer && !userAnswer?.is_correct && (
                            <span className="badge-cyber bg-red-400/20 text-red-400 border-red-400/40 text-xs">
                              ❌
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className={`text-sm mt-3 font-semibold ${
                  isCorrect ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isCorrect ? '✓ Optimal Performance' : '✗ Requires Review'} • 
                  Your response: <span className="text-cyan-400">{userAnswer?.user_answer || 'Not answered'}</span>
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const question = quiz.quiz_questions[currentQuestion];

  return (
    <div className="glass-card border-2 border-cyan-400/20 p-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <h3 className="text-2xl font-bold gradient-text">{quiz.title}</h3>
        <div className="glass-card px-4 py-2 border border-cyan-400/20 text-cyan-400 font-semibold">
          Time: {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-sm mb-3">
          <span className="text-cyan-400">Module {currentQuestion + 1} of {quiz.quiz_questions.length}</span>
          <span className="text-cyan-400">{Math.round(((currentQuestion + 1) / quiz.quiz_questions.length) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-cyan-400/20 rounded-full h-2 border border-cyan-400/30">
          <div 
            className="bg-gradient-to-r from-cyan-400 to-purple-400 h-2 rounded-full transition-all duration-300 shadow-neon-sm"
            style={{ width: `${((currentQuestion + 1) / quiz.quiz_questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="glass-card border-2 border-cyan-400/20 p-6 mb-6">
        <h4 className="text-xl font-bold text-cyan-400 mb-6 flex items-center gap-2">
          <span className="badge-cyber bg-cyan-400/20 text-cyan-400 border-cyan-400/40">
            Q{currentQuestion + 1}
          </span>
          {question.question_text}
        </h4>
        
        <div className="space-y-3">
          {Object.entries(question.options).map(([key, value]) => (
            <label 
              key={key} 
              className={`
                flex items-center space-x-4 p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer group
                ${answers[question.id] === key
                  ? 'border-cyan-400 bg-cyan-400/10 shadow-neon-sm'
                  : 'border-cyan-400/20 hover:border-cyan-400/50 hover:bg-cyan-400/5'
                }
              `}
              onClick={() => handleAnswerSelect(question.id, key)}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={key}
                checked={answers[question.id] === key}
                onChange={() => handleAnswerSelect(question.id, key)}
                className="hidden"
              />
              <div className={`
                w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0
                ${answers[question.id] === key
                  ? 'border-cyan-400 bg-cyan-400'
                  : 'border-cyan-400/40 group-hover:border-cyan-400'
                }
              `}>
                {answers[question.id] === key && (
                  <div className="w-2 h-2 rounded-full bg-black"></div>
                )}
              </div>
              <span className="flex-1 font-medium text-white">
                <strong className="text-cyan-400">{key}.</strong> {value}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-cyan-400/20">
        <button
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
          className="btn-ghost group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="inline-block mr-2 transition-transform group-hover:-translate-x-1">←</span>
          Previous
        </button>

        {currentQuestion === quiz.quiz_questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={submitting || Object.keys(answers).length !== quiz.quiz_questions.length}
            className="btn-neon group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              <>
                <span>Submit Assessment</span>
                <span className="inline-block ml-2 text-xl transition-transform group-hover:scale-110">🚀</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="btn-cyber group"
          >
            <span>Next Module</span>
            <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">→</span>
          </button>
        )}
      </div>

      <div className="text-center text-sm text-cyan-400 glass-card p-3 border border-cyan-400/20 mt-4">
        {Object.keys(answers).length} of {quiz.quiz_questions.length} modules completed
      </div>
    </div>
  );
}