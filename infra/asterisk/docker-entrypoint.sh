#!/usr/bin/env bash
# Dev container: self-signed TLS, localhost addressing, config pulled from the app.
set -e
mkdir -p /etc/asterisk/keys
if [ ! -f /etc/asterisk/keys/fullchain.pem ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 365 -subj "/CN=localhost" \
    -keyout /etc/asterisk/keys/privkey.pem -out /etc/asterisk/keys/fullchain.pem
fi
sed -i "s/EXTERNAL_IP/${EXTERNAL_IP:-127.0.0.1}/g; s/voice.example.com/${VOICE_HOST:-coturn}/g" /etc/asterisk/pjsip.conf /etc/asterisk/rtp.conf
sed -i "s/^rtpend=.*/rtpend=10100/" /etc/asterisk/rtp.conf
sed -i "s/^bindaddr=.*/bindaddr=0.0.0.0/" /etc/asterisk/http.conf   # dev: health check from app container
touch /etc/asterisk/pjsip_users.conf /etc/asterisk/pjsip_provider.conf
chown -R asterisk:asterisk /etc/asterisk /var/lib/asterisk /var/spool/asterisk /var/log/asterisk 2>/dev/null || true
# Keep generated users/provider config in sync with the app (every 30s).
( until sync-config.sh; do sleep 5; done; while sleep 30; do sync-config.sh || true; done ) &
exec asterisk -f -U asterisk -G asterisk -vvv
