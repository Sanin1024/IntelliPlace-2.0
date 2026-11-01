/**
 * IntelliPlace k6 Load Testing Script
 * Challenge 293: Load testing API endpoints under simulated concurrent traffic
 * Challenge 295: Performance validation with p(95) < 500ms threshold
 *
 * Usage:
 *   k6 run backend/tests/loadTest.k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 20 },  // Ramp-up to 20 virtual users
    { duration: '30s', target: 50 },  // Steady state at 50 virtual users
    { duration: '10s', target: 0 },   // Graceful ramp-down
  ],
  thresholds: {
    // 95% of requests must complete below 500ms (Challenge 295)
    http_req_duration: ['p(95)<500'],
    // Error rate must be less than 1%
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:5000/api';

export default function () {
  // 1. Health check probe
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check returns status ok': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status === 'ok';
      } catch {
        return false;
      }
    },
  });

  // 2. Authentication load
  const payload = JSON.stringify({
    email: 'student1@intelliplace.edu',
    password: 'Password@123',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  const loginRes = http.post(`${BASE_URL}/auth/login`, payload, params);
  check(loginRes, {
    'login responded with status 200 or 401': (r) => [200, 401].includes(r.status),
  });

  sleep(1);
}

