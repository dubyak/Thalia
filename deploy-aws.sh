#!/bin/bash
set -e

ECR_REPO="578887268861.dkr.ecr.us-west-2.amazonaws.com/thalia/proto"

echo "Building Docker image (linux/amd64)..."
docker build --platform linux/amd64 -t thalia/proto:latest .

echo "Tagging for ECR..."
docker tag thalia/proto:latest "$ECR_REPO:latest"

echo "Pushing to ECR..."
docker push "$ECR_REPO:latest"

echo "Done! App Runner will auto-deploy from ECR."
