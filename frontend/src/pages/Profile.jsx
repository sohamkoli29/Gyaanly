import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { supabase } from '../services/supabaseClient';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
      return;
    }
    setUser(session.user);
    fetchProfile();
  };

  const fetchProfile = async () => {
    try {
      const data = await authAPI.getProfile();
      setProfile(data.user);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setMessage('Error loading profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setMessage('');

    try {
      const formData = new FormData(e.target);
      const profileData = {
        full_name: formData.get('fullName'),
        username: formData.get('username'),
        avatar_url: formData.get('avatarUrl'),
      };

      console.log('Updating profile with data:', profileData);

      const data = await authAPI.updateProfile(profileData);
      setProfile(data.profile);
      setMessage('Profile updated successfully!');
    } catch (error) {
      console.error('Update profile error:', error);
      setMessage(`Error updating profile: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 relative">
        <div className="grid-bg fixed inset-0 opacity-20 pointer-events-none" />
        <div className="container-cyber relative z-10">
          <div className="animate-pulse space-y-6">
            <div className="h-12 skeleton rounded-lg w-1/3 mb-8" />
            <div className="grid lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1 space-y-4">
                <div className="glass-card p-6 skeleton h-32 rounded-xl" />
                <div className="glass-card p-4 skeleton h-24 rounded-xl" />
              </div>
              <div className="lg:col-span-3">
                <div className="glass-card p-8 skeleton h-96 rounded-2xl" />
              </div>
            </div>
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
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 glass-card px-4 py-2 mb-4">
            <span className="notification-dot" />
            <span className="text-sm font-medium text-cyan-400">
              👤 User Profile Portal
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-4">
            Digital Identity
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Manage your learning profile and personal information
          </p>
        </div>

        {message && (
          <div className={`glass-card p-4 mb-8 backdrop-blur-xl border-2 ${
            message.includes('Error') 
              ? 'bg-red-400/10 border-red-400/30 text-red-400'
              : 'bg-green-400/10 border-green-400/30 text-green-400'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {message.includes('Error') ? '⚠️' : '✅'}
              </span>
              <span>{message}</span>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 text-center mb-6">
              {/* Avatar */}
              <div className="relative inline-block mb-4">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white border-4 border-cyan-400/50">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.full_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    profile?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-neon-green rounded-full border-2 border-dark-void animate-pulse" />
              </div>
              
              <h2 className="text-xl font-bold text-white mb-1">
                {profile?.full_name || 'Anonymous Learner'}
              </h2>
              <p className="text-cyan-400 text-sm mb-3">@{profile?.username || 'username'}</p>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/20 text-cyan-400 text-xs font-medium border border-cyan-400/30">
                <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                {profile?.role || 'student'}
              </div>
            </div>

            {/* Stats */}
            <div className="glass-card p-6">
              <h3 className="font-bold text-cyan-400 mb-4">Learning Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Courses</span>
                  <span className="text-white font-semibold">0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Certificates</span>
                  <span className="text-white font-semibold">0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Member Since</span>
                  <span className="text-white font-semibold text-sm">
                    {new Date(user?.created_at).getFullYear()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="glass-card p-8">
              {/* Tabs */}
              <div className="flex gap-2 mb-8 border-b border-cyan-400/20 pb-4">
                {[
                  { key: 'profile', label: 'Profile Settings', icon: '👤' },
                  { key: 'security', label: 'Security', icon: '🔒' },
                  { key: 'preferences', label: 'Preferences', icon: '⚙️' }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300
                      ${activeTab === tab.key
                        ? 'bg-cyan-400/20 text-cyan-400 shadow-neon-sm'
                        : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10'
                      }
                    `}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Profile Form */}
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-cyan-400 mb-3">
                      <span className="flex items-center gap-2">
                        <span>📧</span>
                        <span>Email Address</span>
                      </span>
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="input-cyber bg-gray-800/50 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400 mt-2">Email verification is secured by blockchain</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-cyan-400 mb-3">
                      <span className="flex items-center gap-2">
                        <span>🎯</span>
                        <span>User Role</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      value={profile?.role || 'student'}
                      disabled
                      className="input-cyber bg-gray-800/50 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-cyan-400 mb-3">
                      <span className="flex items-center gap-2">
                        <span>👤</span>
                        <span>Full Name</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      defaultValue={profile?.full_name || ''}
                      className="input-cyber"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-cyan-400 mb-3">
                      <span className="flex items-center gap-2">
                        <span>🏷️</span>
                        <span>Username</span>
                      </span>
                    </label>
                    <input
                      type="text"
                      name="username"
                      defaultValue={profile?.username || ''}
                      className="input-cyber"
                      placeholder="Choose a unique username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-cyan-400 mb-3">
                    <span className="flex items-center gap-2">
                      <span>🖼️</span>
                      <span>Avatar URL</span>
                    </span>
                  </label>
                  <input
                    type="url"
                    name="avatarUrl"
                    defaultValue={profile?.avatar_url || ''}
                    className="input-cyber"
                    placeholder="https://example.com/avatar.jpg"
                  />
                  <p className="text-xs text-gray-400 mt-2">Supports PNG, JPG, and WebP formats</p>
                </div>

                {/* Additional Info */}
                <div className="grid md:grid-cols-3 gap-6 pt-6 border-t border-cyan-400/20">
                  <div className="text-center">
                    <div className="text-2xl text-cyan-400 mb-2">🎓</div>
                    <div className="text-sm text-gray-400">Learning Level</div>
                    <div className="text-white font-semibold">Beginner</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl text-purple-400 mb-2">⏱️</div>
                    <div className="text-sm text-gray-400">Active Since</div>
                    <div className="text-white font-semibold">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Recently'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl text-neon-green mb-2">✅</div>
                    <div className="text-sm text-gray-400">Status</div>
                    <div className="text-neon-green font-semibold">Verified</div>
                  </div>
                </div>

                <div className="flex space-x-4 pt-6 border-t border-cyan-400/20">
                  <button
                    type="submit"
                    disabled={updating}
                    className="flex-1 btn-cyber group relative overflow-hidden"
                  >
                    {updating ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Updating Profile...</span>
                      </div>
                    ) : (
                      <>
                        <span className="relative z-10 flex items-center justify-center space-x-2">
                          <span>Update Digital Identity</span>
                          <span className="text-lg transition-transform group-hover:scale-110">⚡</span>
                        </span>
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="btn-ghost px-8 group"
                  >
                    <span>Refresh</span>
                    <span className="inline-block ml-2 transition-transform group-hover:rotate-180">🔄</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}