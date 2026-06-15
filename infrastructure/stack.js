import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
// Update these before deploying:
const ECR_ACCOUNT = process.env.CDK_DEFAULT_ACCOUNT;
const ECR_REGION = process.env.CDK_DEFAULT_REGION || "us-east-1";
const IMAGE_TAG = process.env.IMAGE_TAG || "latest";

export class MicroservicesStack extends cdk.Stack {
  constructor(scope, id, props) {
    super(scope, id, props);

    // ── VPC ────────────────────────────────────────────────────────────────────
    const vpc = new ec2.Vpc(this, "MicroVpc", {
      maxAzs: 2,
      natGateways: 1, // reduce cost; use 2 for production HA
    });

    // ── ECS Cluster ────────────────────────────────────────────────────────────
    const cluster = new ecs.Cluster(this, "MicroCluster", {
      vpc,
      clusterName: "microservices-cluster",
      containerInsights: true,
    });

    // ── ECR Repos ──────────────────────────────────────────────────────────────
    const repos = {};
    for (const name of ["api-gateway", "user-service", "product-service", "frontend"]) {
      repos[name] = new ecr.Repository(this, `${name}-repo`, {
        repositoryName: name,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });
    }

    // ── Internal ALB for backend services ─────────────────────────────────────
    const internalAlb = new elbv2.ApplicationLoadBalancer(this, "InternalAlb", {
      vpc,
      internetFacing: false,
      loadBalancerName: "micro-internal",
    });

    // ── Shared Security Group ─────────────────────────────────────────────────
    const servicesSg = new ec2.SecurityGroup(this, "ServicesSg", {
      vpc,
      description: "Microservices internal",
      allowAllOutbound: true,
    });
    servicesSg.addIngressRule(servicesSg, ec2.Port.allTraffic(), "Internal service mesh");

    // ── Helper: create a Fargate service ─────────────────────────────────────
    const makeService = ({ name, image, port, env = {}, cpu = 256, memory = 512, publicFacing = false }) => {
      const taskDef = new ecs.FargateTaskDefinition(this, `${name}-task`, { cpu, memoryLimitMiB: memory });
      taskDef.addContainer(`${name}-container`, {
        image: ecs.ContainerImage.fromEcrRepository(image, IMAGE_TAG),
        portMappings: [{ containerPort: port }],
        environment: env,
        logging: ecs.LogDrivers.awsLogs({ streamPrefix: name }),
      });

      return new ecsPatterns.ApplicationLoadBalancedFargateService(this, `${name}-svc`, {
        cluster,
        taskDefinition: taskDef,
        desiredCount: 2,
        publicLoadBalancer: publicFacing,
        securityGroups: [servicesSg],
        listenerPort: port,
      });
    };

    // ── User Service ──────────────────────────────────────────────────────────
    const userSvc = makeService({
      name: "user-service",
      image: repos["user-service"],
      port: 3001,
      env: { JWT_SECRET: cdk.SecretValue.ssmSecure("/micro/jwt-secret", "1").toString() },
    });

    // ── Product Service ───────────────────────────────────────────────────────
    const productSvc = makeService({
      name: "product-service",
      image: repos["product-service"],
      port: 3002,
    });

    // ── API Gateway ──────────────────────────────────────────────────────────
    const gatewaySvc = makeService({
      name: "api-gateway",
      image: repos["api-gateway"],
      port: 3000,
      publicFacing: true,
      env: {
        USER_SERVICE_URL: `http://${userSvc.loadBalancer.loadBalancerDnsName}:3001`,
        PRODUCT_SERVICE_URL: `http://${productSvc.loadBalancer.loadBalancerDnsName}:3002`,
      },
    });

    // ── Frontend ─────────────────────────────────────────────────────────────
    const frontendSvc = makeService({
      name: "frontend",
      image: repos["frontend"],
      port: 80,
      publicFacing: true,
    });

    // ── Outputs ───────────────────────────────────────────────────────────────
    new cdk.CfnOutput(this, "ApiGatewayUrl", {
      value: `http://${gatewaySvc.loadBalancer.loadBalancerDnsName}`,
      description: "API Gateway public URL",
    });
    new cdk.CfnOutput(this, "FrontendUrl", {
      value: `http://${frontendSvc.loadBalancer.loadBalancerDnsName}`,
      description: "React frontend URL",
    });
    for (const [name, repo] of Object.entries(repos)) {
      new cdk.CfnOutput(this, `${name}-ecr`, { value: repo.repositoryUri });
    }
  }
}

// ── Entry ─────────────────────────────────────────────────────────────────────
const app = new cdk.App();
new MicroservicesStack(app, "MicroservicesStack", {
  env: { account: ECR_ACCOUNT, region: ECR_REGION },
});
