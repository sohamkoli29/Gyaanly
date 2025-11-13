  import { Link, useNavigate, useLocation } from 'react-router-dom'
  import { useEffect, useState } from 'react'
  import { supabase } from '../services/supabaseClient'

  export default function Navbar() {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
      // Handle scroll effect
      const handleScroll = () => {
        setScrolled(window.scrollY > 20)
      }
      window.addEventListener('scroll', handleScroll)

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

      return () => {
        subscription.unsubscribe()
        window.removeEventListener('scroll', handleScroll)
      }
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
      setMobileMenuOpen(false)
      navigate('/')
    }

    const isInstructor = profile?.role === 'instructor' || profile?.role === 'admin'

    const isActive = (path) => location.pathname === path

    const NavLink = ({ to, children, mobile = false }) => (
      <Link
        to={to}
        onClick={() => mobile && setMobileMenuOpen(false)}
        className={`
          relative px-4 py-2 font-medium transition-all duration-300
          ${isActive(to) 
            ? 'text-cyan-400' 
            : 'text-gray-300 hover:text-cyan-400'
          }
          ${mobile ? 'block text-lg' : ''}
          group
        `}
      >
        <span className="relative z-10">{children}</span>
        {isActive(to) && (
          <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-400 to-purple-500" />
        )}
        <span className="absolute inset-0 bg-cyan-400/0 group-hover:bg-cyan-400/10 rounded-lg transition-all duration-300" />
      </Link>
    )

    return (
      <nav 
        className={`
          fixed top-0 left-0 right-0 z-50 transition-all duration-300
          ${scrolled 
            ? 'backdrop-blur-xl bg-[#0a0e27]/80 shadow-[0_0_30px_rgba(0,240,255,0.1)]' 
            : 'bg-transparent'
          }
        `}
      >
        {/* Top Border Glow */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50" />

        <div className="container-cyber">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link 
              to="/" 
              className="flex items-center gap-3 group"
              onClick={() => setMobileMenuOpen(false)}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="text-white font-black text-xl">G</span>
                </div>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400 to-purple-600 blur-md opacity-50 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="font-black text-2xl gradient-text hidden sm:block">
                Gyaanly
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-2">
              <NavLink to="/courses">Courses</NavLink>
              
              {user ? (
                <>
                  {isInstructor && (
                    <NavLink to="/instructor/dashboard">Dashboard</NavLink>
                  )}
                  <NavLink to="/my-courses">My Learning</NavLink>
                  <NavLink to="/my-certificates">Certificates</NavLink>
                  <NavLink to="/payment-history">Payments</NavLink>
                  
                  {/* User Menu */}
                  <div className="relative group ml-4">
                    <button className="flex items-center gap-2 glass-card px-4 py-2 hover:border-cyan-400/50 transition-all">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-sm font-bold">
                        {user.email?.charAt(0).toUpperCase()}
                      </div>
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {/* Dropdown */}
                    <div className="absolute right-0 top-full mt-2 w-48 glass-card opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top group-hover:scale-100 scale-95">
                      <Link
                        to="/profile"
                        className="block px-4 py-3 text-gray-300 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all rounded-t-xl"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Profile
                        </div>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-3 text-red-400 hover:bg-red-400/10 transition-all rounded-b-xl"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Logout
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 ml-4">
                  <Link to="/login" className="btn-ghost">
                    Login
                  </Link>
                  <Link to="/signup" className="btn-cyber">
                    <span className="relative z-10">Sign Up</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden glass-card p-2 hover:border-cyan-400/50 transition-all"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div 
          className={`
            lg:hidden absolute top-full left-0 right-0
            glass-card mx-4 mt-2 overflow-hidden
            transition-all duration-300 origin-top
            ${mobileMenuOpen 
              ? 'opacity-100 visible scale-100' 
              : 'opacity-0 invisible scale-95'
            }
          `}
        >
          <div className="p-4 space-y-2">
            <NavLink to="/courses" mobile>
              <div className="flex items-center gap-3">
                <span className="text-2xl">📚</span>
                Courses
              </div>
            </NavLink>
            
            {user ? (
              <>
                {isInstructor && (
                  <NavLink to="/instructor/dashboard" mobile>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🎓</span>
                      Dashboard
                    </div>
                  </NavLink>
                )}
                <NavLink to="/my-courses" mobile>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📖</span>
                    My Learning
                  </div>
                </NavLink>
                <NavLink to="/my-certificates" mobile>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🏆</span>
                    Certificates
                  </div>
                </NavLink>
                <NavLink to="/payment-history" mobile>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">💳</span>
                    Payments
                  </div>
                </NavLink>
                <NavLink to="/profile" mobile>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">👤</span>
                    Profile
                  </div>
                </NavLink>
                
                <div className="pt-4 border-t border-cyan-400/20">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-lg transition-all font-medium"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🚪</span>
                      Logout
                    </div>
                  </button>
                </div>
              </>
            ) : (
              <div className="pt-4 border-t border-cyan-400/20 space-y-3">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center btn-ghost"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center btn-cyber"
                >
                  <span className="relative z-10">Sign Up</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    )
  }