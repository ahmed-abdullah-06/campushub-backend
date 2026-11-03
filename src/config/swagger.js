import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from './env.js';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CampusHub API Documentation',
      version: '1.0.0',
      description: 'REST API documentation for CampusHub full-stack platform',
    },
    servers: [
      {
        // Docs should point at the API the caller is actually using:
        // the deployed PUBLIC_URL in production, localhost in development.
        url: config.publicUrl
          ? `${config.publicUrl.replace(/\/$/, '')}/api`
          : `http://localhost:${config.port}/api`,
        description: config.isProduction ? 'Production Server' : 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app) => {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log(`📄 Swagger Docs available at http://localhost:${config.port}/api/docs`);
};