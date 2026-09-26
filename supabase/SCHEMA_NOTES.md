# Supabase schema notes — project `sgvxsyvqluhivohypkkg`

Introspected live via the Management API (`POST /v1/projects/{ref}/database/query`) before any
migration was written. Everything below under "Pre-migration state" is the schema as it existed
at introspection time; "Post-migration state" is what the migrations in `supabase/migrations/`
change it to.

## Pre-migration state

### Extensions

`pg_graphql`, `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp`.
**PostGIS was not installed.**

### Row counts at introspection time

| table | rows |
| --- | --- |
| locations | 0 |
| ratings | 0 |
| profiles | 10 |
| user_permissions | (small, unused by `index.html`) |

`locations` and `ratings` being empty means the data migrations below carry no backfill risk.

### `public.locations`

| column | type | null | default |
| --- | --- | --- | --- |
| id | uuid | no | `gen_random_uuid()` |
| created_at | timestamptz | no | `(now() AT TIME ZONE 'est')` |
| name | text | no | |
| address | text | no | |
| category | text | no | |
| safety_rating | text | no | |
| tags | **text** | yes | `'[]'::text` |
| identity | text | yes | |
| notes | text | yes | |
| user_id | uuid | yes | |
| latitude | double precision | yes | |
| longitude | double precision | yes | |

Constraints: `locations_pkey (id)`, `locations_address_key UNIQUE (address)`.
Indexes: the two above only — no spatial index, no index on `user_id`.

Notable findings:

- `tags` is a scalar `text` column with default `'[]'`, **not** `text[]`. `submitSpace()` in
  `index.html` inserts a JS array into it (PostgREST stringifies it), and `openDetail()` then calls
  `.map()` on the value it reads back — which is a string, so tag chips never render correctly.
- `category` has no check constraint; `submitSpace()` always hardcodes `'community'`.
- `safety_rating` has no check constraint (unlike `ratings.rating`), and is only ever written once
  at insert time — the authoritative value is the vote tally in `ratings`.
- `user_id` has **no** foreign key to `auth.users` and is nullable.
- `UNIQUE (address)` means two distinct spaces that geocode to the same address string collide.

### `public.ratings`

| column | type | null | default |
| --- | --- | --- | --- |
| id | uuid | no | `gen_random_uuid()` |
| space_id | uuid | no | |
| user_id | uuid | yes | |
| rating | text | no | |
| comment | text | yes | |
| created_at | timestamptz | yes | `now()` |

