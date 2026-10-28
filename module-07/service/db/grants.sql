-- Lab 6.3. Run as the admin account:
--   psql ... -v app_account=<app-account> -f grants.sql
GRANT SELECT, INSERT, UPDATE, DELETE ON records, documents TO :"app_account";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_account";
