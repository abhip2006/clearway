#!/bin/bash

# Android Play Store Submission Script for Clearway Mobile

set -e

echo "🤖 Starting Android Play Store submission..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Clearway"
PACKAGE_NAME="com.clearway.mobile"
AAB_PATH="build/Clearway.aab"

# Check for service account key
if [ ! -f "./google-play-service-account.json" ]; then
  echo -e "${RED}Error: google-play-service-account.json not found${NC}"
  echo "Please place your Google Play service account key in the root directory"
  exit 1
fi

# Step 1: Build the app using EAS
echo -e "${YELLOW}Step 1: Building Android app with EAS...${NC}"
eas build --platform android --profile production --non-interactive

# Step 2: Wait for build to complete
echo -e "${YELLOW}Step 2: Waiting for build to complete...${NC}"
# EAS will handle this automatically

# Step 3: Download the AAB
echo -e "${YELLOW}Step 3: Downloading AAB...${NC}"
# EAS build download is automatic

# Step 4: Analyze bundle size
echo -e "${YELLOW}Step 4: Analyzing bundle...${NC}"
if [ -f "$AAB_PATH" ]; then
  bundletool build-apks \
    --bundle="$AAB_PATH" \
    --output="build/Clearway.apks" \
    --mode=universal

  bundletool get-size total \
    --apks="build/Clearway.apks"
else
  echo -e "${RED}Error: AAB file not found at $AAB_PATH${NC}"
  exit 1
fi

# Step 5: Submit to Play Store using EAS Submit
echo -e "${YELLOW}Step 5: Submitting to Google Play Store...${NC}"
eas submit --platform android --latest

echo -e "${GREEN}✅ Upload complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Go to Google Play Console"
echo "  2. Review the release in Internal Testing track"
echo "  3. Promote to production when ready"
echo "  4. Fill in release notes and store listing"

echo -e "${GREEN}🎉 Android submission process complete!${NC}"
