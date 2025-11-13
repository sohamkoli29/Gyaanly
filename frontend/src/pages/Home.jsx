import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../services/supabaseClient'
import { formatCurrency } from '../utils/currency'

export default function Home() {
  const [user, setUser] = useState(null)
  const [featuredCourses, setFeaturedCourses] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const fetchFeaturedCourses = async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`*, profiles(full_name)`)
        .eq('is_published', true)
        .limit(6)

      if (!error && data) {
        setFeaturedCourses(data)
      }
    }

    fetchFeaturedCourses()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-screen relative">
      {/* Animated Grid Background */}
      <div className="grid-bg fixed inset-0 opacity-30 pointer-events-none" />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Gradient Orbs */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        
        <div className="container-cyber py-24 sm:py-32 lg:py-40 relative z-10">
          <div className="text-center max-w-5xl mx-auto">
            {/* Animated Badge */}
            <div className="inline-flex items-center gap-2 glass-card px-4 py-2 mb-8 float">
              <span className="notification-dot" />
              <span className="text-sm font-medium text-cyan-400">
                🚀 Welcome to the Future of Learning
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
              <span className="gradient-text block mb-2">
                Learn Without
              </span>
              <span className="neon-text inline-block">
                Limits
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Unlock your potential with cutting-edge courses, 
              <span className="text-cyan-400 font-semibold"> AI-powered learning</span>, and 
              <span className="text-purple-400 font-semibold"> world-class instructors</span>.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {user ? (
                <Link to="/courses" className="btn-cyber w-full sm:w-auto">
                  <span className="relative z-10">Explore Courses</span>
                </Link>
              ) : (
                <>
                  <Link to="/signup" className="btn-cyber w-full sm:w-auto">
                    <span className="relative z-10">Start Learning Free</span>
                  </Link>
                  <Link to="/courses" className="btn-ghost w-full sm:w-auto">
                    Browse Courses
                  </Link>
                </>
              )}
            </div>

            {/* Trust Indicators */}
            <div className="mt-16 flex flex-wrap justify-center gap-8 text-center">
              <div className="glass-card px-6 py-4 min-w-[140px]">
                <div className="text-3xl font-bold gradient-text">10K+</div>
                <div className="text-sm text-gray-400 mt-1">Active Learners</div>
              </div>
              <div className="glass-card px-6 py-4 min-w-[140px]">
                <div className="text-3xl font-bold gradient-text">500+</div>
                <div className="text-sm text-gray-400 mt-1">Expert Mentors</div>
              </div>
              <div className="glass-card px-6 py-4 min-w-[140px]">
                <div className="text-3xl font-bold gradient-text">2K+</div>
                <div className="text-sm text-gray-400 mt-1">Courses</div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-1/4 left-[10%] w-20 h-20 border-2 border-cyan-400/30 rounded-lg rotate-45 float" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-1/4 right-[15%] w-16 h-16 border-2 border-purple-400/30 rounded-full float" style={{ animationDelay: '1.5s' }} />
      </section>

      <div className="section-divider" />

      {/* Features Section */}
      <section className="relative py-20">
        <div className="container-cyber">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold gradient-text mb-4">
              Why Choose Gyaanly?
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Experience learning reimagined with advanced technology and expert guidance
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {[
              {
                icon: '🎓',
                title: 'Expert Instructors',
                description: 'Learn from industry veterans with real-world experience and proven track records',
                gradient: 'from-cyan-500 to-blue-500'
              },
              {
                icon: '🚀',
                title: 'Advanced Learning',
                description: 'AI-powered personalized paths, interactive labs, and hands-on projects',
                gradient: 'from-purple-500 to-pink-500'
              },
              {
                icon: '🏆',
                title: 'Get Certified',
                description: 'Earn blockchain-verified certificates recognized by top companies worldwide',
                gradient: 'from-pink-500 to-red-500'
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="glass-card holographic card-hover group cursor-pointer"
              >
                <div className={`text-6xl mb-6 inline-block bg-gradient-to-br ${feature.gradient} bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white group-hover:text-cyan-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* Featured Courses Section */}
      <section className="relative py-20">
        <div className="container-cyber">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-12 gap-4">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold gradient-text mb-2">
                Featured Courses
              </h2>
              <p className="text-gray-400">Handpicked courses to accelerate your journey</p>
            </div>
            <Link 
              to="/courses" 
              className="btn-ghost group"
            >
              <span>Explore All</span>
              <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {featuredCourses.length > 0 ? (
              featuredCourses.map((course) => (
                <Link 
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="glass-card holographic card-hover group block"
                >
                  {/* Course Image */}
                  <div className="relative h-48 mb-6 rounded-xl overflow-hidden bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                    {course.thumbnail_url ? (
                      <img 
                        src={course.thumbnail_url} 
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">
                        📚
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    {/* Floating Badge */}
                    <div className="absolute top-3 right-3 badge-cyber">
                      {course.level}
                    </div>
                  </div>

                  {/* Course Content */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-2">
                      {course.title}
                    </h3>
                    
                    <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>

                    <div className="flex items-center justify-between pt-4 border-t border-cyan-400/20">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                          {course.profiles?.full_name?.charAt(0) || 'I'}
                        </div>
                        <span className="text-sm text-gray-400">
                          {course.profiles?.full_name || 'Instructor'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-yellow-400">⭐</span>
                        <span className="text-sm font-semibold text-white">
                          {course.rating || '4.5'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold gradient-text">
                        {formatCurrency(course.price)}
                      </span>
                      <span className="text-sm text-gray-400">
                        {course.duration_hours || 0}h content
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              // Loading Skeletons
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="glass-card">
                  <div className="h-48 mb-6 rounded-xl skeleton" />
                  <div className="space-y-3">
                    <div className="h-6 w-3/4 skeleton rounded" />
                    <div className="h-4 w-full skeleton rounded" />
                    <div className="h-4 w-2/3 skeleton rounded" />
                    <div className="h-8 w-1/3 skeleton rounded mt-4" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <div className="section-divider" />

      {/* CTA Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10" />
        
        <div className="container-cyber relative z-10">
          <div className="glass-card text-center max-w-4xl mx-auto p-8 md:p-12">
            <div className="text-5xl mb-6 float">🎯</div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold gradient-text mb-6">
              Ready to Start Your Journey?
            </h2>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Join thousands of learners transforming their careers with 
              <span className="text-cyan-400 font-semibold"> Gyaanly</span>
            </p>
            
            {!user && (
              <Link to="/signup" className="btn-neon inline-flex items-center gap-2">
                <span>Get Started Free</span>
                <span className="text-2xl">→</span>
              </Link>
            )}

            {/* Social Proof */}
            <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Cancel anytime</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400">✓</span>
                <span>Lifetime access</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}