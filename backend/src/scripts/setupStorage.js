import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorage() {
  try {
    console.log('Setting up Supabase Storage...');

    // Check if videos bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      return;
    }

    const videosBucketExists = buckets.some(bucket => bucket.name === 'videos');
    
    if (!videosBucketExists) {
      console.log('Creating videos bucket...');
      
      const { data, error } = await supabase.storage.createBucket('videos', {
        public: false,
        fileSizeLimit: 500000000, // 500MB
        allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
      });

      if (error) {
        console.error('Error creating bucket:', error);
      } else {
        console.log('✅ Videos bucket created successfully');
      }
    } else {
      console.log('✅ Videos bucket already exists');
    }

    // Update bucket settings
    console.log('Updating bucket settings...');
    const { error: updateError } = await supabase.storage.updateBucket('videos', {
      public: false,
      fileSizeLimit: 500000000, // 500MB
      allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo']
    });

    if (updateError) {
      console.error('Error updating bucket:', updateError);
    } else {
      console.log('✅ Bucket settings updated');
    }

  } catch (error) {
    console.error('Storage setup error:', error);
  }
}

setupStorage();