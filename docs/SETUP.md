# Connecting Supabase (free) — about 15 minutes

Do this once. Everything here is on Supabase's free plan, and no card is needed.

## 1. Create the project
1. Go to supabase.com and sign in with GitHub.
2. Click **New project**. Name: `aniverse`. Pick a strong database password and save it somewhere safe. Region: Singapore if it's offered, otherwise the closest one.
3. Wait about 2 minutes for it to start.

## 2. Create the tables
1. In the left menu, open **SQL Editor** and click **New query**.
2. Open `supabase/migrations/20261103000100_core.sql` from this project, copy all of it, paste it into the editor and click **Run**.
3. You should see "Success. No rows returned".

## 3. Set the website address
**Authentication → URL Configuration**
- **Site URL:** your live address, e.g. `https://aniverse.pages.dev`. Use `http://localhost:3000` while testing locally.
- **Redirect URLs:** add `https://YOUR-ADDRESS/auth/confirm` and `http://localhost:3000/auth/confirm`.

## 4. Update two email templates
**Authentication → Emails → Templates**

- **Confirm signup:** replace the link with
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard`
- **Reset password:** replace the link with
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`

Keep the rest of each template as it is.

> Supabase's built-in email sender only sends a few emails per hour. That's fine for testing. Before the beta, connect a free SMTP sender (e.g. Resend's free tier) under **Authentication → Emails → SMTP**.

## 5. Copy the two public keys
**Project Settings → API**

Copy these two values:
- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / publishable key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Both are safe to put in the website. **Never** share or paste the `service_role` key anywhere public.

Add them to `.env.local` for local testing, and to your hosting provider's environment variables for the live site. Then redeploy.

## 6. Keep the free project awake
Free projects pause after 7 days with no activity. Once the site is live, a free uptime monitor (e.g. UptimeRobot) pinging your site daily is enough.

## Check it works
1. Open `/signup` and create an account with your real email.
2. Click the link in the confirmation email. You should land on your dashboard.
3. Create a project, rename it, archive it and delete it.
4. Sign out, then use **Forgot password** and set a new password.
