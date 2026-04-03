import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding DeepArch demo project...');

  // Clean up previous seed
  await prisma.project.deleteMany({ where: { name: 'E-Commerce Platform' } });

  const project = await prisma.project.create({
    data: { name: 'E-Commerce Platform', description: 'Demo architecture — click any node to drill in' },
  });

  // --- Root level (Level 0) ---
  const [mobileApp, apiGateway, loadBalancer, backendServers, database] =
    await Promise.all([
      prisma.node.create({ data: { projectId: project.id, parentId: null, name: 'Mobile App', nodeType: 'frontend', positionX: 100, positionY: 100, metadata: '{"customFields":[{"key":"platform","value":"iOS / Android"}],"links":[{"label":"Figma Design","url":"https://figma.com"}],"tags":[]}' } }),
      prisma.node.create({ data: { projectId: project.id, parentId: null, name: 'API Gateway', nodeType: 'gateway', positionX: 350, positionY: 100, metadata: '{"customFields":[{"key":"provider","value":"AWS API Gateway"}],"links":[],"tags":[]}' } }),
      prisma.node.create({ data: { projectId: project.id, parentId: null, name: 'Load Balancer', nodeType: 'load-balancer', positionX: 600, positionY: 100, metadata: '{"customFields":[{"key":"type","value":"Round Robin"}],"links":[],"tags":[]}' } }),
      prisma.node.create({ data: { projectId: project.id, parentId: null, name: 'Backend Servers', nodeType: 'service', positionX: 850, positionY: 100, metadata: '{"customFields":[{"key":"language","value":"Node.js"}],"links":[],"tags":["critical"]}' } }),
      prisma.node.create({ data: { projectId: project.id, parentId: null, name: 'Database Cluster', nodeType: 'database', positionX: 1100, positionY: 100, metadata: '{"customFields":[{"key":"engine","value":"PostgreSQL 16"}],"links":[],"tags":["critical"]}' } }),
    ]);

  // Root edges
  await Promise.all([
    prisma.edge.create({ data: { projectId: project.id, sourceId: mobileApp.id, targetId: apiGateway.id, parentId: null, label: 'HTTPS', edgeType: 'http', metadata: '{}' } }),
    prisma.edge.create({ data: { projectId: project.id, sourceId: apiGateway.id, targetId: loadBalancer.id, parentId: null, edgeType: 'default', metadata: '{}' } }),
    prisma.edge.create({ data: { projectId: project.id, sourceId: loadBalancer.id, targetId: backendServers.id, parentId: null, edgeType: 'default', metadata: '{}' } }),
    prisma.edge.create({ data: { projectId: project.id, sourceId: backendServers.id, targetId: database.id, parentId: null, label: 'SQL', edgeType: 'data-flow', metadata: '{}' } }),
  ]);

  // --- Level 1: Inside Backend Servers ---
  const [sitEnv, uatEnv, prodEnv] = await Promise.all([
    prisma.node.create({ data: { projectId: project.id, parentId: backendServers.id, name: 'SIT Environment', nodeType: 'environment', positionX: 100, positionY: 100, metadata: '{"customFields":[{"key":"purpose","value":"System Integration Testing"}],"links":[],"tags":[]}' } }),
    prisma.node.create({ data: { projectId: project.id, parentId: backendServers.id, name: 'UAT Environment', nodeType: 'environment', positionX: 350, positionY: 100, metadata: '{"customFields":[{"key":"purpose","value":"User Acceptance Testing"}],"links":[],"tags":[]}' } }),
    prisma.node.create({ data: { projectId: project.id, parentId: backendServers.id, name: 'Production', nodeType: 'environment', positionX: 600, positionY: 100, metadata: '{"customFields":[{"key":"region","value":"us-east-1"}],"links":[{"label":"Monitoring","url":"https://grafana.example.com"}],"tags":["critical"]}' } }),
  ]);

  await Promise.all([
    prisma.edge.create({ data: { projectId: project.id, sourceId: sitEnv.id, targetId: uatEnv.id, parentId: backendServers.id, label: 'promotes to', edgeType: 'dependency', metadata: '{}' } }),
    prisma.edge.create({ data: { projectId: project.id, sourceId: uatEnv.id, targetId: prodEnv.id, parentId: backendServers.id, label: 'promotes to', edgeType: 'dependency', metadata: '{}' } }),
  ]);

  // --- Level 2: Inside SIT Environment ---
  const [authService, orderService, notifService] = await Promise.all([
    prisma.node.create({ data: { projectId: project.id, parentId: sitEnv.id, name: 'Auth Service', nodeType: 'service', positionX: 100, positionY: 100, metadata: '{"customFields":[{"key":"port","value":"3001"},{"key":"tech","value":"JWT + bcrypt"}],"links":[{"label":"API Docs","url":"https://docs.example.com/auth"}],"tags":[]}' } }),
    prisma.node.create({ data: { projectId: project.id, parentId: sitEnv.id, name: 'Order Service', nodeType: 'service', positionX: 350, positionY: 100, metadata: '{"customFields":[{"key":"port","value":"3002"}],"links":[],"tags":[]}' } }),
    prisma.node.create({ data: { projectId: project.id, parentId: sitEnv.id, name: 'Notification Service', nodeType: 'queue', positionX: 600, positionY: 100, metadata: '{"customFields":[{"key":"broker","value":"RabbitMQ"}],"links":[],"tags":[]}' } }),
  ]);

  await Promise.all([
    prisma.edge.create({ data: { projectId: project.id, sourceId: orderService.id, targetId: authService.id, parentId: sitEnv.id, label: 'validates token', edgeType: 'http', metadata: '{}' } }),
    prisma.edge.create({ data: { projectId: project.id, sourceId: orderService.id, targetId: notifService.id, parentId: sitEnv.id, label: 'order events', edgeType: 'event', metadata: '{}' } }),
  ]);

  console.log(`Done! Project ID: ${project.id}`);
  console.log('Run the app and explore: Mobile App → Backend Servers → SIT Environment → services');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
