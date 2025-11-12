import { useState, useEffect } from 'react';
import { quizAPI } from '../services/api';

export default function QuizManagerModal({ courseId, courseTitle, isOpen, onClose, onQuizCreated, existingQuiz }) {
  const [loading, setLoading] = useState(false);
  const [quizData, setQuizData] = useState({
    title: '',
    description: '',
    passing_score: 70,
    time_limit_minutes: 30,
    questions: [
      {
        question_text: '',
        options: { A: '', B: '', C: '', D: '' },
        correct_answer: 'A',
        points: 1
      }
    ]
  });

  // Initialize form with existing quiz data when modal opens or quiz changes
  useEffect(() => {
    if (isOpen && existingQuiz) {
      setQuizData({
        title: existingQuiz.title || '',
        description: existingQuiz.description || '',
        passing_score: existingQuiz.passing_score || 70,
        time_limit_minutes: existingQuiz.time_limit_minutes || 30,
        questions: existingQuiz.quiz_questions?.map(q => ({
          question_text: q.question_text || '',
          options: q.options || { A: '', B: '', C: '', D: '' },
          correct_answer: q.correct_answer || 'A',
          points: q.points || 1
        })) || [
          {
            question_text: '',
            options: { A: '', B: '', C: '', D: '' },
            correct_answer: 'A',
            points: 1
          }
        ]
      });
    } else if (isOpen) {
      // Reset form for new quiz
      setQuizData({
        title: '',
        description: '',
        passing_score: 70,
        time_limit_minutes: 30,
        questions: [
          {
            question_text: '',
            options: { A: '', B: '', C: '', D: '' },
            correct_answer: 'A',
            points: 1
          }
        ]
      });
    }
  }, [isOpen, existingQuiz]);

  const resetForm = () => {
    setQuizData({
      title: '',
      description: '',
      passing_score: 70,
      time_limit_minutes: 30,
      questions: [
        {
          question_text: '',
          options: { A: '', B: '', C: '', D: '' },
          correct_answer: 'A',
          points: 1
        }
      ]
    });
  };

  const addQuestion = () => {
    setQuizData(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          question_text: '',
          options: { A: '', B: '', C: '', D: '' },
          correct_answer: 'A',
          points: 1
        }
      ]
    }));
  };

  const updateQuestion = (index, field, value) => {
    setQuizData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }));
  };

  const updateOption = (questionIndex, optionKey, value) => {
    setQuizData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === questionIndex 
          ? { 
              ...q, 
              options: { ...q.options, [optionKey]: value } 
            } 
          : q
      )
    }));
  };

  const removeQuestion = (index) => {
    setQuizData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (existingQuiz) {
        // Update existing quiz
        await quizAPI.updateQuiz(existingQuiz.id, quizData);
      } else {
        // Create new quiz
        await quizAPI.createQuiz(courseId, quizData);
      }
      
      resetForm();
      onQuizCreated?.();
      onClose();
      alert(`Quiz ${existingQuiz ? 'updated' : 'created'} successfully!`);
    } catch (error) {
      console.error('Error saving quiz:', error);
      alert(`Error ${existingQuiz ? 'updating' : 'creating'} quiz: ` + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    
    const hasData = quizData.title || quizData.questions.some(q => q.question_text);
    if (hasData) {
      if (!confirm('Are you sure you want to close? All unsaved changes will be lost.')) {
        return;
      }
    }
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {existingQuiz ? 'Edit Quiz' : 'Create Quiz'} - {courseTitle}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {existingQuiz ? 'Update your quiz questions and settings' : 'Add a quiz to assess student learning'}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 text-2xl disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Quiz Basic Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Quiz Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quiz Title *
                  </label>
                  <input
                    type="text"
                    value={quizData.title}
                    onChange={(e) => setQuizData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter quiz title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={quizData.description}
                    onChange={(e) => setQuizData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter quiz description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Passing Score (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={quizData.passing_score}
                      onChange={(e) => setQuizData(prev => ({ ...prev, passing_score: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time Limit (minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quizData.time_limit_minutes}
                      onChange={(e) => setQuizData(prev => ({ ...prev, time_limit_minutes: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Questions Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Questions</h3>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <span>+</span>
                  <span>Add Question</span>
                </button>
              </div>

              <div className="space-y-6">
                {quizData.questions.map((question, index) => (
                  <div key={index} className="border-2 border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-semibold text-lg">Question {index + 1}</h4>
                      {quizData.questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(index)}
                          className="text-red-600 hover:text-red-700 text-sm font-semibold"
                        >
                          Remove Question
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Question Text */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Question Text *
                        </label>
                        <textarea
                          value={question.question_text}
                          onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                          required
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter your question here..."
                        />
                      </div>

                      {/* Options */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Answer Options *
                        </label>
                        <div className="space-y-3">
                          {['A', 'B', 'C', 'D'].map(optionKey => (
                            <div key={optionKey} className="flex items-center space-x-3">
                              <span className="w-6 font-semibold text-gray-700">{optionKey}.</span>
                              <input
                                type="text"
                                value={question.options[optionKey]}
                                onChange={(e) => updateOption(index, optionKey, e.target.value)}
                                required
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={`Option ${optionKey}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Settings */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Correct Answer *
                          </label>
                          <select
                            value={question.correct_answer}
                            onChange={(e) => updateQuestion(index, 'correct_answer', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                            <option value="D">D</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Points
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={question.points}
                            onChange={(e) => updateQuestion(index, 'points', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {quizData.questions.length} question{quizData.questions.length !== 1 ? 's' : ''} • 
              Total points: {quizData.questions.reduce((sum, q) => sum + q.points, 0)}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading || !quizData.title || quizData.questions.some(q => !q.question_text)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    <span>{existingQuiz ? 'Updating...' : 'Creating...'}</span>
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    <span>{existingQuiz ? 'Update Quiz' : 'Create Quiz'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}