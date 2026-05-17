# LMS Local Volumes

This folder stores local Docker runtime data in a predictable layout.

- `postgres/data` - PostgreSQL database files.
- `redis/data` - Redis persistence data.
- `rabbitmq/data` - RabbitMQ persisted broker state.
- `minio/data` - MinIO object storage data, including uploaded media and certificates.
- `ollama/data` - Ollama model/cache data.

The contents are intentionally ignored by Git.

If you previously used Docker named volumes, Docker will not automatically move that data here. Export or copy the old volumes before switching if you need to preserve existing local data.
