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
    
    // Timer for quiz duration
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
    // If no quiz, the state remains null which is handled in the render
  } catch (error) {
    console.error('Error fetching quiz:', error);
    // Don't show error for "no quiz found" - it's a normal state
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

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <h3 className="text-lg font-semibold mb-2">No Quiz Available</h3>
        <p className="text-gray-600">This course doesn't have a quiz yet.</p>
      </div>
    );
  }

  if (results) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className={`text-center p-4 rounded-lg mb-4 ${
          results.passed ? 'bg-green-100 border border-green-200' : 'bg-red-100 border border-red-200'
        }`}>
          <h3 className="text-xl font-semibold mb-2">
            {results.passed ? '🎉 Quiz Passed!' : '❌ Quiz Failed'}
          </h3>
          <p className="text-lg font-bold">Score: {results.score}%</p>
          <p className="text-sm text-gray-600">
            {results.total_score} out of {results.total_possible} points
          </p>
          <p className="text-sm">
            Passing score: {quiz.passing_score}%
          </p>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold">Answer Review:</h4>
          {quiz.quiz_questions.map((question, index) => {
            const userAnswer = results.answers.find(a => a.question_id === question.id);
            return (
              <div key={question.id} className="border rounded-lg p-4">
                <p className="font-medium mb-2">
                  {index + 1}. {question.question_text}
                </p>
                <div className="space-y-1">
                  {Object.entries(question.options).map(([key, value]) => (
                    <div key={key} className={`p-2 rounded ${
                      key === question.correct_answer
                        ? 'bg-green-100 border border-green-200'
                        : key === userAnswer?.user_answer && !userAnswer?.is_correct
                        ? 'bg-red-100 border border-red-200'
                        : 'bg-gray-50'
                    }`}>
                      {key}. {value}
                      {key === question.correct_answer && ' ✅'}
                      {key === userAnswer?.user_answer && !userAnswer?.is_correct && ' ❌'}
                    </div>
                  ))}
                </div>
                <p className={`text-sm mt-2 ${
                  userAnswer?.is_correct ? 'text-green-600' : 'text-red-600'
                }`}>
                  Your answer: {userAnswer?.user_answer || 'Not answered'} • 
                  {userAnswer?.is_correct ? ' Correct' : ' Incorrect'}
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
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">{quiz.title}</h3>
        <div className="text-sm text-gray-600">
          Time: {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, '0')}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span>Question {currentQuestion + 1} of {quiz.quiz_questions.length}</span>
          <span>{Math.round(((currentQuestion + 1) / quiz.quiz_questions.length) * 100)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestion + 1) / quiz.quiz_questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-lg font-medium mb-4">{question.question_text}</h4>
        
        <div className="space-y-2">
          {Object.entries(question.options).map(([key, value]) => (
            <label key={key} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name={`question-${question.id}`}
                value={key}
                checked={answers[question.id] === key}
                onChange={() => handleAnswerSelect(question.id, key)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="flex-1">
                <strong>{key}.</strong> {value}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
          className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>

        {currentQuestion === quiz.quiz_questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={submitting || Object.keys(answers).length !== quiz.quiz_questions.length}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Next
          </button>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        {Object.keys(answers).length} of {quiz.quiz_questions.length} questions answered
      </div>
    </div>
  );
}