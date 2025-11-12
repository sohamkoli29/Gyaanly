import { supabase } from '../config/supabaseClient.js';

export const requireInstructor = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user profile with role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({ error: 'User profile not found' });
    }

    // Check if user is instructor or admin
    if (profile.role !== 'instructor' && profile.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Instructor access required',
        currentRole: profile.role,
        requiredRole: 'instructor'
      });
    }

    req.user = user;
    req.user.role = profile.role;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization failed' });
  }
};

export const requireAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin access required',
        currentRole: profile?.role,
        requiredRole: 'admin'
      });
    }

    req.user = user;
    req.user.role = profile.role;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization failed' });
  }
};