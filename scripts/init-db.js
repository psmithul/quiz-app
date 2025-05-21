import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function initializeDatabase() {
  console.log('Initializing database...');

  try {
    // Create tables using SQL
    console.log('Creating database tables...');
    
    // Create users table
    const { error: usersTableError } = await supabase.rpc('create_users_table', {});
    if (usersTableError) {
      // If the RPC doesn't exist, we'll create the tables directly
      console.log('Creating tables directly...');
      
      // Define the SQL to create tables
      const createTablesSql = `
        -- Create users table
        CREATE TABLE IF NOT EXISTS public.users (
          id UUID PRIMARY KEY,
          email VARCHAR(255) NOT NULL UNIQUE,
          role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user'))
        );
        
        -- Create quizzes table
        CREATE TABLE IF NOT EXISTS public.quizzes (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create questions table
        CREATE TABLE IF NOT EXISTS public.questions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
          prompt TEXT NOT NULL,
          type VARCHAR(20) NOT NULL CHECK (type IN ('multiple_choice', 'text')),
          options JSONB,
          correct_answer TEXT NOT NULL
        );
        
        -- Create assignments table
        CREATE TABLE IF NOT EXISTS public.assignments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
          assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id, quiz_id)
        );
        
        -- Create results table
        CREATE TABLE IF NOT EXISTS public.results (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
          answers JSONB NOT NULL,
          score NUMERIC NOT NULL,
          completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create payments table
        CREATE TABLE IF NOT EXISTS public.payments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
          amount NUMERIC NOT NULL,
          status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
          paid_at TIMESTAMP WITH TIME ZONE
        );
      `;
      
      // Execute the SQL
      console.log('Creating database tables with SQL...');
      
      // We need to break this into separate queries because Supabase SQL API has limitations
      const tableQueries = createTablesSql
        .split(';')
        .filter(query => query.trim().length > 0)
        .map(query => query.trim() + ';');
      
      for (const query of tableQueries) {
        console.log(`Executing: ${query.slice(0, 50)}...`);
        const { error } = await supabase.rpc('exec_sql', { sql: query });
        if (error) {
          console.error('Error executing SQL:', error);
          
          // If we can't execute SQL directly, we'll have to guide the user
          console.log('\n\n======================================================');
          console.log('ERROR: Unable to create tables via SQL. This is likely because your Supabase account does not have the necessary permissions.');
          console.log('\nPlease create these tables manually in the Supabase dashboard:');
          console.log('1. Go to https://app.supabase.io');
          console.log('2. Select your project');
          console.log('3. Go to the SQL Editor');
          console.log('4. Run the following SQL:');
          console.log('======================================================\n');
          console.log(createTablesSql);
          console.log('\n======================================================');
          return;
        }
      }
      
      console.log('Database tables created successfully!');
    } else {
      console.log('Tables created via RPC function');
    }

    // Insert sample data
    console.log('Inserting sample data...');

    // Create admin user
    const { error: adminError } = await supabase
      .from('users')
      .insert([
        {
          id: '00000000-0000-0000-0000-000000000000',
          email: 'admin@example.com',
          role: 'admin'
        }
      ])
      .single();
    
    if (adminError) {
      if (adminError.code === '23505') { // Duplicate key
        console.log('Admin user already exists, skipping...');
      } else {
        console.error('Error creating admin user:', adminError);
      }
    } else {
      console.log('Admin user created successfully');
    }

    // Create test user
    const { error: userError } = await supabase
      .from('users')
      .insert([
        {
          id: '11111111-1111-1111-1111-111111111111',
          email: 'user@example.com',
          role: 'user'
        }
      ])
      .single();
    
    if (userError) {
      if (userError.code === '23505') { // Duplicate key
        console.log('Test user already exists, skipping...');
      } else {
        console.error('Error creating test user:', userError);
      }
    } else {
      console.log('Test user created successfully');
    }

    // Create sample quizzes
    const { data: quizzesData, error: quizzesError } = await supabase
      .from('quizzes')
      .insert([
        {
          title: 'JavaScript Basics',
          description: 'Test your knowledge of JavaScript fundamentals',
          created_at: new Date().toISOString()
        },
        {
          title: 'React Components',
          description: 'Quiz about React component patterns and best practices',
          created_at: new Date().toISOString()
        }
      ])
      .select();
    
    if (quizzesError) {
      console.error('Error creating quizzes:', quizzesError);
    } else {
      console.log('Sample quizzes created successfully');
      
      // Create sample questions for each quiz
      const questions = [];
      for (const quiz of quizzesData) {
        questions.push({
          quiz_id: quiz.id,
          prompt: 'What is a closure in JavaScript?',
          type: 'multiple_choice',
          options: JSON.stringify([
            'A function that returns another function',
            'A function that preserves the outer scope',
            'A design pattern in React',
            'A way to close a connection'
          ]),
          correct_answer: 'A function that preserves the outer scope'
        });
        
        questions.push({
          quiz_id: quiz.id,
          prompt: 'Explain the concept of hoisting in JavaScript.',
          type: 'text',
          options: null,
          correct_answer: 'Hoisting is JavaScript\'s behavior of moving declarations to the top of their scope.'
        });
      }
      
      const { error: questionsError } = await supabase
        .from('questions')
        .insert(questions);
      
      if (questionsError) {
        console.error('Error creating questions:', questionsError);
      } else {
        console.log('Sample questions created successfully');
      }

      // Assign first quiz to the test user
      const { error: assignmentError } = await supabase
        .from('assignments')
        .insert([
          {
            user_id: '11111111-1111-1111-1111-111111111111',
            quiz_id: quizzesData[0].id,
            assigned_at: new Date().toISOString()
          }
        ]);
      
      if (assignmentError) {
        console.error('Error creating assignment:', assignmentError);
      } else {
        console.log('Sample assignment created successfully');
      }
    }

    console.log('\n✅ Database setup complete!');
    console.log('\nSample users:');
    console.log('- Admin: admin@example.com (use the Supabase dashboard to set a password)');
    console.log('- User: user@example.com (use the Supabase dashboard to set a password)');
    console.log('\nYou can now start the application with: npm run dev');

  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

initializeDatabase(); 