import os

# Database is configured via DATABASE_URL env var in docker-compose
# Redis channel layer
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [os.environ.get('REDIS_URL', 'redis://dmoj-redis:6379/0')],
        },
    },
}

# Cache
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://dmoj-redis:6379/1'),
    }
}

# Judge server configuration
# Each judge must have a unique key matching DMOJ_JUDGE_KEY in docker-compose
JUDGE_SERVERS = [
    ('lms-judge-01', os.environ.get('JUDGE_SERVER_SHARED_SECRET', 'lms-judge-secret')),
]

# Problem and submission storage paths (mounted as Docker volumes)
PROBLEM_DATA_ROOT = '/problems'
SUBMISSION_ROOT = '/submissions'

# Disable email verification for development
REGISTRATION_OPEN = True
ACCOUNT_ACTIVATION_DAYS = 7

# Time zone
TIME_ZONE = 'Asia/Ulaanbaatar'

# Maximum submission source code size (bytes)
SUBMISSION_SOURCE_LIMIT = 65536

# Judge connection settings
BRIDGED_JUDGE_HOST = '0.0.0.0'
BRIDGED_JUDGE_PORT = 9999
BRIDGED_DJANGO_CONNECT = ('dmoj-site', 9999)
