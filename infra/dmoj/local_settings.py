import os

# ── Database (MySQL 8.0) ───────────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'dmoj',
        'USER': 'dmoj',
        'PASSWORD': os.environ.get('MYSQL_PASSWORD', 'dmoj_pass'),
        'HOST': 'dmoj-db',
        'PORT': '3306',
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}

# ── Celery ────────────────────────────────────────────────────────────────
CELERY_BROKER_URL    = 'redis://dmoj-redis:6379/2'
CELERY_RESULT_BACKEND = 'redis://dmoj-redis:6379/2'

# ── Redis Channel Layer ────────────────────────────────────────────────────
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [('dmoj-redis', 6379)],
        },
    },
}

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://dmoj-redis:6379/1',
    }
}

# ── WebSocket Event Daemon ─────────────────────────────────────────────────
# daemon.js: port 9997 (Django POST events) / port 9996 (browser GET)
EVENT_DAEMON_USE  = True
EVENT_DAEMON_POST = 'ws://dmoj-wsevent:9997/'      # Django → wsevent
EVENT_DAEMON_GET  = 'ws://localhost:8081/event/'    # browser (nginx proxy)
EVENT_DAEMON_POLL = '/channels/'
EVENT_DAEMON_KEY  = None

# ── Judge / Bridged ────────────────────────────────────────────────────────
JUDGE_SERVERS = [
    ('lms-judge-01', os.environ.get('JUDGE_SERVER_SHARED_SECRET', 'lms-judge-secret')),
]

PROBLEM_DATA_ROOT = '/problems'
SUBMISSION_ROOT   = '/submissions'

# Judges connect to bridged on all interfaces (not just localhost)
BRIDGED_JUDGE_ADDRESS  = [('0.0.0.0', 9999)]
# Django receives events from bridged on port 9998
BRIDGED_DJANGO_ADDRESS = [('0.0.0.0', 9998)]
# Django connects to bridged event port (same container: localhost, or via Docker DNS)
BRIDGED_DJANGO_CONNECT = ('dmoj-bridged', 9998)

# ── General ────────────────────────────────────────────────────────────────
ALLOWED_HOSTS = ['*']
CSRF_TRUSTED_ORIGINS = [
    'http://localhost:8081',
    'http://127.0.0.1:8081',
]

TIME_ZONE               = 'Asia/Ulaanbaatar'
REGISTRATION_OPEN       = True
ACCOUNT_ACTIVATION_DAYS = 7
SUBMISSION_SOURCE_LIMIT = 65536

# Static files
STATIC_ROOT = '/assets/'
MEDIA_ROOT  = '/media/'
