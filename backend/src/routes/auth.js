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

    console.log('Updating profile for user:', user.id, 'with data:', { full_name, username, avatar_url });

    // First, check if profile exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // If profile doesn't exist, create it first
    if (checkError && checkError.code === 'PGRST116') {
      console.log('Profile not found, creating new profile for user:', user.id);
      
      const { data: newProfile, error: createError } = await supabaseService
        .from('profiles')
        .insert([
          {
            id: user.id,
            full_name: full_name || user.user_metadata?.full_name || user.email.split('@')[0],
            username: username || user.email.split('@')[0] + '_' + Math.random().toString(36).substr(2, 5),
            avatar_url: avatar_url || '',
            role: 'student'
          }
        ])
        .select()
        .single();

      if (createError) {
        console.error('Error creating profile:', createError);
        return res.status(500).json({ error: 'Failed to create profile: ' + createError.message });
      }

      console.log('New profile created:', newProfile);
      return res.json({ 
        message: 'Profile created successfully', 
        profile: newProfile 
      });
    } else if (checkError) {
      console.error('Error checking profile:', checkError);
      return res.status(500).json({ error: 'Database error: ' + checkError.message });
    }

    // Profile exists, proceed with update
    const { data: updatedProfiles, error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name,
        username,
        avatar_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select();

    if (updateError) {
      console.error('Profile update error:', updateError);
      return res.status(400).json({ error: updateError.message });
    }

    if (!updatedProfiles || updatedProfiles.length === 0) {
      return res.status(404).json({ error: 'Profile not found after update' });
    }

    const profile = updatedProfiles[0];
    console.log('Profile updated successfully:', profile);

    res.json({ 
      message: 'Profile updated successfully', 
      profile 
    });
  } catch (error) {
    console.error('Profile update exception:', error);
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
// Add this debug route to test the update functionality
router.get('/debug-update', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.json({ error: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.json({ error: 'Invalid token', details: error });
    }

    // Test update with simple data
    const testData = {
      full_name: 'Test Update ' + Date.now(),
      username: 'testuser_' + Date.now()
    };

    const { data: updateResult, error: updateError } = await supabase
      .from('profiles')
      .update(testData)
      .eq('id', user.id)
      .select();

    res.json({
      user: { id: user.id, email: user.email },
      testData,
      updateResult,
      updateError,
      updateResultLength: updateResult?.length
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

// Debug endpoint to check profile status
router.get('/debug-status', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.json({ error: 'No token provided' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.json({ error: 'Invalid token', details: error });
    }

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    res.json({
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      },
      profileExists: !profileError && !!profile,
      profile: profile,
      profileError: profileError,
      profileErrorCode: profileError?.code
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});
export default router;