import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { coursesAPI } from '../services/api';
import { formatCurrency } from '../utils/currency'; 

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const data = await coursesAPI.getCourses();
      setCourses(data.courses);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter courses based on search and level
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = selectedLevel === 'all' || course.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 relative">
        {/* Animated Background */}
        <div className="grid-bg fixed inset-0 opacity-20 pointer-events-none" />
        
        <div className="container-cyber">
          {/* Header Skeleton */}
          <div className="text-center mb-16">
            <div className="h-12 w-64 skeleton rounded-lg mx-auto mb-4" />
            <div className="h-6 w-96 skeleton rounded mx-auto" />
          </div>

          {/* Filters Skeleton */}
          <div className="flex flex-col lg:flex-row gap-6 mb-12">
            <div className="flex-1">
              <div className="h-14 skeleton rounded-xl" />
            </div>
            <div className="flex gap-4">
              <div className="h-14 w-32 skeleton rounded-xl" />
              <div className="h-14 w-32 skeleton rounded-xl" />
            </div>
          </div>

          {/* Course Grid Skeleton */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="glass-card">
                <div className="h-48 mb-6 rounded-xl skeleton" />
                <div className="space-y-3">
                  <div className="h-6 w-3/4 skeleton rounded" />
                  <div className="h-4 w-full skeleton rounded" />
                  <div className="h-4 w-2/3 skeleton rounded" />
                  <div className="flex justify-between items-center pt-4">
                    <div className="h-8 w-20 skeleton rounded" />
                    <div className="h-6 w-16 skeleton rounded" />
                  </div>
                  <div className="h-12 skeleton rounded-lg mt-4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 relative">
      {/* Animated Background */}
      <div className="grid-bg fixed inset-0 opacity-20 pointer-events-none" />
      
      {/* Floating Elements */}
      <div className="absolute top-40 left-[5%] w-16 h-16 border-2 border-cyan-400/20 rounded-lg rotate-45 float" />
      <div className="absolute bottom-40 right-[10%] w-12 h-12 border-2 border-purple-400/20 rounded-full float" style={{ animationDelay: '2s' }} />

      <div className="container-cyber relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 glass-card px-4 py-2 mb-6">
            <span className="notification-dot" />
            <span className="text-sm font-medium text-cyan-400">
              🚀 Explore Cutting-Edge Courses
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            <span className="gradient-text">All Courses</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Discover the future of learning with our curated collection of 
            <span className="text-cyan-400 font-semibold"> advanced courses</span>
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col lg:flex-row gap-6 mb-12">
          {/* Search Bar */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search courses, technologies, instructors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-cyber pl-12"
            />
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-cyan-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Level Filter */}
          <div className="flex gap-4">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="input-cyber w-32 appearance-none cursor-pointer"
            >
              <option value="all">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            
            {/* Results Count */}
            <div className="glass-card px-4 flex items-center">
              <span className="text-cyan-400 font-semibold">{filteredCourses.length}</span>
              <span className="text-gray-400 ml-2">courses</span>
            </div>
          </div>
        </div>

        {/* Course Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {filteredCourses.map(course => (
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
                
                {/* Level Badge */}
                <div className="absolute top-3 right-3 badge-cyber">
                  {course.level}
                </div>

                {/* Hover Effect Overlay */}
                <div className="absolute inset-0 bg-cyan-400/0 group-hover:bg-cyan-400/10 transition-all duration-500" />
              </div>

              {/* Course Content */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-2">
                  {course.title}
                </h3>
                
                <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">
                  {course.description}
                </p>

                {/* Instructor and Rating */}
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

                {/* Price and Duration */}
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold gradient-text">
                    {formatCurrency(course.price)}
                  </span>
                  <span className="text-sm text-gray-400">
                    {course.duration_hours || 0}h content
                  </span>
                </div>

                {/* View Course Button */}
                <div className="pt-4 border-t border-cyan-400/20">
                  <div className="btn-ghost group-hover:btn-cyber w-full text-center transition-all duration-300">
                    <span className="relative z-10">Explore Course</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Empty State */}
        {filteredCourses.length === 0 && (
          <div className="text-center py-20">
            <div className="glass-card max-w-md mx-auto p-8">
              <div className="text-6xl mb-4">🔍</div>
              <h2 className="text-2xl font-bold gradient-text mb-4">No Courses Found</h2>
              <p className="text-gray-400 mb-6">
                {searchTerm || selectedLevel !== 'all' 
                  ? 'Try adjusting your search criteria or filters'
                  : 'New courses are coming soon!'
                }
              </p>
              {(searchTerm || selectedLevel !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedLevel('all');
                  }}
                  className="btn-ghost"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Stats Section */}
        <div className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Courses', value: courses.length, icon: '📚' },
            { label: 'Expert Instructors', value: new Set(courses.map(c => c.instructor_id)).size, icon: '👨‍🏫' },
            { label: 'Technologies', value: '50+', icon: '⚡' },
            { label: 'Success Rate', value: '98%', icon: '🎯' }
          ].map((stat, index) => (
            <div key={index} className="glass-card text-center p-6">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold gradient-text mb-1">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}