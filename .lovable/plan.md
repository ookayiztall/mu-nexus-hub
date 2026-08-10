# Export auth users (preserving IDs and password hashes)

## The blocker with the command you have

```
supabase db dump --db-url "postgresql://postgres:PASSWORD@db.<ref>.supabase.co:5432/postgres" --schema auth -f auth.sql
```

This is the right command shape, but on Lovable Cloud the database password is not available to you or to me, so `PASSWORD` cannot be filled in. There is no way to retrieve or reset it from here.

## What to do instead

I can run the dump from inside this environment, where a privileged database connection is already available, and hand you the resulting file. Same output as the CLI command, no password needed on your side.

Steps:

1. Dump the `auth` schema (data only, plus the pieces that matter) from the current database to `auth.sql`.
   - Includes `auth.users` (ids, emails, `encrypted_password`, confirmation timestamps, metadata), `auth.identities` (OAuth/email provider links), and `auth.mfa_factors` if present.
   - Excludes session/refresh-token tables — those are transient and should not be carried over.
2. Sanity-check the file: row counts per table, confirm hashes and UUIDs are present.
3. Add `RESTORE_AUTH.md` with the exact restore command against your new project:
   ```
   psql "postgresql://postgres:YOUR_NEW_PASSWORD@db.<new-ref>.supabase.co:5432/postgres" -f auth.sql
   ```
   plus ordering notes: restore `auth.sql` **before** `data.sql`, since every `user_id` foreign key in `profiles`, `user_roles`, `listings`, etc. points at `auth.users`.
4. Drop `auth.sql` and `RESTORE_AUTH.md` into the existing `/mnt/documents/supabase-migration/` bundle and repackage the zip.

## Technical notes

- The dump is `pg_dump --data-only --schema=auth` with explicit table excludes for `auth.sessions`, `auth.refresh_tokens`, `auth.flow_state`, `auth.one_time_tokens`, and `auth.audit_log_entries`. The `auth` schema structure itself already exists in any new Supabase project, so only data is transferred.
- Inserts are emitted as `INSERT` statements with `ON CONFLICT (id) DO NOTHING` guidance so a partial re-run is safe.
- After restore, users sign in with their existing passwords — hashes are bcrypt and carry over verbatim.
- Anything provider-specific (Google OAuth client id/secret, SMTP, redirect URLs) is project config, not schema, and still has to be re-entered in the new project's auth settings; `RESTORE_AUTH.md` will list them.

## Security

`auth.sql` contains password hashes and user emails. It will be treated as a sensitive artifact: keep it private, do not commit it to git, and delete it after the migration completes.
