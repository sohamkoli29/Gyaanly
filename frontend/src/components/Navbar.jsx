import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null) // ADD THIS LINE
  const navigate = useNavigate()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      
      if (!error && data) {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const isInstructor = profile?.role === 'instructor' || profile?.role === 'admin'

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
                {/* Only show Instructor link for instructors/admins */}
                {isInstructor && (
                  <Link to="/instructor/dashboard" className="text-gray-600 hover:text-blue-600 transition-colors">
                    Instructor
                  </Link>
                )}
                <Link to="/my-courses" className="text-gray-600 hover:text-blue-600 transition-colors">
                  My Courses
                </Link>
                <Link to="/my-certificates" className="text-gray-600 hover:text-blue-600 transition-colors">
  Certificates
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