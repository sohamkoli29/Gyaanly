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

  useEffect(() => {
    if (isOpen) {
      resetQuiz();
      fetchQuiz();
      
      // Timer for quiz duration
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
  };

  const fetchQuiz = async () => {
    try {
      setError('');
      const response = await quizAPI.getQuizByCourse(courseId);
      
      console.log('Quiz response:', response); // Debug log
      
      if (response && response.quiz) {
        // Validate quiz structure
        const quizData = response.quiz;
        
        // Check if quiz has questions
        if (!quizData.quiz_questions || !Array.isArray(quizData.quiz_questions) || quizData.quiz_questions.length === 0) {
          setError('Quiz has no questions available.');
          setQuiz(null);
          return;
        }
        
        // Validate each question
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
        
        // Update quiz with validated questions
        setQuiz({
          ...quizData,
          quiz_questions: validQuestions
        });
      } else {
        setError('No quiz available for this course yet.');
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
      
      // Handle specific errors
      if (error.message === 'NO_QUIZ_FOUND') {
        setError('No quiz available for this course yet.');
      } else {
        setError('Failed to load quiz. Please try again later.');
      }
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
    if (!confirm('Are you sure you want to submit the quiz? This action cannot be undone.')) {
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

  // Helper functions to safely access quiz data
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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {courseTitle} - Quiz
            </h2>
            {quiz && !results && (
              <p className="text-sm text-gray-600 mt-1">{quiz.title}</p>
            )}
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 text-2xl disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading quiz...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-lg font-semibold mb-2">No Quiz Available</h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <p className="text-sm text-gray-500">
                The instructor hasn't created a quiz for this course yet.
              </p>
              <button
                onClick={handleClose}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {quiz && !results && currentQuestionData && (
            <div className="space-y-6">
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Question {currentQuestion + 1} of {getQuestionCount()}</span>
                  <span>{Math.round(((currentQuestion + 1) / getQuestionCount()) * 100)}% Complete</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestion + 1) / getQuestionCount()) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Timer */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-blue-900">Time Elapsed</h4>
                    <p className="text-2xl font-bold text-blue-600">{formatTime(timeSpent)}</p>
                  </div>
                  {quiz.time_limit_minutes && (
                    <div className="text-right">
                      <h4 className="font-semibold text-blue-900">Time Limit</h4>
                      <p className="text-lg text-blue-600">{quiz.time_limit_minutes} minutes</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Question */}
              <div className="mb-6">
                <h4 className="text-lg font-medium mb-4">
                  {currentQuestion + 1}. {currentQuestionData.question_text}
                </h4>
                
                <div className="space-y-3">
                  {Object.entries(getOptions()).map(([key, value]) => (
                    <label key={key} className="flex items-center space-x-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all">
                      <input
                        type="radio"
                        name={`question-${currentQuestionData.id}`}
                        value={key}
                        checked={answers[currentQuestionData.id] === key}
                        onChange={() => handleAnswerSelect(currentQuestionData.id, key)}
                        className="w-5 h-5 text-blue-600"
                      />
                      <span className="flex-1 font-medium">
                        <strong className="text-blue-600">{key}.</strong> {value}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <button
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Previous
                </button>

                {isLastQuestion() ? (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !allQuestionsAnswered()}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <span>✓</span>
                        <span>Submit Quiz</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <span>Next</span>
                    <span>→</span>
                  </button>
                )}
              </div>

              <div className="text-center text-sm text-gray-600">
                {Object.keys(answers).length} of {getQuestionCount()} questions answered
              </div>
            </div>
          )}

          {quiz && !results && !currentQuestionData && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold mb-2">Quiz Error</h3>
              <p className="text-gray-600 mb-4">Unable to load quiz questions.</p>
              <button
                onClick={handleClose}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {results && (
            <div className="space-y-6">
              {/* Results Header */}
              <div className={`text-center p-6 rounded-lg ${
                results.passed ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'
              }`}>
                <div className="text-4xl mb-4">
                  {results.passed ? '🎉' : '❌'}
                </div>
                <h3 className="text-2xl font-semibold mb-2">
                  {results.passed ? 'Quiz Passed!' : 'Quiz Failed'}
                </h3>
                <p className="text-3xl font-bold mb-2">{results.score}%</p>
                <p className="text-gray-600">
                  {results.total_score} out of {results.total_possible} points
                </p>
                <p className="text-sm mt-2">
                  Passing score: {quiz.passing_score}% • Time spent: {formatTime(timeSpent)}
                </p>
              </div>

              {/* Answer Review */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Answer Review</h4>
                {quiz.quiz_questions.map((question, index) => {
                  const userAnswer = results.answers?.find(a => a.question_id === question.id);
                  return (
                    <div key={question.id} className="border rounded-lg p-4">
                      <p className="font-medium mb-3">
                        {index + 1}. {question.question_text}
                      </p>
                      <div className="space-y-2">
                        {Object.entries(question.options || {}).map(([key, value]) => (
                          <div key={key} className={`p-3 rounded ${
                            key === question.correct_answer
                              ? 'bg-green-100 border border-green-200'
                              : key === userAnswer?.user_answer && !userAnswer?.is_correct
                              ? 'bg-red-100 border border-red-200'
                              : 'bg-gray-50'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span>
                                <strong>{key}.</strong> {value}
                              </span>
                              <div className="flex space-x-2">
                                {key === question.correct_answer && (
                                  <span className="text-green-600 font-semibold">✅ Correct</span>
                                )}
                                {key === userAnswer?.user_answer && !userAnswer?.is_correct && (
                                  <span className="text-red-600 font-semibold">❌ Your Answer</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className={`text-sm mt-3 font-medium ${
                        userAnswer?.is_correct ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {userAnswer?.is_correct ? '✓ Correct!' : '✗ Incorrect'} • 
                        Your answer: {userAnswer?.user_answer || 'Not answered'}
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
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleClose}
                className="px-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
              {!results.passed && (
                <button
                  onClick={resetQuiz}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}