Constraints: `ratings_pkey`, `ratings_space_id_user_id_key UNIQUE (space_id, user_id)` (this is the
constraint `submitRating()`'s `onConflict: 'space_id,user_id'` upsert depends on — preserved),
`ratings_rating_check CHECK (rating IN ('safe','mixed','not_safe'))`,
`ratings_space_id_fkey → locations(id) ON DELETE CASCADE`,
`ratings_user_id_fkey → auth.users(id) ON DELETE SET NULL`.

### `public.profiles`

`user_id uuid PK/UNIQUE → auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE`,
`username text NOT NULL UNIQUE`, `avatar_url text`, `sign_up_date date`.

### `public.user_permissions`

`user_id uuid PK → auth.users(id)`, `location_enabled bool default true`,
`notifications_enabled bool default true`, `contacts_enabled bool default false`.
Not referenced anywhere in `index.html`.

### RLS — pre-migration

RLS is enabled (not forced) on all four tables. Policies as found:

| table | policy | roles | cmd | using | with check |
| --- | --- | --- | --- | --- | --- |
| locations | Allow all users to read locations | public | SELECT | `true` | |
| locations | allow all users to insert locations | public | INSERT | | `true` |
| locations | locations_insert | authenticated | INSERT | | `auth.uid() = user_id` |
| locations | locations_select | public | SELECT | `true` | |
| locations | locations_update | authenticated | UPDATE | `auth.uid() = user_id` | *(none)* |
| profiles | Allow logged-in users to view their own profile | authenticated | SELECT | `auth.uid() = user_id` | |
| profiles | Allow logged-in users to update their own profile | authenticated | UPDATE | `auth.uid() = user_id` | `auth.uid() = user_id` |
| profiles | Allow users to create their own profile | public | INSERT | | `auth.uid() = user_id` |
| profiles | profiles_insert | public | INSERT | | `auth.uid() = user_id` |
| profiles | **profiles_select** | **public** | SELECT | **`true`** | |
| profiles | profiles_update | public | UPDATE | `auth.uid() = user_id` | *(none)* |
| ratings | ratings_insert | authenticated | INSERT | | `auth.uid() = user_id` |
| ratings | **ratings_select** | **public** | SELECT | **`true`** | |
| ratings | ratings_update | authenticated | UPDATE | `auth.uid() = user_id` | *(none)* |
| user_permissions | Users can see and update their own permissions | authenticated | ALL | `auth.uid() = user_id` | `auth.uid() = user_id` |

Table grants: `anon` and `authenticated` both hold full DML grants on all four tables, so RLS
policies are the only thing standing between an anonymous request and the data.

## Anonymity gaps found (pre-migration)

These are the reasons the migrations rewrite the policy set wholesale.

1. **`profiles` was world-readable.** `profiles_select` (role `public`, `USING true`) overrode the
   owner-only policy sitting next to it — permissive policies are OR'd, so the broader one wins.
   Combined with gap 2 this is the critical leak: `ratings.user_id` is exposed by
   `ratings_select`, and `profiles` maps `user_id → username`, so **anyone holding the anon key
   could de-anonymise every rating and comment** with two trivial PostgREST calls
   (`/ratings?select=space_id,rating,comment,user_id` then `/profiles?user_id=in.(...)`).
   The UI shows a generic 👤 for reviewers, but the API did not.
2. **`ratings.user_id` was readable by everyone,** including `anon`. Even without `profiles`, a
   stable per-author UUID visible across every space is a pseudonymous fingerprint: it links all of
   a person's ratings and comments together and to the locations they submitted
   (`locations.user_id` was likewise world-readable).
3. **`anon` could insert `locations`** (`allow all users to insert locations`, `WITH CHECK true`),
   with no ownership tie — unauthenticated writes with arbitrary `user_id`.
4. **UPDATE policies had no `WITH CHECK`.** `locations_update`, `ratings_update` and
   `profiles_update` only constrained the *existing* row, so an owner could update a row and set
   `user_id` to someone else's id — reassigning authorship of their own content to another user.
5. **No DELETE policies at all,** while both roles hold the DELETE grant — deletes were blocked
   only by the absence of a policy, which is correct-by-accident rather than by intent.
6. `profiles_insert` / `profiles_update` were granted to `public` rather than `authenticated`;
   harmless in practice (`auth.uid()` is null for anon) but inconsistent with the rest.

## Post-migration state

`20250926120000_schema_hardening.sql`:

- installs `postgis` into the `extensions` schema;
- normalises and constrains `locations.category` to
  `cafe, restaurant, bar, retail, place_of_worship, healthcare, community, other`
  (existing values lowercased/trimmed and mapped, anything unrecognised → `other`;
  the constraint is added `NOT VALID` then `VALIDATE`d so no existing row can break the migration);
- converts `locations.tags` from `text` to `text[]` (JSON-array and comma-separated strings are
  parsed; default becomes `'{}'`). Safe here because `locations` is empty, and it makes the
  `sp.tags.map(...)` read path in `index.html` behave as its author intended;
- adds `locations.geog geography(Point,4326)` **generated** from `longitude`/`latitude`, so it can
  never drift from the source columns, plus a GiST index on it and a btree index on `user_id`;
- adds a `safety_rating` check constraint matching `ratings_rating_check`, plus `'unknown'`;
- adds `ratings.safety_tags text[] NOT NULL DEFAULT '{}'` with a check that every element is one of
  `gender_neutral_restrooms, trans_friendly_staff, wheelchair_accessible, incident_reported,
  gender_neutral_signage, lgbtq_owned, pride_displayed, staff_used_correct_pronouns,
  hostile_clientele, discriminatory_service, unsafe_neighborhood`,
  plus a GIN index and an index on `ratings.space_id`;
- leaves `ratings_space_id_user_id_key` untouched (one rating per user per space).

`20250926120100_rls_anonymity.sql` drops every pre-existing policy on the three product tables and
installs one policy per (table, command), all scoped to the `authenticated` role:

| table | SELECT | INSERT | UPDATE | DELETE |
| --- | --- | --- | --- | --- |
| locations | `true` | `auth.uid() = user_id` | using + **with check** `auth.uid() = user_id` | `auth.uid() = user_id` |
| ratings | `true` | `auth.uid() = user_id` | using + **with check** `auth.uid() = user_id` | `auth.uid() = user_id` |
| profiles | `auth.uid() = user_id` | `auth.uid() = user_id` | using + **with check** `auth.uid() = user_id` | `auth.uid() = user_id` |

It also `REVOKE`s all privileges on the three tables from `anon`, so the anonymous key has no path
to the data even if a future permissive policy is added by mistake.

### Consequences to be aware of

- **`profiles` is now owner-only**, which closes gap 1: there is no public path that joins a rating
  to a username, and no public path to `auth` data at all. Any future "show the author" feature
  must go through an explicit, reviewed opt-in column — do not relax `profiles`.
- `ratings.user_id` is still selectable by signed-in users (the client needs it to find its own
  rating for the upsert). It is a pseudonymous UUID, not an identity, now that `profiles` is
  closed. If you later want it fully hidden, expose `ratings` through a view that drops `user_id`
  and returns `is_mine boolean` instead; that is a follow-up, not part of this change.
- Anonymous *writes* to `locations` are gone, which was gap 3.

## Anonymous read path (`20250926130000_public_read_views.sql`, applied)

Revoking `anon` broke guest browsing, so read-only access is restored through two views that
project away `user_id` instead of through table grants:

| View | Columns | Granted to |
| --- | --- | --- |
| `public.public_locations` | everything on `locations` except `user_id` / `identity` | `anon`, `authenticated` (SELECT only) |
| `public.public_ratings` | `id, space_id, rating, comment, safety_tags, created_at` | `anon`, `authenticated` (SELECT only) |

The views are `security_invoker = off`, so they run as the owner and bypass RLS on the base
tables — the **column list is what enforces anonymity here**, so never add an author column to
them. The base tables remain revoked from `anon`; verified with the anon key:

```
GET /rest/v1/public_locations → 200 []
GET /rest/v1/locations        → 42501 permission denied for table locations
GET /rest/v1/profiles         → 42501 permission denied for table profiles
```

`web/src/lib/spaces.ts` reads the views when there is no session and the base tables when there
is. `index.html` is untouched and still reads the base tables, so guest browsing there stays
empty until it is pointed at the views.

## Reproducing the introspection

```bash
export SUPABASE_ACCESS_TOKEN=...   # never commit this
curl -s -X POST \
  "https://api.supabase.com/v1/projects/sgvxsyvqluhivohypkkg/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"select * from pg_policies where schemaname = '"'"'public'"'"';"}'
```
