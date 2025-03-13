require("dotenv").config();

const express = require("express");
const setupSwagger = require("./config/swagger");

const app = express();
const port = 3000;

app.use(express.json());

setupSwagger(app);

app.use("/message", require("./routes/messageRoutes"));
app.use("/otp", require("./routes/otpRoutes"));
app.use("/approval", require("./routes/approvalRoutes"));
app.use("/session", require("./routes/sessionRoutes"));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Swagger Docs available at http://localhost:${port}/api-docs`);
});
