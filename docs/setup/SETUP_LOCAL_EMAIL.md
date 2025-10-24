# Local Email Testing Setup

To test emails locally with the Inbucket email testing server:

## 1. Start Docker Desktop

Make sure Docker Desktop is running.

## 2. Start Supabase Local

```bash
supabase start
```

This will start all Supabase services including:

- PostgreSQL database
- Auth server
- Storage server
- **Inbucket email testing server** (http://127.0.0.1:54324)

## 3. Update Environment Variables

Update `.env.local` to use local Supabase:

```bash
# Use local Supabase
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<get from supabase status>
```

Get the keys by running:

```bash
supabase status
```

## 4. Run Your App

```bash
npm run dev
```

## 5. Check Emails

After signing up, view the confirmation email at:
http://127.0.0.1:54324

The email will contain a confirmation link that you can click.

## 6. Switch Back to Production

When done testing, update `.env.local` back to production URLs.

## Notes

- Local Supabase emails are NOT actually sent
- They're captured by Inbucket for testing
- The config.toml email rate limit (2/hour) only applies locally
- Local database is separate from production
