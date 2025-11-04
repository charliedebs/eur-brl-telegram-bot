# Database Migrations Guide

This document explains how to manage database schema changes for the EUR/BRL Telegram Bot.

## Current Approach

The project uses **Supabase** (PostgreSQL) for its database. Currently, schema changes are managed manually through the Supabase dashboard.

## Schema Documentation

The complete database schema is documented in [`docs/schema.sql`](./schema.sql). This file serves as:

1. **Reference documentation** for all tables and their structure
2. **Initial setup script** for new deployments
3. **Source of truth** for the database schema

## Making Schema Changes

### Option 1: Supabase Dashboard (Current Method)

1. Log into your Supabase project dashboard
2. Navigate to the SQL Editor
3. Execute SQL commands directly
4. Update `docs/schema.sql` to reflect the changes

**Pros:**
- Simple and visual
- No additional setup required
- Built-in query history

**Cons:**
- Manual tracking of changes
- No automatic versioning
- Difficult to replicate across environments

### Option 2: Supabase CLI with Migrations (Recommended for Production)

For production deployments, we recommend setting up proper migration management:

1. **Install Supabase CLI:**
   ```bash
   npm install -g supabase
   ```

2. **Initialize Supabase in your project:**
   ```bash
   supabase init
   ```

3. **Link to your remote project:**
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. **Create a new migration:**
   ```bash
   supabase migration new add_new_column
   ```

5. **Write your migration SQL in the generated file:**
   ```sql
   -- supabase/migrations/20250104_add_new_column.sql
   ALTER TABLE users ADD COLUMN new_field VARCHAR(255);
   ```

6. **Apply migrations:**
   ```bash
   supabase db push
   ```

**Pros:**
- Version-controlled migrations
- Repeatable deployments
- Easy rollback capability
- CI/CD integration

**Cons:**
- Requires additional setup
- Learning curve for team members

### Option 3: node-pg-migrate (Alternative)

If you prefer Node.js-based migrations:

1. **Install node-pg-migrate:**
   ```bash
   npm install --save-dev node-pg-migrate
   ```

2. **Create migration script in package.json:**
   ```json
   {
     "scripts": {
       "migrate:up": "node-pg-migrate up -m migrations",
       "migrate:down": "node-pg-migrate down -m migrations",
       "migrate:create": "node-pg-migrate create -m migrations"
     }
   }
   ```

3. **Create migrations:**
   ```bash
   npm run migrate:create add_new_column
   ```

4. **Run migrations:**
   ```bash
   npm run migrate:up
   ```

## Migration Best Practices

### 1. Always Backup First
```bash
# Using Supabase CLI
supabase db dump -f backup.sql
```

### 2. Test Migrations Locally
- Use a development Supabase project
- Test the full up/down cycle
- Verify data integrity after migration

### 3. Make Migrations Reversible
```sql
-- Up migration
ALTER TABLE users ADD COLUMN email VARCHAR(255);

-- Down migration (in comments or separate file)
ALTER TABLE users DROP COLUMN email;
```

### 4. Use Transactions
```sql
BEGIN;
  ALTER TABLE users ADD COLUMN email VARCHAR(255);
  CREATE INDEX idx_users_email ON users(email);
COMMIT;
```

### 5. Document Breaking Changes
If a migration affects the application code, update:
- This migrations guide
- The main README
- Code comments where relevant

## Common Migration Tasks

### Adding a Column
```sql
ALTER TABLE users ADD COLUMN last_login TIMESTAMP WITH TIME ZONE;
```

### Adding an Index
```sql
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
```

### Creating a New Table
```sql
CREATE TABLE IF NOT EXISTS user_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    preference_key VARCHAR(100) NOT NULL,
    preference_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, preference_key)
);
```

### Modifying a Column
```sql
-- Change data type
ALTER TABLE users ALTER COLUMN language TYPE VARCHAR(10);

-- Add NOT NULL constraint
ALTER TABLE users ALTER COLUMN language SET NOT NULL;

-- Add DEFAULT value
ALTER TABLE users ALTER COLUMN language SET DEFAULT 'pt';
```

### Dropping a Column (with caution)
```sql
-- Add safety check first
DO $$
BEGIN
    IF EXISTS (SELECT FROM users WHERE old_column IS NOT NULL) THEN
        RAISE EXCEPTION 'old_column still contains data, cannot drop safely';
    END IF;
END $$;

ALTER TABLE users DROP COLUMN old_column;
```

## Emergency Rollback

If a migration causes issues in production:

1. **Stop the application:**
   ```bash
   # On your server
   pm2 stop all
   ```

2. **Restore from backup:**
   ```bash
   psql -h your-db-host -U postgres -d postgres -f backup.sql
   ```

3. **Or revert the specific change:**
   ```sql
   -- If you added a column
   ALTER TABLE users DROP COLUMN new_column;

   -- If you modified a column
   ALTER TABLE users ALTER COLUMN language TYPE VARCHAR(5);
   ```

4. **Restart the application:**
   ```bash
   pm2 start all
   ```

## Future Improvements

For a production-grade setup, consider:

1. **Automated Backups:** Schedule daily backups with retention policy
2. **CI/CD Integration:** Run migrations automatically on deploy
3. **Migration Testing:** Add automated tests for critical migrations
4. **Monitoring:** Track migration execution time and errors
5. **Multi-Environment:** Separate dev/staging/prod migration tracks

## Reference

- [Supabase Migrations Documentation](https://supabase.com/docs/guides/cli/managing-environments)
- [node-pg-migrate Documentation](https://github.com/salsita/node-pg-migrate)
- [PostgreSQL ALTER TABLE Documentation](https://www.postgresql.org/docs/current/sql-altertable.html)
