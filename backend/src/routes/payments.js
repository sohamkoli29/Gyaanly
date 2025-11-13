import express from 'express';
import Razorpay from 'razorpay';
import { supabase } from '../config/supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Helper function to generate shorter receipt ID
const generateReceiptId = (courseId, userId) => {
  // Use shorter format: course_short + user_short + timestamp
  const courseShort = courseId.substring(0, 8);
  const userShort = userId.substring(0, 8);
  const timestamp = Date.now().toString(36); // Base36 for shorter timestamp
  return `crs_${courseShort}_${userShort}_${timestamp}`.substring(0, 40);
};

// Create payment order
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { course_id, amount } = req.body;
    const user_id = req.user.id;

    console.log('Creating payment order:', { course_id, amount, user_id });

    // Validate course exists and get details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, price, instructor_id')
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .single();

    if (existingEnrollment) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    // Validate amount matches course price
    const expectedAmount = Math.round(course.price * 100); // Convert to paise
    if (amount !== expectedAmount) {
      return res.status(400).json({ 
        error: 'Amount mismatch', 
        expected: expectedAmount,
        received: amount 
      });
    }

    // Generate shorter receipt ID
    const receiptId = generateReceiptId(course_id, user_id);
    console.log('Generated receipt ID:', receiptId);

    // Create Razorpay order
    const options = {
      amount: amount, // amount in paise
      currency: 'INR',
      receipt: receiptId, // Use shorter receipt ID
      notes: {
        course_id: course_id,
        user_id: user_id,
        course_title: course.title
      }
    };

    const order = await razorpay.orders.create(options);

    console.log('Razorpay order created:', order.id);

    // Store payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([
        {
          user_id: user_id,
          course_id: course_id,
          razorpay_order_id: order.id,
          amount: amount / 100, // Convert back to rupees
          currency: 'INR',
          status: 'created',
          receipt_id: receiptId // Store receipt ID for reference
        }
      ])
      .select()
      .single();

    if (paymentError) {
      console.error('Error storing payment:', paymentError);
      return res.status(500).json({ error: 'Failed to create payment record' });
    }

    res.json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      payment_id: payment.id,
      receipt_id: receiptId
    });

  } catch (error) {
    console.error('Payment order creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create payment order',
      details: error.error?.description || error.message
    });
  }
});

// Verify payment and enroll user
router.post('/verify-payment', authenticateToken, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_id } = req.body;
    const user_id = req.user.id;

    console.log('Verifying payment:', { 
      razorpay_order_id, 
      razorpay_payment_id, 
      payment_id,
      user_id 
    });

    // Verify payment signature
    const crypto = await import('crypto');
    const generated_signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ 
        error: 'Payment verification failed',
        valid: false
      });
    }

    // Get payment details from database
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', payment_id)
      .eq('user_id', user_id)
      .single();

    if (paymentError || !payment) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    // Update payment record
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        razorpay_payment_id: razorpay_payment_id,
        razorpay_signature: razorpay_signature,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', payment_id);

    if (updateError) {
      console.error('Error updating payment:', updateError);
      return res.status(500).json({ error: 'Failed to update payment record' });
    }

    // Create enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .insert([
        {
          user_id: user_id,
          course_id: payment.course_id,
          enrolled_at: new Date().toISOString(),
          payment_id: payment_id,
          enrollment_source: 'paid'
        }
      ])
      .select(`
        *,
        courses (
          id,
          title,
          instructor_id
        )
      `)
      .single();

    if (enrollmentError) {
      console.error('Error creating enrollment:', enrollmentError);
      return res.status(500).json({ error: 'Failed to create enrollment' });
    }

    console.log('Payment verified and enrollment created successfully');

    res.json({
      valid: true,
      message: 'Payment verified successfully',
      enrollment: enrollment,
      payment: {
        id: payment.id,
        amount: payment.amount,
        course_id: payment.course_id
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ 
      error: 'Payment verification failed',
      valid: false
    });
  }
});

// Get payment history for user
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        courses (
          id,
          title,
          thumbnail_url
        )
      `)
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payment history:', error);
      return res.status(500).json({ error: 'Failed to fetch payment history' });
    }

    res.json({ payments: payments || [] });

  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payment details by ID
router.get('/:paymentId', authenticateToken, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const user_id = req.user.id;

    const { data: payment, error } = await supabase
      .from('payments')
      .select(`
        *,
        courses (
          id,
          title,
          description
        )
      `)
      .eq('id', paymentId)
      .eq('user_id', user_id)
      .single();

    if (error || !payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({ payment });

  } catch (error) {
    console.error('Payment fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;