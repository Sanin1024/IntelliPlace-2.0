#!/bin/bash
# Challenge 325: Post-deployment smoke test
# Verifies critical functionality after deployment

BASE_URL="${1:-http://localhost:4000/api}"
FRONTEND_URL="${2:-http://localhost:5173}"

echo "🧪 Running smoke tests against $BASE_URL..."
FAILURES=0

# 1. Backend health check
echo -n "1. Backend health... "
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
if [ "$HEALTH" = "200" ]; then
  echo "✅ OK"
else
  echo "❌ FAIL ($HEALTH)"
  FAILURES=$((FAILURES + 1))
fi

# 2. Frontend available
echo -n "2. Frontend available... "
FE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$FE" = "200" ]; then
  echo "✅ OK"
else
  echo "❌ FAIL ($FE)"
  FAILURES=$((FAILURES + 1))
fi

# 3. Auth endpoint available
echo -n "3. Auth endpoint... "
AUTH=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d '{"email":"nonexistent@test.com","password":"wrong"}')
if [ "$AUTH" = "401" ] || [ "$AUTH" = "400" ]; then
  echo "✅ OK"
else
  echo "❌ FAIL ($AUTH)"
  FAILURES=$((FAILURES + 1))
fi

# 4. Protected endpoint requires auth
echo -n "4. Protected endpoint requires auth... "
PROTECTED=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/auth/me")
if [ "$PROTECTED" = "401" ]; then
  echo "✅ OK"
else
  echo "❌ FAIL ($PROTECTED)"
  FAILURES=$((FAILURES + 1))
fi

# 5. Database connectivity (via health endpoint)
echo -n "5. Database connectivity... "
DB_CHECK=$(curl -s "$BASE_URL/health" | grep -o '"status":"ok"')
if [ -n "$DB_CHECK" ]; then
  echo "✅ OK"
else
  echo "❌ FAIL"
  FAILURES=$((FAILURES + 1))
fi

echo ""
echo "==================================="
if [ "$FAILURES" -eq 0 ]; then
  echo "✅ All smoke tests passed!"
  exit 0
else
  echo "❌ $FAILURES smoke test(s) failed!"
  exit 1
fi

