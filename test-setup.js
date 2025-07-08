// Test script to verify your setup
// Run this in your browser console after signing in

console.log('=== Testing Clerk + Supabase Setup ===');

// Test 1: Check if user is authenticated
if (window.Clerk && window.Clerk.user) {
  console.log('✅ User authenticated:', window.Clerk.user.id);
  console.log('User email:', window.Clerk.user.primaryEmailAddress?.emailAddress);
} else {
  console.log('❌ No authenticated user found');
}

// Test 2: Check environment variables
console.log('=== Environment Variables ===');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set');
console.log('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'Set' : 'Not set');

// Test 3: Check if Supabase client can be created
try {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  console.log('✅ Supabase client created successfully');
} catch (error) {
  console.log('❌ Error creating Supabase client:', error.message);
}

console.log('=== End Test ==='); 