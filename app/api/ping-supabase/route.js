import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request) {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Supabase URL or Anon Key is missing.');
      return NextResponse.json({
        message: 'Supabase credentials are not configured.',
        status: 500
      }, { status: 500 });
    }

    // Perform a simple query to keep the database awake.
    // Replace 'your_table_name' with an actual, small table in your Supabase DB.
    // Make sure 'your_table_name' exists and is accessible with the anon key.
    const { data, error } = await supabase.from('tasks').select('id').limit(1);

    if (error) {
      console.error('Error pinging Supabase from API:', error.message);
      return NextResponse.json({
        message: 'Failed to ping Supabase.',
        error: error.message,
        status: 500
      }, { status: 500 });
    }

    console.log('Successfully pinged Supabase via API route.');
    return NextResponse.json({
      message: 'Supabase successfully pinged!',
      status: 200
    }, { status: 200 });

  } catch (err) {
    console.error('An unexpected error occurred in the API route:', err.message);
    return NextResponse.json({
      message: 'An internal server error occurred.',
      error: err.message,
      status: 500
    }, { status: 500 });
  }
}
