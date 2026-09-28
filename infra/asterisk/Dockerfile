FROM ubuntu:24.04
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
      asterisk asterisk-modules curl ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*
COPY pjsip.conf extensions.conf http.conf rtp.conf modules.conf /etc/asterisk/
COPY sync-config.sh docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/*.sh
EXPOSE 5060/udp 8088 8089 10000-10100/udp
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
