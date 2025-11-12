import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Courses from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
import MyCourses from './pages/MyCourses'
import Profile from './pages/Profile'
import InstructorDashboard from './pages/InstructorDashboard'
import QuizManagement from './pages/QuizManagement' // Add this import
import ErrorBoundary from './components/ErrorBoundary' // Add this import

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/:id" element={<CourseDetail />} />
            <Route path="/my-courses" element={<MyCourses />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/instructor/dashboard" element={<InstructorDashboard />} />
            <Route path="/courses/:courseId/quiz-management" element={<QuizManagement />} />
          </Routes>
        </main>
      </div>
    </ErrorBoundary>
  )
}

export default App