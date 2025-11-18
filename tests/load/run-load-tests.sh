#!/bin/bash
# Performance & Scaling Agent - Task PERF-004
# Load Testing Runner Script
#
# Usage:
#   ./tests/load/run-load-tests.sh [test-type] [base-url] [auth-token]
#
# Examples:
#   ./tests/load/run-load-tests.sh load
#   ./tests/load/run-load-tests.sh stress https://staging.clearway.com
#   ./tests/load/run-load-tests.sh all https://clearway.com YOUR_TOKEN

set -e

# Configuration
TEST_TYPE=${1:-load}
BASE_URL=${2:-http://localhost:3000}
AUTH_TOKEN=${3:-test-token}

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${RED}Error: k6 is not installed${NC}"
    echo "Install k6: https://k6.io/docs/get-started/installation/"
    exit 1
fi

echo -e "${GREEN}Starting K6 Load Tests${NC}"
echo "Test Type: $TEST_TYPE"
echo "Base URL: $BASE_URL"
echo "-----------------------------------"

# Create results directory
RESULTS_DIR="tests/load/results"
mkdir -p "$RESULTS_DIR"

# Timestamp for results
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Function to run a test
run_test() {
    local test_name=$1
    local test_file=$2

    echo -e "${YELLOW}Running $test_name...${NC}"

    k6 run \
        --out json="$RESULTS_DIR/${test_name}_${TIMESTAMP}.json" \
        --out csv="$RESULTS_DIR/${test_name}_${TIMESTAMP}.csv" \
        -e BASE_URL="$BASE_URL" \
        -e AUTH_TOKEN="$AUTH_TOKEN" \
        "$test_file"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $test_name completed successfully${NC}"
    else
        echo -e "${RED}✗ $test_name failed${NC}"
        exit 1
    fi

    echo "-----------------------------------"
}

# Run tests based on type
case $TEST_TYPE in
    load)
        run_test "load-test" "tests/load/k6-capital-calls.js"
        ;;

    stress)
        run_test "stress-test" "tests/load/k6-stress-test.js"
        ;;

    spike)
        run_test "spike-test" "tests/load/k6-spike-test.js"
        ;;

    soak)
        echo -e "${YELLOW}Warning: Soak test will run for 2+ hours${NC}"
        read -p "Continue? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            run_test "soak-test" "tests/load/k6-soak-test.js"
        fi
        ;;

    all)
        run_test "load-test" "tests/load/k6-capital-calls.js"
        run_test "stress-test" "tests/load/k6-stress-test.js"
        run_test "spike-test" "tests/load/k6-spike-test.js"

        echo -e "${YELLOW}Skipping soak test (too long). Run separately with: ./run-load-tests.sh soak${NC}"
        ;;

    *)
        echo -e "${RED}Unknown test type: $TEST_TYPE${NC}"
        echo "Valid types: load, stress, spike, soak, all"
        exit 1
        ;;
esac

echo -e "${GREEN}All tests completed!${NC}"
echo "Results saved to: $RESULTS_DIR"
