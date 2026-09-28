#!/usr/bin/env bash
# PrivateCall voice server bootstrap — Ubuntu 22.04/24.04 (e.g. Oracle Cloud Free Tier).
# Usage (as root, from a checkout of this repo):
#   VOICE_DOMAIN=voice.example.com ACME_EMAIL=you@example.com \
#   PRIVATECALL_APP_URL=https://your-app.vercel.app \
#   VOICE_SHARED_SECRET=... TURN_SECRET=... \
#   bash infra/oracle-vm/setup-voice-server.sh
# No secrets are stored in the repo; they are written to /etc/default/privatecall (mode 600).
set -euo pipefail

: "${VOICE_DOMAIN:?set VOICE_DOMAIN}" "${ACME_EMAIL:?set ACME_EMAIL}"
: "${PRIVATECALL_APP_URL:?set PRIVATECALL_APP_URL}" "${VOICE_SHARED_SECRET:?set VOICE_SHARED_SECRET}" "${TURN_SECRET:?set TURN_SECRET}"
[ "$(id -u)" = 0 ] || { echo "run as root"; exit 1; }
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
PUBLIC_IP="${PUBLIC_IP:-$(curl -fsS https://api.ipify.org)}"
PRIVATE_IP="${PRIVATE_IP:-$(hostname -I | awk '{print $1}')}"

echo "==> Packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y asterisk asterisk-modules coturn certbot ufw curl ca-certificates iptables-persistent

echo "==> Firewall (ufw + Oracle's default iptables REJECT rules)"
PORTS_TCP="22 80 443 5061 8089 3478 5349"
PORTS_UDP="5060 3478 10000:20000 49160:49200"
for p in $PORTS_TCP; do ufw allow "$p/tcp"; done
for p in $PORTS_UDP; do ufw allow "$p/udp"; done
ufw --force enable
# Oracle images ship iptables rules that REJECT everything but SSH; open ours before them.
for p in 80 443 5061 8089 3478 5349; do iptables -C INPUT -p tcp --dport "$p" -j ACCEPT 2>/dev/null || iptables -I INPUT 5 -p tcp --dport "$p" -j ACCEPT; done
for p in 5060 3478 10000:20000 49160:49200; do iptables -C INPUT -p udp --dport "$p" -j ACCEPT 2>/dev/null || iptables -I INPUT 5 -p udp --dport "$p" -j ACCEPT; done
netfilter-persistent save || true
echo "    Also open the same ports in the OCI Security List / NSG (manual step)."

echo "==> TLS (Let's Encrypt)"
install -d -m 750 -o asterisk -g asterisk /etc/asterisk/keys
install -d -m 750 /etc/coturn/certs
if [ ! -f "/etc/letsencrypt/live/$VOICE_DOMAIN/fullchain.pem" ]; then
  certbot certonly --standalone --non-interactive --agree-tos -m "$ACME_EMAIL" -d "$VOICE_DOMAIN"
fi
mkdir -p /etc/letsencrypt/renewal-hooks/deploy
cat > /etc/letsencrypt/renewal-hooks/deploy/privatecall.sh <<EOF
#!/bin/sh
L=/etc/letsencrypt/live/$VOICE_DOMAIN
install -m 640 -o asterisk -g asterisk \$L/fullchain.pem \$L/privkey.pem /etc/asterisk/keys/
install -m 640 -o turnserver -g turnserver \$L/fullchain.pem \$L/privkey.pem /etc/coturn/certs/
systemctl reload asterisk 2>/dev/null || true
systemctl restart coturn 2>/dev/null || true
EOF
chmod +x /etc/letsencrypt/renewal-hooks/deploy/privatecall.sh
/etc/letsencrypt/renewal-hooks/deploy/privatecall.sh

