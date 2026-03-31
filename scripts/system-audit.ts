// [JAVARI-FIX] .github/workflows/e2e-tests.yml
name: Henderson Standards E2E Tests

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  e2e-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_USER: user
          POSTGRES_PASSWORD: password
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U user"
          --health-interval 5s
          --health-timeout 3s
          --health-retries 5

    steps:
      - name: Checkout code
        uses: actions/checkout@v2

      - name: Set up Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '14'

      - name: Install dependencies
        run: npm install

      - name: Run database migrations
        run: npm run migrate

      - name: Start application
        run: npm start &
      
      - name: Wait for application to start
        run: |
          while ! curl -s http://localhost:3000; do
            echo "Waiting for application to start..."
            sleep 5
          done

      - name: Run E2E tests
        run: npm run e2e-tests
        env:
          DATABASE_URL: postgres://user:password@localhost:5432/test_db
          NODE_ENV: test

      - name: Stop application
        run: kill $(jobs -p) || true