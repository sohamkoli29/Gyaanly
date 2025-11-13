import { useState } from 'react';
import { quizAPI } from '../services/api';

export default function QuizManager({ courseId, onQuizCreated }) {
  const [showForm, setShowForm] = useState(false);
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
      await quizAPI.createQuiz(courseId, quizData);
      setShowForm(false);
      onQuizCreated?.();
    } catch (error) {
      console.error('Error creating quiz:', error);
      alert('Error creating quiz: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <div className="text-center py-8">
        <button
          onClick={() => setShowForm(true)}
          className="btn-cyber group"
        >
          <span>Create Assessment</span>
          <span className="inline-block ml-2 text-xl transition-transform group-hover:scale-110">🧠</span>
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card border-2 border-cyan-400/30 p-6">
      <h3 className="text-2xl font-bold gradient-text mb-6">Create Knowledge Assessment</h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
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

        <div>
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-xl font-bold gradient-text flex items-center gap-2">
              <span>📝</span>
              Assessment Modules
            </h4>
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
                  <h5 className="font-bold text-cyan-400 text-lg flex items-center gap-2">
                    <span className="badge-cyber bg-cyan-400/20 text-cyan-400 border-cyan-400/40">
                      M{index + 1}
                    </span>
                    Knowledge Module {index + 1}
                  </h5>
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
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-cyan-400">
                      MODULE CONTENT *
                    </label>
                    <input
                      type="text"
                      value={question.question_text}
                      onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                      required
                      className="input-cyber"
                      placeholder="Enter question text"
                    />
                  </div>

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

        <div className="flex space-x-4 pt-6 border-t border-cyan-400/20">
          <button
            type="submit"
            disabled={loading}
            className="btn-neon flex-1 group disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Creating Assessment...</span>
              </div>
            ) : (
              <>
                <span>Create Assessment</span>
                <span className="inline-block ml-2 text-xl transition-transform group-hover:scale-110">🚀</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="btn-ghost px-8"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}