# Deploying on Railway

The repository holds two apps, `apps/web` (website) and `apps/api` (server), so Railway needs one service for each, plus a database. Pointing Railway at the repository root fails with "Railpack failed to prepare the build", because the root has no single app to build. Each app has its own `Dockerfile` and `railway.json`; set the service's **Root Directory** and Railway uses them.

## 1. Database
New → Database → PostgreSQL. Railway creates variables such as `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER` and `PGPASSWORD`.

## 2. API service
New → GitHub Repo → this repository, then in Settings:
- **Root Directory:** `apps/api` (builder: Dockerfile, picked up from `railway.json`)
- **Variables:**
  - `ConnectionStrings__Default` = `Host=${{Postgres.PGHOST}};Port=${{Postgres.PGPORT}};Database=${{Postgres.PGDATABASE}};Username=${{Postgres.PGUSER}};Password=${{Postgres.PGPASSWORD}}` (use the database service's actual name instead of `Postgres` if it differs; Npgsql needs this key=value form, not `DATABASE_URL`)
  - `Bootstrap__AdminEmail` = the administrator's address (the first account registered with it becomes Administrator)
  - `Site__Url` = `https://sagatsingh.org`
  - `ASPNETCORE_ENVIRONMENT` = `Production`
  - `Proxy__TrustForwardedHeaders` = `true`
  - `PORT` = `8080`
  - `RAILWAY_RUN_UID` = `0` (lets the app write to the volume below)
  - optional email: `Smtp__Host`, `Smtp__Port`, `Smtp__User`, `Smtp__Password`, `Smtp__From`
- **Volume:** add a volume mounted at `/data/storage` (uploaded files).
- **Networking:** do not generate a public domain. The API is reached privately as `api.railway.internal:8080` (rename the service to `api` first).

## 3. Web service
New → GitHub Repo → the same repository again, then:
- **Root Directory:** `apps/web`
- **Variables:** `API_URL` = `http://api.railway.internal:8080`, `SITE_URL` = `https://sagatsingh.org`, `PORT` = `3000`
- **Networking:** generate a domain to test, then add the custom domain `sagatsingh.org` (and `www`) and create the DNS records Railway shows.

`API_URL` is read at build time as well as run time, so set it before the first deploy (or redeploy after setting it).

## 4. Bring the content across
From a machine with the current database: `pg_dump -Fc` it, then restore into Railway's database through its public TCP proxy (Postgres service → Settings → Networking) with `pg_restore --clean --if-exists --no-owner -d "<public connection string>" ssrf.dump`. Delete the local test accounts (`*@example.test`) afterwards and register the real administrator.

## Notes
- Railway bills by usage; a site this size is typically a few dollars a month on top of the base plan. The nightly backup container in `docker-compose.yml` is not used here: turn on the Postgres service's backups in Railway and keep a periodic `pg_dump`.
- Health check: the API answers `/health`.
