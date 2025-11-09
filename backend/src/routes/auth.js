import express from 'express';
import { supabase,supabaseService  } from '../config/supabaseClient.js';

const router = express.Router();

router.get('/test', (req, res) => {
  res.json({ message: 'Auth router is working!' });
});
// Get user profile
// Get user profile - with robust auto-creation
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    console.log('User authenticated:', user.id, user.email);

    // Try to get user profile from database
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // If profile doesn't exist, create one using service role (bypasses RLS)
    if (profileError && profileError.code === 'PGRST116') {
      console.log('Profile not found, creating new profile for user:', user.id);
      
      // Use service role client to bypass RLS
      const serviceRoleClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );

      // Use service role client to bypass RLS
const { data: newProfile, error: createError } = await supabaseService
  .from('profiles')
  .insert([
    {
      id: user.id,
      full_name: user.user_metadata?.full_name || user.email.split('@')[0],
      username: user.email.split('@')[0] + '_' + Math.random().toString(36).substr(2, 5),
      role: 'student'
    }
  ])
  .select()
  .single();

      if (createError) {
        console.error('Error creating profile with service role:', createError);
        return res.status(500).json({ error: 'Failed to create profile' });
      }

      profile = newProfile;
      console.log('New profile created successfully:', profile);
    } else if (profileError) {
      console.error('Profile error:', profileError);
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        ...profile
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { full_name, username, avatar_url } = req.body;

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Update profile in database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name,
        username,
        avatar_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (profileError) {
      return res.status(400).json({ error: profileError.message });
    }

    res.json({ message: 'Profile updated successfully', profile });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all users (admin only)
router.get('/users', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token and check if user is admin
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get all users with profiles
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) {
      return res.status(400).json({ error: usersError.message });
    }

    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;