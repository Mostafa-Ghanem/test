#!/usr/bin/env bash
# Pulls generated PJSIP includes (WebRTC users + provider trunk) from the app and reloads PJSIP.
# Env: PRIVATECALL_APP_URL, VOICE_SHARED_SECRET, ASTERISK_ETC (default /etc/asterisk)
set -euo pipefail
ETC="${ASTERISK_ETC:-/etc/asterisk}"
: "${PRIVATECALL_APP_URL:?}" "${VOICE_SHARED_SECRET:?}"
changed=0
for f in users provider; do
  tmp="$(mktemp)"
  curl -fsS --max-time 10 -H "X-Voice-Secret: ${VOICE_SHARED_SECRET}" \
    "${PRIVATECALL_APP_URL}/api/voice/config?file=${f}" -o "$tmp"
  if ! cmp -s "$tmp" "$ETC/pjsip_${f}.conf"; then
    install -m 640 "$tmp" "$ETC/pjsip_${f}.conf"
    chown asterisk:asterisk "$ETC/pjsip_${f}.conf" 2>/dev/null || true
    changed=1
  fi
  rm -f "$tmp"
done
if [ "$changed" = 1 ] && asterisk -rx "core show version" >/dev/null 2>&1; then
  asterisk -rx "module reload res_pjsip.so" >/dev/null
  echo "PJSIP config updated and reloaded"
fi
