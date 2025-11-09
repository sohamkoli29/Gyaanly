import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Debug endpoint to check storage (remove in production)
router.get('/storage', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;
    
    // List all files in the user's folder
    const { data: files, error } = await supabase.storage
      .from('videos')
      .list(user_id, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      userId: user_id,
      files: files || [],
      bucket: 'videos'
    });
  } catch (error) {
    console.error('Storage debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;