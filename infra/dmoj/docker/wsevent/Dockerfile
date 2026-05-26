# =============================================================================
# DMOJ WebSocket Event Daemon — Node.js
# DMOJ repo-ийн websocket/daemon.js ашиглана
# Build context: ./infra/dmoj/
# Port 9996: browser → nginx → wsevent (GET)
# Port 9997: Django → wsevent (POST events)
# =============================================================================
FROM node:20-alpine

WORKDIR /wsevent

# DMOJ websocket daemon source + config
COPY repo/websocket/daemon.js ./daemon.js
COPY docker/wsevent/config.js  ./config.js

# npm dependencies
RUN npm install simplesets qu ws

EXPOSE 9996 9997

CMD ["node", "daemon.js"]
