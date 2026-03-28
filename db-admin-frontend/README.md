# OmniPanel

An in-app database admin panel built with **Spring Boot 3.5 + MyBatis-Plus** (backend) and **React + Vite** (frontend).

---

## Project Structure

```
db-admin-backend/   ← Spring Boot 3.5, Java 21, MyBatis-Plus, MariaDB
db-admin-frontend/  ← React 18, Vite 6, Axios
```

---

## Backend Setup

### 1. Configure your database

Edit `src/main/resources/application.yml`:

```yaml
spring:
  datasource:
    url: jdbc:mariadb://localhost:3306/YOUR_DATABASE
    username: YOUR_USERNAME
    password: YOUR_PASSWORD
```

### 2. (Optional) Block sensitive tables

```yaml
db-admin:
  blocked-tables:
    - flyway_schema_history
    - your_sensitive_table
  max-page-size: 200
```

### 3. Run

```bash
cd db-admin-backend
mvn spring-boot:run
# Server starts on http://localhost:8080
```

---

## Frontend Setup

### 1. Install dependencies

```bash
cd db-admin-frontend
npm install
```

### 2. Start dev server

```bash
npm run dev
# Opens on http://localhost:3000
# /api calls are proxied to http://localhost:8080
```

### 3. Production build

```bash
npm run build
# Output in dist/
# Copy dist/ contents into Spring Boot's src/main/resources/static/
# to serve the whole app from a single JAR
```

---

## API Reference

| Method   | Endpoint                              | Description                     |
|----------|---------------------------------------|---------------------------------|
| `GET`    | `/api/admin/db/tables`                | List all tables                 |
| `GET`    | `/api/admin/db/tables/:t/schema`      | Column definitions              |
| `GET`    | `/api/admin/db/tables/:t/rows`        | Paginated rows + search         |
| `POST`   | `/api/admin/db/tables/:t/rows`        | Insert a row                    |
| `PUT`    | `/api/admin/db/tables/:t/rows/:pk`    | Update a row by PK              |
| `DELETE` | `/api/admin/db/tables/:t/rows/:pk`    | Delete a row by PK              |

**Query params for rows:** `page`, `pageSize`, `search`

**Request body for insert/update:**
```json
{
  "data": {
    "column_name": "value",
    "another_col": "value"
  }
}
```

---

## Serving Frontend from Spring Boot (Production)

```bash
# In db-admin-frontend/
npm run build

# Copy build output into backend static resources
cp -r dist/* ../db-admin-backend/src/main/resources/static/
```

Then access the panel at `http://localhost:8080` after running the backend JAR.

---

## Security Note

This panel has **no authentication** by design (as requested). Before deploying:
- Add Spring Security with JWT or session-based auth
- Restrict `/api/admin/**` to admin roles only
- Consider IP allowlisting for the admin routes
