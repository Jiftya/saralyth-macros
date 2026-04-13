# Supabase Setup Guide for Macro Voting

## Overview
The macro voting system now uses Supabase to persist vote counts across devices and users. This allows the GitHub Pages static site to have a working backend without cookies.

## Setup Steps

### 1. Access Your Supabase Project
- Go to: https://supabase.com/dashboard/project/wlqlevebosrjscuotkif
- Sign in with your Supabase account

### 2. Create the Votes Table
1. Navigate to the **SQL Editor** in the left sidebar
2. Click **New Query**
3. Copy and paste the SQL from `SUPABASE_SETUP.sql` in this repo
4. Click **Run** to execute

The SQL creates:
- `votes` table with columns: `macro_file_url`, `up_count`, `down_count`
- Row Level Security policies allowing anonymous public voting
- Index on `macro_file_url` for fast lookups

### 3. Verify the Table
1. Go to **Table Editor** in the left sidebar
2. You should see the `votes` table listed
3. It should have 0 rows initially (votes will be added as users vote)

### 4. Test the Integration
1. Run the app locally: `node server.js`
2. Visit http://localhost:3000
3. Click upvote/downvote on any macro
4. Go back to Supabase dashboard → **Table Editor** → `votes` table
5. You should see a new row with the macro URL and vote counts

### 5. Deploy to Production
1. Commit and push to main:
   ```
   git add .
   git commit -m "Add Supabase voting system"
   git push origin main
   ```
2. GitHub Pages will auto-deploy
3. Visit https://seralyth-macros.online and test voting
4. Vote counts should appear immediately and persist across browsers

## Troubleshooting

### "Supabase not found" or votes don't load
- Check that the `votes` table exists in Supabase
- Verify table has the correct columns: `macro_file_url` (text), `up_count` (int), `down_count` (int)
- Open browser DevTools → Console and check for fetch errors

### Votes show as 0 after refresh
- This is expected if the votes table is empty
- Click upvote on a macro to create an entry
- Refresh the page - vote count should persist

### Votes work on localhost but not production
- Ensure the same Supabase project URL/key are used (they are hardcoded in app.js)
- Check browser console for CORS or 403 permission errors
- Verify RLS policies allow anonymous (anon) role to INSERT/UPDATE

### Database quota issues
- Supabase free tier allows 500MB database storage
- Each vote record is ~200 bytes - you can store ~2.5 million votes
- If production shows "quota exceeded", consider upgrading plan or archiving old votes

## How It Works

1. **App loads** → `loadVotesFromSupabase()` fetches all votes from Supabase REST API
2. **User votes** → `castVote()` increments up/down count locally, then PATCH to Supabase
3. **Supabase returns 404** → If macro not yet voted on, POST to create new row
4. **Other users** → Their app loads same vote counts, sees aggregated likes/dislikes

## API Details

- **REST Endpoint**: `https://wlqlevebosrjscuotkif.supabase.co/rest/v1/votes`
- **Authentication**: Publishable key (public, safe to expose)
- **Methods Used**:
  - GET: Fetch all vote counts on app load
  - POST: Create new vote record
  - PATCH: Update existing vote counts

## Security Notes

- Using **publishable key** (not service role key) for anonymous voting
- **RLS policies** restrict access: anonymous users can only read/insert their own votes
- Votes are **public aggregates** - not sensitive data
- No personal data collected - just URL → vote counts