echo "==> Secrets / env"
umask 077
cat > /etc/default/privatecall <<EOF
PRIVATECALL_APP_URL=$PRIVATECALL_APP_URL
VOICE_SHARED_SECRET=$VOICE_SHARED_SECRET
EOF
umask 022
mkdir -p /etc/systemd/system/asterisk.service.d
cat > /etc/systemd/system/asterisk.service.d/privatecall.conf <<EOF
[Service]
EnvironmentFile=/etc/default/privatecall
EOF

echo "==> Asterisk config"
for f in pjsip.conf extensions.conf http.conf rtp.conf modules.conf; do
  if [ -f "/etc/asterisk/$f" ] && [ ! -f "/etc/asterisk/$f.orig" ]; then cp "/etc/asterisk/$f" "/etc/asterisk/$f.orig"; fi
  install -m 640 -o asterisk -g asterisk "$REPO/infra/asterisk/$f" "/etc/asterisk/$f"
done
sed -i "s/EXTERNAL_IP/$PUBLIC_IP/g" /etc/asterisk/pjsip.conf
sed -i "s/voice.example.com/$VOICE_DOMAIN/g" /etc/asterisk/rtp.conf
touch /etc/asterisk/pjsip_users.conf /etc/asterisk/pjsip_provider.conf
chown asterisk:asterisk /etc/asterisk/pjsip_*.conf
install -m 750 "$REPO/infra/asterisk/sync-config.sh" /usr/local/bin/privatecall-sync
cat > /etc/cron.d/privatecall-sync <<EOF
* * * * * root . /etc/default/privatecall && export PRIVATECALL_APP_URL VOICE_SHARED_SECRET && /usr/local/bin/privatecall-sync >> /var/log/privatecall-sync.log 2>&1
EOF

echo "==> coturn"
sed -e "s/CHANGE_ME_TURN_SECRET/$TURN_SECRET/" -e "s/voice.example.com/$VOICE_DOMAIN/" \
    -e "s|# external-ip=.*|external-ip=$PUBLIC_IP/$PRIVATE_IP|" \
    "$REPO/infra/coturn/turnserver.conf" > /etc/turnserver.conf
chmod 640 /etc/turnserver.conf; chown root:turnserver /etc/turnserver.conf 2>/dev/null || true
sed -i 's/^#\?TURNSERVER_ENABLED=.*/TURNSERVER_ENABLED=1/' /etc/default/coturn 2>/dev/null || echo "TURNSERVER_ENABLED=1" > /etc/default/coturn

echo "==> Services"
systemctl daemon-reload
systemctl enable --now coturn asterisk
systemctl restart coturn asterisk
sleep 5
set -a; . /etc/default/privatecall; set +a
/usr/local/bin/privatecall-sync || echo "WARN: could not pull config from $PRIVATECALL_APP_URL yet"

echo "==> Validation"
fail=0
asterisk -rx "core show version" || fail=1
asterisk -rx "module show like res_pjsip_transport_websocket" | grep -q websocket || { echo "missing websocket module"; fail=1; }
asterisk -rx "module show like func_curl" | grep -q curl || { echo "missing func_curl"; fail=1; }
asterisk -rx "pjsip show transports" | grep -q transport-wss || { echo "WSS transport not loaded"; fail=1; }
asterisk -rx "http show status" | grep -q 8089 || { echo "HTTPS/WSS 8089 not bound"; fail=1; }
asterisk -rx "pjsip show endpoint provider-trunk" >/dev/null 2>&1 && echo "provider-trunk present" || echo "provider-trunk not configured yet (OK in DEMO_MODE)"
systemctl is-active --quiet coturn || { echo "coturn not running"; fail=1; }
curl -fsS "https://$VOICE_DOMAIN:8089/httpstatus" >/dev/null && echo "WSS endpoint reachable" || { echo "https://$VOICE_DOMAIN:8089 unreachable"; fail=1; }
[ "$fail" = 0 ] && echo "OK: voice server ready" || { echo "Some checks failed"; exit 1; }
