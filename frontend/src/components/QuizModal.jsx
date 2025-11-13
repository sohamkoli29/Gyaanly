import { useState, useEffect } from 'react';
import { quizAPI } from '../services/api';

export default function QuizModal({ courseId, courseTitle, isOpen, onClose, onQuizComplete }) {
  const [quiz, setQuiz] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (isOpen) {
      resetQuiz();
      fetchQuiz();
      
      const timer = setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, courseId]);

  const resetQuiz = () => {
    setQuiz(null);
    setCurrentQuestion(0);
    setAnswers({});
    setLoading(true);
    setSubmitting(false);
    setResults(null);
    setTimeSpent(0);
    setError('');
    setShowResults(false);
  };

  const fetchQuiz = async () => {
    try {
      setError('');
      const response = await quizAPI.getQuizByCourse(courseId);
      
      console.log('Quiz response:', response);
      
      if (response && response.quiz) {
        const quizData = response.quiz;
        
        if (!quizData.quiz_questions || !Array.isArray(quizData.quiz_questions) || quizData.quiz_questions.length === 0) {
          setError('Quiz has no questions available.');
          setQuiz(null);
          return;
        }
        
        const validQuestions = quizData.quiz_questions.filter(question => 
          question && 
          question.id && 
          question.question_text && 
          question.options && 
          typeof question.options === 'object'
        );
        
        if (validQuestions.length === 0) {
          setError('No valid questions found in the quiz.');
          setQuiz(null);
          return;
        }
        
        setQuiz({
          ...quizData,
          quiz_questions: validQuestions
        });
      } else {
        setError('No quiz available for this course yet.');
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
      
      if (error.message === 'NO_QUIZ_FOUND') {
        setError('No quiz available for this course yet.');
      } else {
        setError('Failed to load quiz. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Properly handle answer selection
  const handleAnswerSelect = (questionId, answer) => {
    console.log('Selecting answer:', { questionId, answer }); // Debug log
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleNext = () => {
    if (currentQuestion < getQuestionCount() - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!confirm('Ready to submit your answers? This action cannot be undone.')) {
      return;
    }

    setSubmitting(true);
    try {
      const result = await quizAPI.submitQuizAttempt(quiz.id, {
        answers,
        time_spent_seconds: timeSpent
      });
      
      setResults(result);
      setShowResults(true);
      onQuizComplete?.(result);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('Error submitting quiz: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    
    if (Object.keys(answers).length > 0 && !results) {
      if (!confirm('Are you sure you want to close? Your progress will be lost.')) {
        return;
      }
    }
    onClose();
  };

  const getQuestionCount = () => {
    return quiz?.quiz_questions?.length || 0;
  };

  const getCurrentQuestion = () => {
    if (!quiz || !quiz.quiz_questions || currentQuestion >= quiz.quiz_questions.length) {
      return null;
    }
    return quiz.quiz_questions[currentQuestion];
  };

  const getOptions = () => {
    const question = getCurrentQuestion();
    return question?.options || {};
  };

  const isLastQuestion = () => {
    return currentQuestion === getQuestionCount() - 1;
  };

  const allQuestionsAnswered = () => {
    return Object.keys(answers).length === getQuestionCount();
  };

  if (!isOpen) return null;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestionData = getCurrentQuestion();

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="glass-card border-2 border-cyan-400/30 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-neon-lg">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-cyan-400/20 px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold gradient-text">
              {courseTitle} - Knowledge Assessment
            </h2>
            {quiz && !results && (
              <p className="text-cyan-400 text-sm mt-1">{quiz.title}</p>
            )}
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="text-cyan-400 hover:text-cyan-300 text-2xl transition-colors disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="text-center py-12">
              <div className="relative mb-4">
                <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-spin mx-auto" style={{ animationDelay: '0.5s' }}></div>
              </div>
              <p className="text-cyan-400 font-semibold">Initializing Assessment...</p>
              <p className="text-gray-400 text-sm mt-2">Loading quiz modules</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-bold gradient-text mb-2">Assessment Unavailable</h3>
              <p className="text-gray-400 mb-4">{error}</p>
              <p className="text-sm text-gray-500">
                The instructor hasn't created an assessment for this course yet.
              </p>
              <button
                onClick={handleClose}
                className="mt-4 btn-cyber"
              >
                Close Portal
              </button>
            </div>
          )}

          {quiz && !results && currentQuestionData && (
            <div className="space-y-6">
              {/* Progress & Timer */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                {/* Progress */}
                <div className="glass-card p-4 border border-cyan-400/20">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-cyan-400">Module {currentQuestion + 1} of {getQuestionCount()}</span>
                    <span className="text-cyan-400">{Math.round(((currentQuestion + 1) / getQuestionCount()) * 100)}% Complete</span>
                  </div>
                  <div className="w-full bg-cyan-400/20 rounded-full h-2 border border-cyan-400/30">
                    <div 
                      className="bg-gradient-to-r from-cyan-400 to-purple-400 h-2 rounded-full transition-all duration-300 shadow-neon-sm"
                      style={{ width: `${((currentQuestion + 1) / getQuestionCount()) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Timer */}
                <div className="glass-card p-4 border border-cyan-400/20">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold text-cyan-400">Time Elapsed</h4>
                      <p className="text-2xl font-bold text-cyan-400 neon-text">{formatTime(timeSpent)}</p>
                    </div>
                    {quiz.time_limit_minutes && (
                      <div className="text-right">
                        <h4 className="font-semibold text-cyan-400">Time Limit</h4>
                        <p className="text-lg text-cyan-400">{quiz.time_limit_minutes} minutes</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Question */}
              <div className="glass-card p-6 border-2 border-cyan-400/20">
                <h4 className="text-xl font-bold text-cyan-400 mb-6 flex items-center gap-2">
                  <span className="badge-cyber bg-cyan-400/20 text-cyan-400 border-cyan-400/40">
                    Q{currentQuestion + 1}
                  </span>
                  {currentQuestionData.question_text}
                </h4>
                
                <div className="space-y-3">
                  {Object.entries(getOptions()).map(([key, value]) => (
                    <label 
                      key={key} 
                      className={`
                        flex items-center space-x-4 p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer group
                        ${answers[currentQuestionData.id] === key
                          ? 'border-cyan-400 bg-cyan-400/10 shadow-neon-sm'
                          : 'border-cyan-400/20 hover:border-cyan-400/50 hover:bg-cyan-400/5'
                        }
                      `}
                      onClick={() => handleAnswerSelect(currentQuestionData.id, key)}
                    >
                      {/* FIXED: Proper radio input */}
                      <input
                        type="radio"
                        name={`question-${currentQuestionData.id}`}
                        value={key}
                        checked={answers[currentQuestionData.id] === key}
                        onChange={() => handleAnswerSelect(currentQuestionData.id, key)}
                        className="hidden" // Hide the default radio, we'll use custom styling
                      />
                      <div className={`
                        w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0
                        ${answers[currentQuestionData.id] === key
                          ? 'border-cyan-400 bg-cyan-400'
                          : 'border-cyan-400/40 group-hover:border-cyan-400'
                        }
                      `}>
                        {answers[currentQuestionData.id] === key && (
                          <div className="w-2 h-2 rounded-full bg-black"></div>
                        )}
                      </div>
                      <span className="flex-1 font-medium text-white">
                        <strong className="text-cyan-400">{key}.</strong> {value}
                      </span>
                    </label>
                  ))}
                </div>
                
                {/* Debug info - remove in production */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 p-3 bg-gray-800 rounded-lg text-xs">
                    <div>Current Answer: {answers[currentQuestionData.id] || 'None'}</div>
                    <div>Question ID: {currentQuestionData.id}</div>
                    <div>All Answers: {JSON.stringify(answers)}</div>
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center pt-6 border-t border-cyan-400/20">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                  className="btn-ghost group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="inline-block mr-2 transition-transform group-hover:-translate-x-1">←</span>
                  Previous
                </button>

                {isLastQuestion() ? (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !allQuestionsAnswered()}
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

              <div className="text-center text-sm text-cyan-400 glass-card p-3 border border-cyan-400/20">
                {Object.keys(answers).length} of {getQuestionCount()} modules completed
              </div>
            </div>
          )}

          {quiz && !results && !currentQuestionData && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold gradient-text mb-2">System Error</h3>
              <p className="text-gray-400 mb-4">Unable to load assessment modules.</p>
              <button
                onClick={handleClose}
                className="btn-cyber"
              >
                Close Portal
              </button>
            </div>
          )}

          {results && showResults && (
            <div className="space-y-6">
              {/* Results Header */}
              <div className={`text-center p-8 rounded-xl border-2 ${
                results.passed 
                  ? 'border-green-400/30 bg-green-400/10 shadow-neon-sm' 
                  : 'border-red-400/30 bg-red-400/10'
              }`}>
                <div className="text-6xl mb-4">
                  {results.passed ? '🎉' : '💀'}
                </div>
                <h3 className="text-3xl font-bold gradient-text mb-4">
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
                  <span>•</span>
                  <span>Time spent: {formatTime(timeSpent)}</span>
                </div>
              </div>

              {/* Answer Review */}
              <div className="space-y-4">
                <h4 className="text-xl font-bold gradient-text flex items-center gap-2">
                  <span>📊</span>
                  Performance Analysis
                </h4>
                {quiz.quiz_questions.map((question, index) => {
                  const userAnswer = results.answers?.find(a => a.question_id === question.id);
                  const isCorrect = userAnswer?.is_correct;
                  
                  return (
                    <div key={question.id} className="glass-card border-2 border-cyan-400/20 p-6">
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
                      <div className="space-y-3">
                        {Object.entries(question.options || {}).map(([key, value]) => (
                          <div key={key} className={`p-4 rounded-lg border-2 transition-all ${
                            key === question.correct_answer
                              ? 'border-green-400/50 bg-green-400/10 shadow-neon-sm'
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
                                  <span className="badge-cyber bg-green-400/20 text-green-400 border-green-400/40">
                                    ✅ Correct
                                  </span>
                                )}
                                {key === userAnswer?.user_answer && !userAnswer?.is_correct && (
                                  <span className="badge-cyber bg-red-400/20 text-red-400 border-red-400/40">
                                    ❌ Your Answer
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className={`text-sm mt-4 font-semibold ${
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
          )}
        </div>

        {/* Footer */}
        {results && (
          <div className="border-t border-cyan-400/20 px-6 py-4 bg-dark-void/50">
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClose}
                className="btn-ghost"
              >
                Close Portal
              </button>
              {!results.passed && (
                <button
                  onClick={resetQuiz}
                  className="btn-cyber group"
                >
                  <span>Retry Assessment</span>
                  <span className="inline-block ml-2 transition-transform group-hover:rotate-180">🔄</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}