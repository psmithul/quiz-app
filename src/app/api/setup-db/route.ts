import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email') || 'admin@example.com';
  const userId = url.searchParams.get('userId');
  
  try {
    // Read the SQL file
    const sqlFilePath = path.join(process.cwd(), 'scripts', 'create-tables.sql');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    // Check if users table exists first
    const { error: tableCheckError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    let tablesExist = !tableCheckError;
    let message = '';

    // Create tables if they don't exist
    if (!tablesExist) {
      message += "Tables don't exist, attempting to create them.\n";
      
      try {
        // Try to execute SQL directly using PostgreSQL functions (may not work in all Supabase instances)
        const { error: sqlError } = await supabase.rpc('exec_sql', { sql });
        
        if (sqlError) {
          message += `Error executing SQL directly: ${sqlError.message}\n`;
          message += "Will try creating tables one by one instead.\n";
          
          // Create users table
          const { error: usersError } = await supabase.rpc('exec_sql', { 
            sql: `CREATE TABLE IF NOT EXISTS public.users (
              id UUID PRIMARY KEY,
              email VARCHAR(255) NOT NULL UNIQUE,
              role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user'))
            );` 
          });
          
          if (usersError) {
            message += `Error creating users table: ${usersError.message}\n`;
            message += "Please create tables manually using the SQL in the scripts/create-tables.sql file.\n";
            
            return NextResponse.json({
              status: "error",
              message,
              sql
            }, { status: 500 });
          }
          
          // Create other tables similarly...
        } else {
          message += "Successfully created all tables.\n";
        }
      } catch (error: any) {
        message += `Error executing SQL: ${error.message}\n`;
        return NextResponse.json({
          status: "error",
          message,
          sql
        }, { status: 500 });
      }
    } else {
      message += "Tables already exist.\n";
    }
    
    // Create or update admin user
    if (userId) {
      message += `Attempting to make user ${email} (ID: ${userId}) an admin.\n`;
      
      // Check if user exists
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (existingUser) {
        // Update existing user to admin
        const { error: updateError } = await supabase
          .from('users')
          .update({ role: 'admin' })
          .eq('id', userId);
        
        if (updateError) {
          message += `Error updating user role: ${updateError.message}\n`;
        } else {
          message += `Successfully updated user ${email} to admin role.\n`;
        }
      } else {
        // Create new admin user
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            { id: userId, email, role: 'admin' }
          ]);
        
        if (insertError) {
          message += `Error creating admin user: ${insertError.message}\n`;
        } else {
          message += `Successfully created admin user ${email}.\n`;
        }
      }
    } else {
      message += "No user ID provided, skipping admin user creation.\n";
    }
    
    // Check if tables exist now
    const { error: finalTableCheckError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    const tablesExistNow = !finalTableCheckError;
    
    return NextResponse.json({
      status: tablesExistNow ? "success" : "error",
      message,
      tables_exist: tablesExistNow,
      admin_user_created: userId ? true : false
    });
    
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      message: error.message
    }, { status: 500 });
  }
} 