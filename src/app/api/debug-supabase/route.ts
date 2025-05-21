import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET() {
  try {
    // Check Supabase connection
    const { data: healthCheck, error: healthError } = await supabase.from('postgres_public_usage').select('*').limit(1).maybeSingle();
    
    // Try to get Supabase version
    const { data: versionData, error: versionError } = await supabase.rpc('version');
    
    // Try to list all tables
    const { data: tablesData, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    return NextResponse.json({
      status: "success",
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anon_key_length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      health_check: {
        data: healthCheck,
        error: healthError ? { 
          code: healthError.code, 
          message: healthError.message,
          details: healthError.details 
        } : null,
      },
      version: {
        data: versionData,
        error: versionError ? { 
          code: versionError.code, 
          message: versionError.message,
          details: versionError.details 
        } : null,
      },
      tables: {
        data: tablesData,
        error: tablesError ? { 
          code: tablesError.code, 
          message: tablesError.message,
          details: tablesError.details 
        } : null,
      },
      // What we need to create
      required_tables: [
        'users',
        'quizzes',
        'questions',
        'assignments',
        'results',
        'payments'
      ]
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      message: error.message,
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anon_key_length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
    }, { status: 500 });
  }
} 