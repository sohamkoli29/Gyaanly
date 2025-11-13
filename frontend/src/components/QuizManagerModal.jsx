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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
      <div className="glass-card border-2 border-cyan-400/30 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-neon-lg">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-cyan-400/20 px-6 py-4">
          <div>
            <h2 className="text-2xl font-bold gradient-text">
              {existingQuiz ? 'Edit Assessment' : 'Create Assessment'} - {courseTitle}
            </h2>
            <p className="text-cyan-400 text-sm mt-1">
              {existingQuiz ? 'Update your assessment modules and parameters' : 'Design a new knowledge assessment'}
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-cyan-400 hover:text-cyan-300 text-2xl transition-colors disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Quiz Basic Info */}
            <div className="glass-card border-2 border-cyan-400/20 p-6">
              <h3 className="text-xl font-bold gradient-text mb-4 flex items-center gap-2">
                <span>⚙️</span>
                Assessment Configuration
              </h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-cyan-400">
                    ASSESSMENT TITLE *
                  </label>
                  <input
                    type="text"
                    value={quizData.title}
                    onChange={(e) => setQuizData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    className="input-cyber"
                    placeholder="Enter assessment title"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-cyan-400">
                    DESCRIPTION
                  </label>
                  <textarea
                    value={quizData.description}
                    onChange={(e) => setQuizData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="input-cyber resize-none"
                    placeholder="Describe the assessment objectives..."
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-cyan-400">
                      PASSING SCORE (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={quizData.passing_score}
                      onChange={(e) => setQuizData(prev => ({ ...prev, passing_score: parseInt(e.target.value) }))}
                      className="input-cyber"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-cyan-400">
                      TIME LIMIT (MINUTES)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quizData.time_limit_minutes}
                      onChange={(e) => setQuizData(prev => ({ ...prev, time_limit_minutes: parseInt(e.target.value) }))}
                      className="input-cyber"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Questions Section */}
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold gradient-text flex items-center gap-2">
                  <span>📝</span>
                  Assessment Modules
                </h3>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="btn-cyber group text-sm"
                >
                  <span>+ Add Module</span>
                  <span className="inline-block ml-2 transition-transform group-hover:scale-110">🔧</span>
                </button>
              </div>

              <div className="space-y-6">
                {quizData.questions.map((question, index) => (
                  <div key={index} className="glass-card border-2 border-cyan-400/20 p-6">
                    <div className="flex justify-between items-start mb-6">
                      <h4 className="font-bold text-cyan-400 text-lg flex items-center gap-2">
                        <span className="badge-cyber bg-cyan-400/20 text-cyan-400 border-cyan-400/40">
                          M{index + 1}
                        </span>
                        Knowledge Module {index + 1}
                      </h4>
                      {quizData.questions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeQuestion(index)}
                          className="text-red-400 hover:text-red-300 text-sm font-semibold transition-colors flex items-center gap-1"
                        >
                          <span>🗑️</span>
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-6">
                      {/* Question Text */}
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-cyan-400">
                          MODULE CONTENT *
                        </label>
                        <textarea
                          value={question.question_text}
                          onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                          required
                          rows={3}
                          className="input-cyber resize-none"
                          placeholder="Enter your assessment module content..."
                        />
                      </div>

                      {/* Options */}
                      <div className="space-y-3">
                        <label className="block text-sm font-semibold text-cyan-400">
                          RESPONSE OPTIONS *
                        </label>
                        <div className="grid gap-3">
                          {['A', 'B', 'C', 'D'].map(optionKey => (
                            <div key={optionKey} className="flex items-center space-x-4">
                              <span className="w-8 h-8 rounded-full bg-cyan-400/20 border-2 border-cyan-400/40 flex items-center justify-center text-cyan-400 font-bold text-sm">
                                {optionKey}
                              </span>
                              <input
                                type="text"
                                value={question.options[optionKey]}
                                onChange={(e) => updateOption(index, optionKey, e.target.value)}
                                required
                                className="input-cyber flex-1"
                                placeholder={`Response ${optionKey}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Settings */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-cyan-400">
                            CORRECT RESPONSE *
                          </label>
                          <select
                            value={question.correct_answer}
                            onChange={(e) => updateQuestion(index, 'correct_answer', e.target.value)}
                            className="input-cyber appearance-none cursor-pointer"
                          >
                            <option value="A">Response A</option>
                            <option value="B">Response B</option>
                            <option value="C">Response C</option>
                            <option value="D">Response D</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-cyan-400">
                            POINT VALUE
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={question.points}
                            onChange={(e) => updateQuestion(index, 'points', parseInt(e.target.value))}
                            className="input-cyber"
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
        <div className="border-t border-cyan-400/20 px-6 py-4 bg-dark-void/50">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            <div className="text-cyan-400 text-sm glass-card px-4 py-2 border border-cyan-400/20">
              <span className="font-semibold">{quizData.questions.length}</span> module{quizData.questions.length !== 1 ? 's' : ''} • 
              Total points: <span className="font-semibold text-cyan-400">{quizData.questions.reduce((sum, q) => sum + q.points, 0)}</span>
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="btn-ghost disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading || !quizData.title || quizData.questions.some(q => !q.question_text)}
                className="btn-neon group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>{existingQuiz ? 'Updating...' : 'Creating...'}</span>
                  </div>
                ) : (
                  <>
                    <span>{existingQuiz ? 'Update Assessment' : 'Create Assessment'}</span>
                    <span className="inline-block ml-2 transition-transform group-hover:scale-110">
                      {existingQuiz ? '🔄' : '🚀'}
                    </span>
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