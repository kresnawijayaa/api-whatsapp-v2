const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

// Konfigurasi Swagger
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "WhatsApp API",
      version: "1.0.0",
      description:
        "Prodept Kresna Wijaya",
    },
    servers: [
      {
        url:
          process.env.NODE_ENV === "production"
            ? "https://vps.kresnawijaya.web.id"
            : "http://localhost:3000",
      },
    ],
  },
  apis: ["./routes/*.js"], // Ambil dokumentasi dari file di folder routes
};

const specs = swaggerJsdoc(options);

const setupSwagger = (app) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
};

module.exports = setupSwagger;
