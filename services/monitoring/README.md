Monitoring stack
----------------

This project now includes a Prometheus + Grafana monitoring stack provisioned under `deploy/`.

What is included
- Prometheus config: `deploy/prometheus/prometheus.yml` (scrapes `app:9090` and `prometheus`).
- Grafana provisioning: `deploy/grafana/provisioning/` with datasources for Prometheus, Postgres `db`, and TimescaleDB.
- Grafana dashboards folder: `deploy/grafana/dashboards/` for JSON dashboard files.

Dev usage

1. Start the dev stack (Grafana on localhost:3000, Prometheus on localhost:9090):

```bash
docker-compose -f deploy/docker-compose.dev.yml up --build
```

2. Open Grafana: http://localhost:3000 (user: `admin`, password: `admin`)

3. The Grafana datasources are auto-provisioned and include:
   - Prometheus (http://prometheus:9090)
   - PostgresUsers (connects to `db:5432`, DB `leetdb`)
   - Timescale (connects to `timescaledb:5432`, DB `news_bets_db`)

Database viewer

Use Grafana's Explore or Table panels with the Postgres/TImescale datasources to inspect schemas, run SQL queries, and build dashboards.

Traffic monitor admin endpoint

A simple React component `web/src/components/Admin/Monitoring.jsx` was added that embeds Grafana via an iframe. In dev the component can point to `http://localhost:3000` via `REACT_APP_GRAFANA_URL`.

To implement a richer in-app traffic monitor, expose Prometheus metrics from the Go `app` at `/metrics` and create Grafana dashboards that visualize request rates, latencies, and response codes.
