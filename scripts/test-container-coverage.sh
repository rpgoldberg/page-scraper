#!/bin/bash

# Page Scraper - Containerized Testing with Coverage Extraction
# Runs tests in Docker container and extracts coverage reports for review

set -e

echo "🧪 Running Page Scraper tests with coverage extraction..."

# Create local directories for output
mkdir -p ./test-results/coverage
mkdir -p ./test-results/reports

# Build the test container using test Dockerfile
echo "📦 Building test container..."
docker build -f Dockerfile.test -t scraper-test .

# Run tests with volume mounts to extract results
echo "🔬 Executing tests..."
docker run --rm \
  -v $(pwd)/test-results/coverage:/app/test-output/coverage \
  -v $(pwd)/test-results/reports:/app/test-output/reports \
  -e NODE_ENV=test \
  scraper-test sh -c "
    echo 'Starting page scraper tests...' &&
    npm run test:coverage &&
    echo 'Copying coverage data...' &&
    mkdir -p /app/test-output &&
    cp -r coverage/* /app/test-output/coverage/ 2>/dev/null || true &&
    echo 'Copying test results...' &&
    cp test-results.xml /app/test-output/reports/ 2>/dev/null || true &&
    echo 'Test execution completed!'
  "

echo ""
echo "✅ Page Scraper tests completed!"
echo ""
echo "📊 Coverage report available at: ./test-results/coverage/lcov-report/index.html"
echo "📋 Test results available at: ./test-results/reports/"
echo ""
echo "🌐 To view coverage report:"
echo "  xdg-open ./test-results/coverage/lcov-report/index.html"
echo ""

# Try to open coverage report automatically (if in desktop environment)
if command -v xdg-open &> /dev/null && [ -n "$DISPLAY" ]; then
    echo "🔗 Opening coverage report..."
    xdg-open ./test-results/coverage/lcov-report/index.html 2>/dev/null || true
fi