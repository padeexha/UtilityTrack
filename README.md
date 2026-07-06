# UtilityTrack MVP

A working starter for a utility meter reading, main/sub-meter reconciliation, billing, and maintenance-oriented management system.

## Included

- Email/password login with Supabase Auth
- Admin, manager, worker, and finance roles
- Premises, buildings, main meters, and sub-meters
- Optional worker-to-meter assignments
- Mobile camera capture for electricity and water readings
- Private photographic evidence in Supabase Storage
- Server-side previous-reading and consumption calculation
- Multiplication factors for CT meters and similar installations
- Reading approval/rejection workflow
- Main-meter versus sub-meter reconciliation
- Flat-rate billing UI with a database design that also supports slabs
- Fixed charges, taxes, bill records, audit logs, and Row Level Security
- Responsive interface suitable for phone use

## Technology

- Next.js 16 App Router
- React 19 and TypeScript
- Supabase PostgreSQL, Auth, Storage, and Row Level Security
- `@supabase/ssr` using the Next.js `proxy.ts` convention

## 1. Create Supabase project

Create a Supabase project, then open **SQL Editor**.

Run:

1. `supabase/migrations/001_initial_schema.sql`
2. Optionally run `supabase/seed.sql` for demo premises and meters.

## 2. Configure environment

Copy the environment example:

```bash
cp .env.example .env.local
```

Fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Use the Supabase **publishable key**, not the secret/service-role key. Never place a secret key in this application.

## 3. Install and run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 4. Create first administrator

Create an account from the login screen. New users start with the `worker` role.

In Supabase SQL Editor, promote the first account:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users where email = 'your-email@example.com'
);
```

Sign out and sign back in.

## 5. Initial setup workflow

1. Open **Premises & meters**.
2. Create a site/premises.
3. Create buildings.
4. Create the main electricity or water meter with no parent.
5. Create each building meter and select the main meter as its parent.
6. Optionally assign meters to workers.
7. Workers use **Take reading** on a mobile phone.
8. A manager approves the reading.
9. Reconciliation uses approved readings.
10. Create a tariff and generate a bill from an approved reading.

## Meter calculation

Normal readings are calculated in PostgreSQL, not trusted from the browser:

```text
consumption = (current reading - previous reading) × multiplication factor
```

For a meter reset or replacement, add a separate UI workflow and submit `reading_type = reset` or `replacement`. The database already supports these values.

## Main/sub-meter calculation

For the selected period:

```text
variance = main meter consumption - total direct child meter consumption
variance % = variance / main meter consumption × 100
```

The current reconciliation function compares direct children. For multi-level meter trees, add recursive aggregation or reconcile each parent level separately.

## Tariffs

The UI creates a flat tariff using one open-ended slab. The schema supports multiple slabs in `tariff_slabs`:

```text
0–100 units      rate A
100–200 units    rate B
200+ units       rate C
```

Bills preserve a JSON calculation breakdown so later tariff changes do not alter the stored bill.

## Security notes

- RLS is enabled for all operational tables.
- Photos are stored in a private `meter-photos` bucket.
- Workers cannot approve their own readings.
- Only administrators can change user roles.
- Billing runs through a protected PostgreSQL function.
- Approved readings and generated bills are recorded in the audit log.
- Do not expose a Supabase secret/service-role key in browser or mobile code.

Before a public production launch, add rate limiting, formal invitation-based user creation, tested backup restoration, stronger image validation, monitoring, and a dedicated admin user-management screen.

## Useful production additions

- QR codes on meters
- Full offline queue with IndexedDB/service worker
- Meter reset/replacement screen
- Maintenance issue/work-order screen using the included `maintenance_issues` table
- Multiple tariff slab editor
- Invoice PDF and Excel exports
- Notification service
- OCR-assisted reading recognition
- GPS distance validation
- Smart meter ingestion through a protected API/MQTT service
# UtilityTrack
