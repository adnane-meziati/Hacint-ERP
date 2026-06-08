# MEGAINDUS ERP

Browser-based ERP for HACINT/APTIV CNC machining order tracking at TAC2 (Tanger, Morocco).
Replaces the Excel workflow (`Order_Traking_APTIV_HACINT_2026_V2.xlsx` + 9 companion files).

---

## Prerequisites — What to Install Before You Start

The project runs entirely inside Docker containers. You only need three tools on your machine.

### Required (Docker path — recommended)

| Tool | Minimum version | Download |
|---|---|---|
| **Docker Engine** | 29.x ✅ | https://docs.docker.com/engine/install/ |
| **Docker Compose** (plugin) | 5.x ✅ (`docker compose`) | Included with Docker Desktop |
| **Git** | 2.54.x ✅ | https://git-scm.com/downloads |

> **Windows users**: Install [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/) — it bundles Docker Engine, Docker Compose v2+, and the WSL 2 backend in one installer.
> After installation, verify with:
> ```bash
> docker --version        # Docker version 29.4.1, build 055a478
> docker compose version  # Docker Compose version v5.1.3
> git --version           # git version 2.54.0.windows.1
> ```

That is all you need. Jump to [Quick Start](#quick-start-development).

---

### Optional — Bare-metal / local development (no Docker)

Only needed if you want to run the backend or frontend directly on your machine without containers.

#### Backend (Python)

| Tool | Version | Download |
|---|---|---|
| **Python** | 3.12 | https://www.python.org/downloads/ |
| **pip** | latest | bundled with Python |
| **PostgreSQL** | 16 | https://www.postgresql.org/download/ |
| **Redis** | 7 | https://redis.io/docs/getting-started/installation/ |

WeasyPrint (used for PDF generation) requires OS-level libraries:

- **Linux/WSL**: `sudo apt install libpango-1.0-0 libpangoft2-1.0-0 libcairo2 libgdk-pixbuf2.0-0 libffi-dev shared-mime-info`
- **macOS**: `brew install pango cairo gdk-pixbuf libffi`
- **Windows**: WeasyPrint is not supported natively on Windows — use WSL 2 or Docker instead.

Install all Python packages:
```bash
cd backend
pip install -r requirements.txt
```

Complete list of Python packages installed by `requirements.txt`:

| Package | Version | Purpose |
|---|---|---|
| Django | 5.0.6 | Web framework |
| djangorestframework | 3.15.2 | REST API |
| djangorestframework-simplejwt | 5.3.1 | JWT authentication |
| psycopg2-binary | 2.9.9 | PostgreSQL adapter |
| celery | 5.4.0 | Async task queue |
| django-celery-beat | 2.6.0 | Periodic tasks scheduler |
| redis | 5.0.7 | Redis client for Celery broker |
| django-filter | 24.2 | API query filters |
| drf-spectacular | 0.27.2 | OpenAPI 3 schema generation |
| Pillow | 10.4.0 | Image processing (avatars) |
| WeasyPrint | 62.3 | PDF generation |
| openpyxl | 3.1.3 | Excel export |
| pandas | 2.2.2 | Legacy Excel import |
| gunicorn | 22.0.0 | WSGI server (production) |
| python-decouple | 3.8 | `.env` file loading |
| django-cors-headers | 4.4.0 | CORS headers |
| python-json-logger | 2.0.7 | JSON structured logs |
| pytest | 8.2.2 | Test runner |
| pytest-django | 4.8.0 | Django integration for pytest |
| pytest-cov | 5.0.0 | Coverage reports |
| factory-boy | 3.3.0 | Test data factories |
| ruff | 0.4.10 | Fast Python linter |
| black | 24.4.2 | Python code formatter |
| mypy | 1.10.1 | Static type checker |
| django-stubs | 5.0.4 | Django type stubs for mypy |
| djangorestframework-stubs | 3.15.0 | DRF type stubs for mypy |

#### Frontend (Node.js)

| Tool | Version | Download |
|---|---|---|
| **Node.js** | 20 LTS | https://nodejs.org/en/download |
| **npm** | 10+ | Bundled with Node.js |

Install all frontend packages:
```bash
cd frontend
npm install
```

Complete list of npm packages installed by `package.json`:

**Runtime dependencies:**

| Package | Version | Purpose |
|---|---|---|
| vue | ^3.4.31 | Frontend framework |
| vue-router | ^4.3.3 | Client-side routing |
| pinia | ^2.1.7 | State management |
| pinia-plugin-persistedstate | ^3.2.1 | Persist store state to localStorage |
| axios | ^1.7.2 | HTTP client |
| vue-i18n | ^9.13.1 | Internationalization (FR / EN) |
| @tanstack/vue-table | ^8.19.2 | Headless data table |
| chart.js | ^4.4.3 | Charts (bar, line) |
| vue-chartjs | ^5.3.1 | Chart.js Vue wrapper |

**Dev dependencies:**

| Package | Version | Purpose |
|---|---|---|
| vite | ^5.3.4 | Build tool & dev server |
| @vitejs/plugin-vue | ^5.1.2 | Vue plugin for Vite |
| typescript | ^5.4.5 | TypeScript compiler |
| vue-tsc | ^2.0.26 | Vue TypeScript type-check |
| tailwindcss | ^3.4.6 | Utility-first CSS framework |
| autoprefixer | ^10.4.19 | CSS vendor prefixes |
| postcss | ^8.4.40 | CSS transformation pipeline |
| eslint | ^9.7.0 | JavaScript/TypeScript linter |
| @vue/eslint-config-typescript | ^13.0.0 | ESLint config for Vue + TS |
| eslint-plugin-vue | ^9.27.0 | ESLint rules for Vue |
| prettier | ^3.3.3 | Code formatter |
| vitest | ^1.6.0 | Unit test runner |
| @vue/test-utils | ^2.4.6 | Vue component test utilities |
| @types/node | ^20.14.12 | Node.js type definitions |

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.12, Django 5, Django REST Framework |
| Database | PostgreSQL 16 |
| Async tasks | Celery 5 + Redis 7 |
| Auth | JWT (djangorestframework-simplejwt) with rotation + blacklist |
| Frontend | Vue 3 + Vite + Pinia + Tailwind CSS + vue-chartjs |
| Deploy | Docker Compose + Nginx (on-premise LAN) |

---

## Quick Start (development)

```bash
git clone <repo>
cd megaindus_erp
cp .env.example .env          # edit passwords — see .env.example
make up                        # build & start all containers
make migrate                   # apply DB migrations
make seed                      # create demo users, APTIV client, 7 stages
```

Open **http://localhost** — login with `admin` / `Admin1234!`

---

## Make Targets

| Command | Action |
|---|---|
| `make up` | Build & start all services (web, db, redis, celery, nginx) |
| `make down` | Stop all services |
| `make build` | Rebuild images without starting |
| `make migrate` | Run Django migrations |
| `make makemigrations` | Generate new migration files |
| `make seed` | Seed demo data — idempotent, safe to re-run |
| `make import FILE=myfile.xlsx` | Import legacy OP Excel file (header row 6) |
| `make test` | Run pytest with coverage report |
| `make lint` | Lint backend (ruff + black) + frontend (eslint) |
| `make format` | Auto-fix backend formatting |
| `make shell` | Django interactive shell |
| `make dbshell` | PostgreSQL shell |
| `make logs` | Follow all container logs |
| `make superuser` | Create a Django superuser interactively |
| `make collectstatic` | Collect static files (needed before prod deploy) |

---

## Importing the Legacy Excel File

Place the file in the project root, then run:

```bash
make import FILE=Order_Traking_APTIV_HACINT_2026_V2.xlsx
```

The importer:
- Reads the sheet named `OP`, header on row 6 (index 5)
- Upserts clients, families, articles, orders, and order lines
- Marks `StageEvent` rows as DONE for completed stages (columns K, N, P, S, U, W, Y)
- `rebuild_current_stage` runs automatically after import to set `current_stage` correctly
- Is idempotent — safe to run multiple times; existing rows are updated, not duplicated

---

## Demo Users (after `make seed`)

| Username | Password | Role |
|---|---|---|
| `admin` | `Admin1234!` | Admin — full access |
| `planner` | `Plan1234!` | Planner — orders, planning, export |
| `designer` | `Dsgn1234!` | Designer — CAD queue |
| `programmer` | `Prog1234!` | Programmer — CAM queue |
| `operator` | `Oper1234!` | CNC Operator — CNC queue |
| `assembly` | `Assy1234!` | Assembly — MTG queue |
| `qc` | `Qual1234!` | Quality — QF queue |
| `client` | `Clie1234!` | Client — read-only view |

---

## Production Stage Flow

```
ECH → CAD → CAM → CNC → MTG → QF → AQC → LIVREE
```

Each `OrderLine` gets 7 `StageEvent` rows auto-created on save.
Marking a stage **Done** advances `current_stage` to the next.
Marking a stage **Blocked** sends a warning notification to planners.
When all 7 stages are Done, the line status becomes `LIVREE`.

---

## API Reference

| URL | Description |
|---|---|
| `GET /api/schema/swagger-ui/` | Interactive Swagger UI |
| `GET /api/schema/redoc/` | ReDoc documentation |
| `GET /api/schema/` | Raw OpenAPI 3 JSON |
| `POST /api/auth/login` | Obtain JWT tokens |
| `POST /api/auth/refresh` | Rotate access token |
| `POST /api/auth/logout` | Blacklist refresh token |
| `GET /api/users/me/` | Current user profile |
| `GET /api/orders/` | List orders (filterable) |
| `GET /api/dashboards/op/` | KPI counters |
| `GET /api/dashboards/load/` | Stage load data |
| `GET /api/exports/op.xlsx` | Export OP Excel |
| `GET /api/audit/` | Audit log (admin only) |  
| `GET /api/planning/weekly/?weeks=N` | Weekly capacity forecast (lines due per stage per week) |
| `GET /api/planning/gantt/?stage=CNC&limit=50` | Gantt data for order lines with full stage event timeline |
| `POST /api/planning/reorder/` | Persist drag-and-drop queue order `{stage_code, line_ids}` |

---

## Role Permissions

| Role | Can do |
|---|---|
| `admin` | Everything, user management, settings |
| `planner` | Create/edit orders, export, planning view |
| `designer` | CAD queue actions |
| `programmer` | CAM queue actions |
| `operator` | CNC queue actions |
| `assembly` | MTG queue actions |
| `qc` | QF queue actions |
| `client` | Read-only: orders and articles |

---

## Production Deployment

```bash
cp .env.example .env
# Set: SECRET_KEY, POSTGRES_PASSWORD, REDIS_URL, ALLOWED_HOSTS, DEBUG=False

docker-compose -f docker-compose.prod.yml up -d --build
docker-compose -f docker-compose.prod.yml exec web python manage.py migrate
docker-compose -f docker-compose.prod.yml exec web python manage.py collectstatic --noinput
docker-compose -f docker-compose.prod.yml exec web python manage.py seed_demo
```

### Recommended `.env` settings for production

```env
DEBUG=False
SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_hex(50))">
ALLOWED_HOSTS=192.168.1.100,erp.hacint.local
POSTGRES_DB=megaindus
POSTGRES_USER=megaindus
POSTGRES_PASSWORD=<strong-password>
REDIS_URL=redis://redis:6379/0
CELERY_TIMEZONE=Africa/Casablanca
```

---

## Backup & Restore

**Daily database backup:**
```bash
docker-compose exec db pg_dump -U megaindus megaindus > backup_$(date +%Y%m%d).sql
```

**Media files backup:**
```bash
docker run --rm \
  -v megaindus_erp_media:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/media_$(date +%Y%m%d).tar.gz /data
```

**Restore database:**
```bash
docker-compose exec -T db psql -U megaindus megaindus < backup_20260101.sql
```

**Automate with cron (host machine):**
```cron
0 2 * * * cd /opt/megaindus_erp && docker-compose exec -T db pg_dump -U megaindus megaindus > /backups/db_$(date +\%Y\%m\%d).sql
5 2 * * * cd /opt/megaindus_erp && docker run --rm -v megaindus_erp_media:/data -v /backups:/backup alpine tar czf /backup/media_$(date +\%Y\%m\%d).tar.gz /data
```

---

## Project Phases

| Phase | Status | Scope |
|---|---|---|
| 0 — Bootstrap | ✅ Done | Docker, CI, JWT auth scaffold, login screen |
| 1 — Core | ✅ Done | Catalog, Orders, Stages, Dashboard, Importer, PDF, Excel export |
| 2 — Polish | ✅ Done | Notifications, Celery tasks, audit log, profile, user management, settings, PWA |
| 3 — Planning | ✅ Done | Weekly capacity forecast, Gantt chart (`/gantt`), drag-and-drop queue reorder |
| 4 — Machine link | ⏳ Open | OPC-UA / Fanuc Focas real-time connector |

---

## Development Notes

- **Circular migration dependency** between `production` and `orders` is resolved by splitting into 3 migrations: `production/0001` (Stage) → `orders/0001` (OrderLine + FK to Stage) → `production/0002` (StageEvent + FK to OrderLine).
- **Django signals** are wired in each app's `AppConfig.ready()` via a `_connect_signals()` helper to avoid `AppRegistryNotReady` errors from circular imports.
- **Rate limiting**: login and token-refresh endpoints are throttled at 20 req/min via a custom `AuthThrottle` class.
- **Structured logging**: set `LOG_FORMAT=json` in `.env` to switch from human-readable to JSON logs (useful for log aggregators).




Technical Study

he need to input the project that he receve and in this project there a lot of orders and in this orders he need to inter the apn and specification for each apn and if he have the echentillant
tool he need is upload data in excel and export it to excel 
in his table in need create project and upload data from  excel of order  and apn  or input by him self he need 3 type of upload excel uplad project and order and apn 

Designer 

he need to see oreder in the order he need to see date and from what project this order .when he inter a order he need to see all the apn in this order with praority and specification and if he have echentillant when his select a number of apn he send it to queue to the oder design now that sertant apn work by the other design after he inter the queue page he should see the apn he select and after inter to apn page he should see check box to if he finsh apn and remarque if he need to  and upload a pdf file of what he input and should be atach to this apn drag and drop

the programer 

he need to see just of a table of finish apn from designer and select a apn to  queue like design 
when he inter apn in queue page he need to see remarque from designer and check box if he finish and he can upload pdf and programes (g code ) and to be drag and drop he input and should be atach to this apn

cnc
he need to see just the apn that programer finish
select a apn to  queue like design 
when he inter apn in queue page he need to see remarque from programer

ect all the other like that 