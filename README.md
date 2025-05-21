# Thinkify Quiz Platform

A secure, scalable quiz platform for Thinkify Labs that supports admin and user roles, integrated with Supabase for authentication, database, and payment gating.

## Features

- **Authentication & Authorization**: Email/password login with role-based access (Admin, User)
- **Quiz Management**: Create, edit, assign quizzes to users
- **Payment Gating**: Block access to quizzes until payment or assignment
- **Responsive UI**: Works on all screen sizes with a clean, modern interface
- **Supabase Integration**: Authentication, database, and storage

## Tech Stack

- **Frontend**: Next.js 14+, React, TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Serverless functions (API routes) with Next.js
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth
- **Hosting**: Vercel (recommended)

## Directory Structure

```
/src
 ├── app                # App router routes
 │    ├── auth          # Authentication pages
 │    ├── admin         # Admin dashboard and management
 │    ├── user          # User dashboard and quiz interface
 │    └── ...           # Root layout, home page
 ├── components         # Reusable UI components
 ├── lib                # Supabase client, auth context
 ├── utils              # Utility functions
 └── types              # TypeScript types
```

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm or yarn
- Supabase account (free tier works fine)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/thinkify-quiz.git
cd thinkify-quiz
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://elephumnrmexytddgtrb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsZXBodW1ucm1leHl0ZGRndHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4MTgyNTIsImV4cCI6MjA2MzM5NDI1Mn0.pCAlQvCQ0nTqFgNCv06GVopEPw4OxV-ejk-6qppQffA
```

4. Initialize the database:
```bash
npm run init-db
```

If the automatic database initialization fails, you can manually set up the database tables:
1. Go to the Supabase dashboard for your project
2. Navigate to the SQL Editor
3. Copy and paste the contents of `scripts/supabase-sql.sql`
4. Run the SQL commands

5. Start the development server:
```bash
npm run dev
# or
yarn dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Sample Users

After running the database initialization, you'll have access to:
- Admin: `admin@example.com` 
- User: `user@example.com`

To set passwords for these users, you'll need to:
1. Go to the Supabase Authentication dashboard
2. Find the users and use the "Reset password" feature
3. Set new passwords for testing

## Database Schema

The application uses the following database tables in Supabase:

- `users`: User profiles with roles
- `quizzes`: Quiz metadata
- `questions`: Quiz questions, options, and correct answers
- `assignments`: Links quizzes to users (many-to-many)
- `results`: Stores user quiz attempts and scores
- `payments`: Records payment transactions

## Troubleshooting

### Database Connection Issues
- Make sure your Supabase URL and anon key are correct in `.env.local`
- Check that the database tables have been created using `npm run init-db`
- Verify that your Supabase project is active and not paused

### Authentication Issues
- If signup/login isn't working, check that the Supabase Authentication service is enabled
- Verify that email confirmations are disabled for testing (in Supabase Authentication settings)

## Deployment

The app is optimized for deployment on Vercel:

1. Push your code to a GitHub repository
2. Connect your repository to Vercel
3. Add your environment variables in the Vercel dashboard
4. Deploy

## Development Notes

- The app uses Next.js App Router for routing
- Authentication is handled with Supabase Auth
- Admin and user roles are managed via the `users` table
- Quiz assignments allow users to take quizzes without payment
- Unassigned quizzes show a paywall for regular users

## License

This project is licensed under the MIT License.
