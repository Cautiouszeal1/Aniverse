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
- **publishable key** (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (older projects: anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

Both are safe to put in the website. **Never** share or paste the `service_role` key anywhere public.

Add them to `.env.local` for local testing, and to your hosting provider's environment variables for the live site. Then redeploy.

## 6. Keep the free project awake
Free projects pause after 7 days with no activity. Once the site is live, a free uptime monitor (e.g. UptimeRobot) pinging your site daily is enough.

## Check it works
1. Open `/signup` and create an account with your real email.
2. Click the link in the confirmation email. You should land on your dashboard.
3. Create a project, rename it, archive it and delete it.
4. Sign out, then use **Forgot password** and set a new password.

## Free AI images (Pollinations key) — recommended
Without a key, images use Pollinations' no-account mode (1 image per 45 s, watermark).
1. Run `supabase/migrations/20261103000400_image_storage.sql` in the SQL Editor (creates the private image bucket).
2. Sign in at https://enter.pollinations.ai (GitHub login) and create a **secret key** (`sk_…`), allowed for the `flux` model.
3. In Vercel → Settings → Environments → Production → Add variable:
   - Key `POLLINATIONS_API_KEY`, value your `sk_…` key, type **Sensitive**.
4. Redeploy. Character Studio will say "All 4 options are painted at once".

Never paste the secret key in chat, code or GitHub.

## USDC payments on Base (automatic)
Payments go straight to the receiving wallet set in `payment_settings`
(currently `0x14A15A119f2bec1f09cC6261050dEd87Db3DDD38`). Each order has a unique
amount, and a background watcher credits users automatically every minute —
even if their phone is off.

1. **Database:** run `supabase/migrations/20261103000600_crypto_payments.sql` in the SQL Editor.
2. **Vercel secrets** (Settings → Environments → Production → type **Secret**):
   - `SUPABASE_SERVICE_ROLE_KEY` — Supabase → Project Settings → API Keys → **secret / service_role** key.
   - `CRON_SECRET` — a long random string (the watcher password).
   Redeploy afterwards.
3. **Make yourself admin** (SQL Editor; use your sign-in email):
   ```sql
   insert into public.app_admins (user_id)
   select id from auth.users where email = 'YOUR_EMAIL' on conflict do nothing;
   ```
4. **Run the watcher every minute** (SQL Editor; replace YOUR_CRON_SECRET):
   ```sql
   create extension if not exists pg_cron with schema pg_catalog;
   create extension if not exists pg_net with schema extensions;
   select cron.schedule(
     'aniverse-payment-watcher',
     '* * * * *',
     $$ select net.http_post(
          url := 'https://aniverse-alpha-lac.vercel.app/api/crypto/sweep',
          headers := jsonb_build_object('Authorization', 'Bearer YOUR_CRON_SECRET'),
          timeout_milliseconds := 55000
        ) $$
   );
   ```
   Vercel also runs it once a day as a backup (`vercel.json`).
5. **Check:** `/api/health` should show `"cryptoPayments":true,"paymentWatcher":true`.
6. **Live test:** buy the Starter pack and pay from another wallet you own.

To change wallet or network later, update the single row in `payment_settings` — no code changes.
