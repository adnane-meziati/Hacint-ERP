from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY', 'dev-insecure-key-change-me')
DEBUG = os.getenv('DEBUG', 'True') == 'True'

# In dev, accept any host so the app is reachable on the local network
# In prod, set ALLOWED_HOSTS in .env (e.g. "192.168.1.100,myserver.com")
if DEBUG:
    ALLOWED_HOSTS = ['*']
else:
    ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'django_filters',
    'samples',
    'storage',
    'accounting',
    'hr',
    'logistics',
    'installation',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# Set USE_SQLITE=True in .env to run without PostgreSQL (dev / other PCs)
if os.getenv('USE_SQLITE', 'False') == 'True':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DB_NAME', 'sampletracker'),
            'USER': os.getenv('DB_USER', 'postgres'),
            'PASSWORD': os.getenv('DB_PASSWORD', 'postgres'),
            'HOST': os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('DB_PORT', '5432'),
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Europe/Paris'
USE_I18N = True
USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Built React app — populated by "npm run build" in the frontend folder
FRONTEND_DIST_DIR = BASE_DIR / 'frontend_dist'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Folder on the laptop where JIMIDE-4030 DXF files are also saved
JIMIDE_DXF_FOLDER = Path(os.getenv('JIMIDE_DXF_FOLDER', r'C:\code work\dxf'))

# ── File upload limits ────────────────────────────────────────────────────────
# CAD files (SolidWorks assemblies, TopSolid packages) can be large — allow up to 500 MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 524_288_000   # 500 MB in bytes
FILE_UPLOAD_MAX_MEMORY_SIZE = 524_288_000   # stream to disk above 2.5 MB (Django default)
# Files above 2.5 MB are automatically streamed to a temp file instead of held in RAM
FILE_UPLOAD_TEMP_DIR = None  # use system default temp dir

# DRF
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}

# CORS & CSRF
# In dev: allow all origins so tablets/phones on the LAN can connect via Vite proxy
# In prod: restrict to the exact frontend origin via env vars
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
    CSRF_TRUSTED_ORIGINS = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://192.168.16.110:8000',
    ]
else:
    _cors_origins = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:5173')
    CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(',')]
    _csrf_origins = os.getenv('CSRF_TRUSTED_ORIGINS', 'http://localhost:5173')
    CSRF_TRUSTED_ORIGINS = [o.strip() for o in _csrf_origins.split(',')]

CORS_ALLOW_CREDENTIALS = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_HTTPONLY = False  # Frontend JS needs to read it
