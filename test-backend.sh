#!/bin/bash

# Backend Health Check Script
# Tests if the backend is working correctly

BACKEND_URL="https://genzwinners-backend.vercel.app"
FRONTEND_URL="https://www.tortrose.com"

echo "🔍 Testing Backend Deployment..."
echo "================================"
echo ""

# Test 1: Health Check
echo "Test 1: Health Check Endpoint"
echo "URL: $BACKEND_URL/health"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/health")
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HEALTH_CODE" = "200" ]; then
  echo "✅ Health check passed (200 OK)"
  echo "Response: $HEALTH_BODY"
else
  echo "❌ Health check failed (HTTP $HEALTH_CODE)"
  echo "Response: $HEALTH_BODY"
fi
echo ""

# Test 2: Root Endpoint
echo "Test 2: Root Endpoint"
echo "URL: $BACKEND_URL/"
ROOT_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/")
ROOT_CODE=$(echo "$ROOT_RESPONSE" | tail -n1)
ROOT_BODY=$(echo "$ROOT_RESPONSE" | head -n-1)

if [ "$ROOT_CODE" = "200" ]; then
  echo "✅ Root endpoint passed (200 OK)"
  echo "Response: $ROOT_BODY"
else
  echo "❌ Root endpoint failed (HTTP $ROOT_CODE)"
  echo "Response: $ROOT_BODY"
fi
echo ""

# Test 3: Products API
echo "Test 3: Products API"
echo "URL: $BACKEND_URL/api/products/get-products?priceRange=0,5000"
PRODUCTS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/api/products/get-products?priceRange=0,5000")
PRODUCTS_CODE=$(echo "$PRODUCTS_RESPONSE" | tail -n1)
PRODUCTS_BODY=$(echo "$PRODUCTS_RESPONSE" | head -n-1)

if [ "$PRODUCTS_CODE" = "200" ]; then
  echo "✅ Products API passed (200 OK)"
  echo "Response preview: $(echo "$PRODUCTS_BODY" | head -c 200)..."
else
  echo "❌ Products API failed (HTTP $PRODUCTS_CODE)"
  echo "Response: $PRODUCTS_BODY"
fi
echo ""

# Test 4: CORS Preflight
echo "Test 4: CORS Preflight (OPTIONS)"
echo "URL: $BACKEND_URL/api/products/get-products"
CORS_RESPONSE=$(curl -s -i -X OPTIONS \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  "$BACKEND_URL/api/products/get-products")

if echo "$CORS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
  echo "✅ CORS headers present"
  echo "$CORS_RESPONSE" | grep "Access-Control"
else
  echo "❌ CORS headers missing"
  echo "Response headers:"
  echo "$CORS_RESPONSE" | head -n 20
fi
echo ""

# Test 5: CORS with Origin
echo "Test 5: GET Request with Origin Header"
echo "URL: $BACKEND_URL/api/products/get-products?priceRange=0,5000"
CORS_GET_RESPONSE=$(curl -s -i \
  -H "Origin: $FRONTEND_URL" \
  "$BACKEND_URL/api/products/get-products?priceRange=0,5000")

if echo "$CORS_GET_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
  echo "✅ CORS headers present in GET response"
  echo "$CORS_GET_RESPONSE" | grep "Access-Control"
else
  echo "❌ CORS headers missing in GET response"
fi
echo ""

# Summary
echo "================================"
echo "📊 Test Summary"
echo "================================"

PASSED=0
FAILED=0

[ "$HEALTH_CODE" = "200" ] && ((PASSED++)) || ((FAILED++))
[ "$ROOT_CODE" = "200" ] && ((PASSED++)) || ((FAILED++))
[ "$PRODUCTS_CODE" = "200" ] && ((PASSED++)) || ((FAILED++))

echo "✅ Passed: $PASSED"
echo "❌ Failed: $FAILED"
echo ""

if [ "$FAILED" -gt 0 ]; then
  echo "⚠️  Some tests failed. Check the following:"
  echo "   1. Are environment variables set on Vercel?"
  echo "   2. Is the database connection working?"
  echo "   3. Check Vercel logs for errors"
  echo ""
  echo "📝 See DEPLOYMENT_CHECKLIST.md for detailed steps"
  exit 1
else
  echo "🎉 All tests passed! Backend is working correctly."
  echo ""
  echo "Next steps:"
  echo "   1. Test frontend at: $FRONTEND_URL"
  echo "   2. Check browser console for errors"
  echo "   3. Verify products load on homepage"
  exit 0
fi
