# Lavalink s konfigurací zapečenou uvnitř - pro CasaOS, kde nejde snadno nahrát application.yml.
# Hesla a klíče v image NEJSOU: application.yml je čte z proměnných prostředí při startu.
# Výchozí varianta (Ubuntu), NE alpine - DAVE šifrování potřebuje glibc >= 2.35.
ARG LAVALINK_VERSION=4.2.2
FROM ghcr.io/lavalink-devs/lavalink:${LAVALINK_VERSION}

USER root
# Složka pro pluginy musí patřit uživateli Lavalinku (UID 322), jinak je nestáhne.
RUN mkdir -p /opt/Lavalink/plugins && chown -R 322:322 /opt/Lavalink/plugins
COPY --chown=322:322 application.yml /opt/Lavalink/application.yml
USER 322

# Zdravý = HTTP /version odpoví 200 (image nemá curl, proto bash /dev/tcp).
HEALTHCHECK --interval=10s --timeout=5s --start-period=90s --retries=12 \
  CMD bash -c 'exec 3<>/dev/tcp/127.0.0.1/2333 && printf "GET /version HTTP/1.0\r\nAuthorization: %s\r\n\r\n" "$LAVALINK_PASSWORD" >&3 && head -n 1 <&3 | grep -q " 200 "'
