import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <nav className="bg-white shadow-lg border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg"></div>
            <span className="font-bold text-xl text-gray-800">LearnHub</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            <Link to="/courses" className="text-gray-600 hover:text-blue-600 transition-colors">
              Courses
            </Link>
            
      {user ? (
  <div className="flex items-center space-x-4">
    <Link to="/instructor/dashboard" className="text-gray-600 hover:text-blue-600 transition-colors">
      Instructor
    </Link>
    <Link to="/my-courses" className="text-gray-600 hover:text-blue-600 transition-colors">
      My Courses
    </Link>
    <Link to="/profile" className="text-gray-600 hover:text-blue-600 transition-colors">
      Profile
    </Link>
    <button 
      onClick={handleLogout}
      className="text-gray-600 hover:text-blue-600 transition-colors"
    >
      Logout
    </button>
  </div>
) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-blue-600 transition-colors">
                  Login
                </Link>
                <Link 
                  to="/signup" 
                  className="btn-primary"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}