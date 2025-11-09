import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'

export default function Home() {
  const [user, setUser] = useState(null)
  const [featuredCourses, setFeaturedCourses] = useState([])

  useEffect(() => {
    // Get user session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    // Fetch featured courses
    const fetchFeaturedCourses = async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          profiles(full_name)
        `)
        .eq('is_published', true)
        .limit(6)

      if (!error && data) {
        setFeaturedCourses(data)
      }
    }

    fetchFeaturedCourses()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Learn Without 
              <span className="block text-yellow-300">Limits</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
              Start, switch, or advance your career with thousands of courses, 
              certificates, and degrees from world-class instructors.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link 
                  to="/courses" 
                  className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-lg font-bold text-lg hover:bg-yellow-300 transition-colors"
                >
                  Browse Courses
                </Link>
              ) : (
                <>
                  <Link 
                    to="/signup" 
                    className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-lg font-bold text-lg hover:bg-yellow-300 transition-colors"
                  >
                    Join for Free
                  </Link>
                  <Link 
                    to="/courses" 
                    className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white hover:text-gray-900 transition-colors"
                  >
                    Browse Courses
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">10,000+</div>
              <div className="text-gray-600">Active Students</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">500+</div>
              <div className="text-gray-600">Expert Instructors</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600 mb-2">2,000+</div>
              <div className="text-gray-600">Courses Available</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Why Choose LearnHub?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 text-2xl">🎓</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Expert Instructors</h3>
              <p className="text-gray-600">Learn from industry experts with real-world experience</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 text-2xl">📚</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Diverse Courses</h3>
              <p className="text-gray-600">Choose from thousands of courses in various domains</p>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-600 text-2xl">🏆</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Get Certified</h3>
              <p className="text-gray-600">Earn certificates to showcase your skills</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Courses Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold">Featured Courses</h2>
            <Link to="/courses" className="text-blue-600 hover:text-blue-700 font-semibold">
              View all courses →
            </Link>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredCourses.length > 0 ? (
              featuredCourses.map(course => (
                <div key={course.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-6">
                    <h3 className="text-xl font-semibold mb-2">{course.title}</h3>
                    <p className="text-gray-600 mb-4 line-clamp-2">{course.description}</p>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-lg font-bold text-blue-600">{course.price === 0 ? 'Free' : `$${course.price}`}</span>
                      <span className="text-yellow-500">⭐ {course.rating || '4.5'}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>By {course.profiles?.full_name || 'Instructor'}</span>
                      <span>{course.duration_hours || 0}h</span>
                    </div>
                    <Link 
                      to={`/courses/${course.id}`}
                      className="block w-full mt-4 bg-blue-600 text-white text-center py-2 rounded hover:bg-blue-700 transition-colors"
                    >
                      Enroll Now
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              // Loading skeleton
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="h-48 bg-gray-200 animate-pulse"></div>
                  <div className="p-6">
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse mb-4"></div>
                    <div className="flex justify-between mb-4">
                      <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-16 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Learning?</h2>
          <p className="text-xl mb-8">Join thousands of students already learning on LearnHub</p>
          {!user && (
            <Link 
              to="/signup" 
              className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-lg font-bold text-lg hover:bg-yellow-300 transition-colors"
            >
              Get Started Today
            </Link>
          )}
        </div>
      </section>
    </div>
  )
}