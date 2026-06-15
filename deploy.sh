#!/bin/bash
# deploy.sh — build, push to ECR, and deploy to ECS via CDK
set -euo pipefail

AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
AWS_REGION=${AWS_REGION:-us-east-1}
IMAGE_TAG=${IMAGE_TAG:-latest}

SERVICES=("api-gateway" "user-service" "product-service" "frontend")

echo "▶ Logging in to ECR…"
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com"

for SVC in "${SERVICES[@]}"; do
  ECR_URI="$AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/$SVC"

  echo "▶ Building $SVC…"
  if [ "$SVC" = "frontend" ]; then
    docker build \
      --build-arg "VITE_API_URL=http://\${API_GATEWAY_URL}/api" \
      -t "$SVC:$IMAGE_TAG" "./$SVC"
  else
    docker build -t "$SVC:$IMAGE_TAG" "./$SVC"
  fi

  echo "▶ Tagging & pushing $SVC…"
  docker tag "$SVC:$IMAGE_TAG" "$ECR_URI:$IMAGE_TAG"
  docker push "$ECR_URI:$IMAGE_TAG"
  echo "✅ $SVC pushed"
done

echo "▶ Deploying CDK stack…"
cd infrastructure
npm ci
npx cdk deploy --require-approval never \
  --context imageTag="$IMAGE_TAG"

echo "✅ Deployment complete"
