import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Courses from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
import MyCourses from './pages/MyCourses'
import Profile from './pages/Profile'
import InstructorDashboard from './pages/InstructorDashboard' // Add this import

function App() {
  return (
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
          <Route path="/instructor/dashboard" element={<InstructorDashboard />} /> {/* Add this route */}
        </Routes>
      </main>
    </div>
  )
}

export default App