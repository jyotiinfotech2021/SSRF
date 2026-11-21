#!/bin/sh
# One-time set-up of a fresh Ubuntu 22.04/24.04 server for the SSRF site. Run as root:  sh ops/server-setup.sh
# Installs Docker, opens only SSH, HTTP and HTTPS, turns on automatic security updates and adds swap on small servers.
set -eu
[ "$(id -u)" = 0 ] || { echo "Run as root (sudo sh ops/server-setup.sh)"; exit 1; }

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl git ufw unattended-upgrades fail2ban

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

# Firewall: SSH, HTTP, HTTPS only. The database, API and website ports are never published.
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

# Swap helps a 2 GB server survive builds.
if [ ! -f /swapfile ] && [ "$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)" -lt 4096 ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

systemctl enable --now fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades || true
echo "Server ready. Next: clone the repository, copy .env.example to .env, fill it in, then run: sh ops/deploy.sh"
