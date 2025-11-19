#!/bin/bash

# iOS App Store Submission Script for Clearway Mobile

set -e

echo "📱 Starting iOS App Store submission..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Clearway"
BUNDLE_ID="com.clearway.mobile"
IPA_PATH="build/Clearway.ipa"

# Check environment variables
if [ -z "$APP_STORE_EMAIL" ] || [ -z "$APP_STORE_PASSWORD" ]; then
  echo -e "${RED}Error: APP_STORE_EMAIL and APP_STORE_PASSWORD must be set${NC}"
  exit 1
fi

# Step 1: Build the app using EAS
echo -e "${YELLOW}Step 1: Building iOS app with EAS...${NC}"
eas build --platform ios --profile production --non-interactive

# Step 2: Wait for build to complete
echo -e "${YELLOW}Step 2: Waiting for build to complete...${NC}"
# EAS will handle this automatically

# Step 3: Download the IPA
echo -e "${YELLOW}Step 3: Downloading IPA...${NC}"
# EAS build download is automatic

# Step 4: Validate the IPA
echo -e "${YELLOW}Step 4: Validating IPA...${NC}"
if [ -f "$IPA_PATH" ]; then
  xcrun altool --validate-app \
    -f "$IPA_PATH" \
    -t ios \
    -u "$APP_STORE_EMAIL" \
    -p "$APP_STORE_PASSWORD"
else
  echo -e "${RED}Error: IPA file not found at $IPA_PATH${NC}"
  exit 1
fi

# Step 5: Upload to App Store Connect
echo -e "${YELLOW}Step 5: Uploading to App Store Connect...${NC}"
xcrun altool --upload-app \
  -f "$IPA_PATH" \
  -t ios \
  -u "$APP_STORE_EMAIL" \
  -p "$APP_STORE_PASSWORD"

# Step 6: Submit for review (optional, requires manual confirmation)
echo -e "${GREEN}✅ Upload complete!${NC}"
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Go to App Store Connect"
echo "  2. Select your build"
echo "  3. Fill in release notes and metadata"
echo "  4. Submit for review"

echo -e "${GREEN}🎉 iOS submission process complete!${NC}"
