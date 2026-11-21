# Going live on one small server

For the full site (accounts, contributions, editorial review, corrections). Needs one Linux server (2 GB RAM), the domain `sagatsingh.org` pointed at it, and about 30 minutes.

1. **Server.** Buy an Ubuntu 22.04 or 24.04 server. Point the `A` record of `sagatsingh.org` (and `www`) at its IP address.
2. **Code.** Push this repository to a private GitHub repository, then on the server: `git clone <repo-url> ssrf && cd ssrf`.
3. **Set up the server once.** `sudo sh ops/server-setup.sh` installs Docker, opens only SSH, HTTP and HTTPS, and turns on security updates.
4. **Settings.** `cp .env.example .env`, then fill in `POSTGRES_PASSWORD` (a long random value), `ADMIN_EMAIL` and the SMTP values. `SITE_URL`, `DOMAIN` and `ACME_EMAIL` are already set for `sagatsingh.org`.
5. **Deploy.** `sh ops/deploy.sh`. It builds everything, starts it, gets the HTTPS certificate and waits until `https://sagatsingh.org` answers. Run the same command to update later.
6. **First sign-in.** Register on the site with the address in `ADMIN_EMAIL`; that account becomes the Administrator.

## Bringing the current content across
On the machine that has the content now: `docker exec ssrf-pg-dev pg_dump -U postgres -d ssrf -Fc > ssrf.dump`, then copy `ssrf.dump` to the server (`scp`). On the server: `docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T db pg_restore -U ssrf -d ssrf --clean --if-exists --no-owner < ssrf.dump`.
That dump also holds the local test accounts (`*@example.test`). Delete them after restoring, then register your real administrator account.

## Cheaper or simpler?
The database and API exist for the interactive parts. A read-only copy of the site can be published as plain files on a free host; see the discussion in the project notes. The trade-off is no sign-in, contributions or corrections.
