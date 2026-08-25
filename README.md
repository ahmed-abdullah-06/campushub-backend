# CampusHub API Backend

CampusHub is a full-stack platform designed for university students to manage lost items, trade marketplace goods, exchange skills, and explore campus events. This directory contains the Node.js/Express REST API powering the system.

---

## Tech Stack & Features

* **Runtime:** Node.js (ES Modules)
* **Framework:** Express.js
* **Database:** MongoDB Atlas via Mongoose ODM
* **Auth:** JWT (JSON Web Tokens) & bcrypt password hashing
* **Documentation:** Swagger UI (`swagger-ui-express` / `swagger-jsdoc`)
* **DevOps & Security:** Docker, Husky pre-commit hooks, Secretlint, Jest/Supertest

---

## Environment Setup

Create a `.env` file in the root of the `backend/` folder based on `.env.example`:

```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/campushub?retryWrites=true&w=majority
JWT_SECRET=super_secret_jwt_key
CLIENT_URL=http://localhost:5173
```

---

## Local Development Setup

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

The backend will connect to MongoDB Atlas and start listening on `http://localhost:5000`.

### API Documentation

Access the interactive Swagger documentation UI at:

```
http://localhost:5000/api/docs
```

### Docker Execution

To build and run the backend inside a Docker container:

```bash
docker compose up --build
```

---

## API Routes Overview

* `POST /api/auth/register` – Register a new user
* `POST /api/auth/login` – Authenticate user and receive JWT
* `GET /api/lost-found` – List all lost & found posts (supports `type`, `category`, `search` filters)
* `POST /api/lost-found` – Create lost/found listing (Protected)
* `GET /api/marketplace` – List marketplace items (supports `category`, `status`, `search` filters)
* `POST /api/marketplace` – Create marketplace listing (Protected)