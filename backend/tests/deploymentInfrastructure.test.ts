// Challenges 296–310: Deployment & Infrastructure Test Suite
import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Deployment & Infrastructure: Challenges 296–310 Suite', async (t) => {
  const backendDir = process.cwd();
  const rootDir = path.resolve(backendDir, '..');

  // ============================================================
  // Challenge 296, 297, 299, 300, 308, 309: docker-compose.yml
  // ============================================================
  await t.test('Challenge 296/297/299/300/308/309: docker-compose configuration contains all required services, healthchecks, networks, volumes, and logging limits', () => {
    const composePath = path.resolve(rootDir, 'docker-compose.yml');
    assert.ok(fs.existsSync(composePath), 'docker-compose.yml must exist at repository root');

    const content = fs.readFileSync(composePath, 'utf8');

    // Challenge 296 & 299: DB healthcheck and service dependencies
    assert.ok(content.includes('db:'), 'docker-compose must declare db service');
    assert.ok(content.includes('pg_isready'), 'db service must include pg_isready healthcheck');
    assert.ok(content.includes('condition: service_healthy'), 'backend must depend on db with condition: service_healthy');

    // Challenge 297: Inter-container network
    assert.ok(content.includes('intelliplace-net:'), 'docker-compose must define bridge network intelliplace-net');
    assert.ok(content.includes('networks:'), 'services must be attached to network');

    // Challenge 300: Centralized ports
    assert.ok(content.includes('5432:5432'), 'Postgres port 5432 must be configured');
    assert.ok(content.includes('4000:4000'), 'Backend port 4000 must be configured');
    assert.ok(content.includes('5173:80'), 'Frontend port 5173 to container 80 must be mapped');

    // Challenge 308: Log rotation
    assert.ok(content.includes('driver: "json-file"') || content.includes("driver: 'json-file'"), 'json-file logging must be used');
    assert.ok(content.includes('max-size: "10m"') || content.includes("max-size: '10m'"), 'Log max-size must be configured');
    assert.ok(content.includes('max-file: "3"') || content.includes("max-file: '3'"), 'Log max-file retention must be configured');

    // Challenge 309: Named persistent volumes
    assert.ok(content.includes('pgdata:'), 'Named volume pgdata must be defined');
    assert.ok(content.includes('uploads:'), 'Named volume uploads must be defined');
  });

  // ============================================================
  // Challenge 296, 301, 305: Backend Dockerfile
  // ============================================================
  await t.test('Challenge 296/301/305: Backend Dockerfile enforces multi-stage builds, deterministic npm ci, and safe migrations', () => {
    const dockerfilePath = path.resolve(backendDir, 'Dockerfile');
    assert.ok(fs.existsSync(dockerfilePath), 'backend/Dockerfile must exist');

    const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');

    // Challenge 305: Deterministic installs with npm ci
    assert.ok(dockerfile.includes('npm ci'), 'Backend Dockerfile must use npm ci');

    // Challenge 301: Safe production migration execution before starting node
    assert.ok(dockerfile.includes('npx prisma migrate deploy'), 'Backend Dockerfile must execute prisma migrate deploy');
    assert.ok(dockerfile.includes('node dist/app.js'), 'Backend Dockerfile must start compiled dist/app.js');

    // Multi-stage architecture
    assert.ok(dockerfile.includes('FROM node:18-alpine AS build') || dockerfile.includes('AS build'), 'Must use multi-stage build stage');
    assert.ok(dockerfile.includes('EXPOSE 4000'), 'Backend must expose port 4000');
  });

  // ============================================================
  // Challenge 297, 302: Frontend Dockerfile & Nginx Configuration
  // ============================================================
  await t.test('Challenge 297/302: Frontend Dockerfile and Nginx proxy handle SPA routing and CORS elimination', () => {
    const dockerfilePath = path.resolve(rootDir, 'frontend/Dockerfile');
    const nginxConfPath = path.resolve(rootDir, 'frontend/nginx.conf');

    assert.ok(fs.existsSync(dockerfilePath), 'frontend/Dockerfile must exist');
    assert.ok(fs.existsSync(nginxConfPath), 'frontend/nginx.conf must exist');

    const dockerfile = fs.readFileSync(dockerfilePath, 'utf8');
    assert.ok(dockerfile.includes('ARG VITE_API_URL'), 'Frontend Dockerfile must accept ARG VITE_API_URL');
    assert.ok(dockerfile.includes('FROM nginx:alpine') || dockerfile.includes('nginx:alpine'), 'Production stage must use nginx:alpine');

    const nginxConf = fs.readFileSync(nginxConfPath, 'utf8');
    // Challenge 297: API reverse proxy
    assert.ok(nginxConf.includes('proxy_pass http://backend:4000/api/;'), 'Nginx must reverse proxy /api/ to backend:4000');
    assert.ok(nginxConf.includes('proxy_set_header Host $host;'), 'Nginx proxy must preserve Host header');
    assert.ok(nginxConf.includes('proxy_set_header X-Real-IP $remote_addr;'), 'Nginx proxy must forward X-Real-IP');

    // Challenge 302: SPA routing fallback
    assert.ok(nginxConf.includes('try_files $uri $uri/ /index.html;'), 'Nginx must provide SPA try_files fallback');
  });

  // ============================================================
  // Challenge 303 & 304: Production SSL & Domain Configuration
  // ============================================================
  await t.test('Challenge 303/304: Production Nginx SSL template enforces HTTPS redirect, modern TLS, and secure certificates', () => {
    const sslConfPath = path.resolve(rootDir, 'deploy/nginx-production.conf.example');
    assert.ok(fs.existsSync(sslConfPath), 'deploy/nginx-production.conf.example must exist');

    const sslConf = fs.readFileSync(sslConfPath, 'utf8');
    assert.ok(sslConf.includes('return 301 https://$host$request_uri;'), 'Must enforce HTTP to HTTPS 301 redirect');
    assert.ok(sslConf.includes('listen 443 ssl'), 'Must listen on port 443 with SSL');
    assert.ok(sslConf.includes('ssl_protocols TLSv1.2 TLSv1.3;'), 'Must configure modern TLSv1.2 and TLSv1.3 protocols');
    assert.ok(sslConf.includes('letsencrypt'), 'Must configure Let\'s Encrypt certificate paths');
  });

  // ============================================================
  // Challenge 298: Environment Configuration Template
  // ============================================================
  await t.test('Challenge 298: Root environment template specifies required production environment keys', () => {
    const envExamplePath = path.resolve(rootDir, '.env.example');
    assert.ok(fs.existsSync(envExamplePath), '.env.example must exist at root');

    const envContent = fs.readFileSync(envExamplePath, 'utf8');
    assert.ok(envContent.includes('DB_USER='), '.env.example must declare DB_USER');
    assert.ok(envContent.includes('DB_PASS='), '.env.example must declare DB_PASS');
    assert.ok(envContent.includes('DB_NAME='), '.env.example must declare DB_NAME');
    assert.ok(envContent.includes('JWT_SECRET='), '.env.example must declare JWT_SECRET');
  });

  // ============================================================
  // Challenge 306 & 310: Rolling Deployment Automation Script
  // ============================================================
  await t.test('Challenge 306/310: deploy/update.sh executes safe zero-downtime rolling updates', () => {
    const updateScriptPath = path.resolve(rootDir, 'deploy/update.sh');
    assert.ok(fs.existsSync(updateScriptPath), 'deploy/update.sh must exist');

    const script = fs.readFileSync(updateScriptPath, 'utf8');
    assert.ok(script.includes('prisma migrate deploy'), 'Deployment script must run migrations in temporary container');
    assert.ok(script.includes('--no-deps'), 'Deployment script must recreate containers with zero-downtime --no-deps');
    assert.ok(script.includes('docker-compose up -d'), 'Deployment script must start containers detached');
  });

  // ============================================================
  // Challenge 308: Disk Space Management & Image Cleanup Script
  // ============================================================
  await t.test('Challenge 308: deploy/cleanup.sh preserves persistent volumes while purging dangling images and cache', () => {
    const cleanupScriptPath = path.resolve(rootDir, 'deploy/cleanup.sh');
    assert.ok(fs.existsSync(cleanupScriptPath), 'deploy/cleanup.sh must exist');

    const script = fs.readFileSync(cleanupScriptPath, 'utf8');
    assert.ok(script.includes('docker image prune'), 'Cleanup script must prune dangling images');
    assert.ok(script.includes('docker container prune'), 'Cleanup script must prune stopped containers');
    assert.ok(script.includes('docker builder prune'), 'Cleanup script must prune build cache');
    assert.ok(
      script.includes('Volumes preserved') || script.includes('Volumes are preserved') || !script.includes('docker volume prune -f'),
      'Cleanup script must protect database and upload volumes from accidental deletion'
    );
  });

  // ============================================================
  // Challenge 306, 310: Infrastructure Smoke Test Script
  // ============================================================
  await t.test('Challenge 306/310: tests/infra_test.sh validates health endpoints and compose configuration', () => {
    const infraTestPath = path.resolve(rootDir, 'tests/infra_test.sh');
    assert.ok(fs.existsSync(infraTestPath), 'tests/infra_test.sh must exist');

    const script = fs.readFileSync(infraTestPath, 'utf8');
    assert.ok(script.includes('docker-compose config'), 'Infra test must validate docker-compose syntax');
    assert.ok(script.includes('curl'), 'Infra test must probe health endpoints');
    assert.ok(script.includes('/api/health'), 'Infra test must verify /api/health endpoint');
  });
});

