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
      <div className="max-w-2xl mx-auto mt-8 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6">
      <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
      
      {message && (
        <div className={`p-4 rounded mb-6 ${
          message.includes('Error') 
            ? 'bg-red-100 border border-red-400 text-red-700'
            : 'bg-green-100 border border-green-400 text-green-700'
        }`}>
          {message}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="mb-4 p-4 bg-blue-50 rounded">
          <p className="text-sm text-blue-700">
            <strong>Debug Info:</strong> User {user ? 'is authenticated' : 'is not authenticated'}
          </p>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
            <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              defaultValue={profile?.full_name || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              name="username"
              defaultValue={profile?.username || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Choose a username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Avatar URL
            </label>
            <input
              type="url"
              name="avatarUrl"
              defaultValue={profile?.avatar_url || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <input
              type="text"
              value={profile?.role || 'student'}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
            />
          </div>

          <button
            type="submit"
            disabled={updating}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {updating ? 'Updating...' : 'Update Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}