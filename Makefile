.PHONY: up down build migrate seed import test lint shell logs ps collectstatic

COMPOSE = docker-compose
EXEC_WEB = $(COMPOSE) exec web
FILE ?= Order_Traking_APTIV_HACINT_2026_V2.xlsx

up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

build:
	$(COMPOSE) build

migrate:
	$(EXEC_WEB) python manage.py migrate

seed:
	$(EXEC_WEB) python manage.py seed_demo

import:
	$(EXEC_WEB) python manage.py import_legacy_op /data/$(FILE)
	$(EXEC_WEB) python manage.py rebuild_current_stage

test:
	$(EXEC_WEB) pytest --cov=apps --cov-report=term-missing -v

lint:
	$(EXEC_WEB) ruff check .
	$(EXEC_WEB) black --check .
	$(COMPOSE) exec frontend npm run lint

format:
	$(EXEC_WEB) ruff check --fix .
	$(EXEC_WEB) black .
	$(COMPOSE) exec frontend npm run format

shell:
	$(EXEC_WEB) python manage.py shell

dbshell:
	$(COMPOSE) exec db psql -U $${POSTGRES_USER:-megaindus} $${POSTGRES_DB:-megaindus}

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

collectstatic:
	$(EXEC_WEB) python manage.py collectstatic --noinput

makemigrations:
	$(EXEC_WEB) python manage.py makemigrations

superuser:
	$(EXEC_WEB) python manage.py createsuperuser
