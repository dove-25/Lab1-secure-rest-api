# Lab 1 Report Workflow and Evidence Checklist

## Phase A - Secure API

1. Confirm the stack: Node.js, Express, SQLite, bcrypt, JWT, GitHub Actions.
2. Install dependencies and record the Node.js/npm versions.
3. Initialize the database with one demo user whose password is hashed.
4. Implement and test `POST /auth/login`.
5. Implement JWT middleware.
6. Implement protected `GET /api/data`.
7. Implement protected `GET /api/profile`; derive the user ID from the verified JWT.
8. Add validation, prepared statements, JSON responses, and security headers.
9. Run unit/integration tests and save the output as evidence.
10. Push the repository and verify the GitHub Actions run.

## Phase B - CVE-2023-46604

1. Install Docker Desktop and verify `docker --version` and `docker compose version`.
2. Obtain the Vulhub directory `activemq/CVE-2023-46604`.
3. Start the vulnerable ActiveMQ 5.17.3 container locally.
4. Capture the running container and the management page.
5. Reproduce the controlled PoC that creates only a marker file inside the container.
6. Capture the pre-fix result and record commands, ports, and timestamps.
7. Analyze the OpenWire deserialization root cause using the CVE and vendor advisory.
8. Apply the selected fixed version/configuration.
9. Rebuild the environment and repeat the same test.
10. Capture exploit failure and verify that the normal service remains available.

## Screenshot rules

The assistant can provide command output, API responses, and generated test artifacts. The student should manually capture screenshots of the GitHub Actions web page, Docker Desktop/terminal state, and any personal or account-specific screens. Never include passwords, private tokens, or unredacted personal information.

## Resource assessment

The API is lightweight and needs only a small Node.js process and SQLite file. The CVE stage uses one ActiveMQ container and a temporary local HTTP server for the controlled PoC. It should be run sequentially and stopped after evidence collection. A practical minimum is 4 GB free memory and several GB of disk space for Docker images and npm dependencies.
