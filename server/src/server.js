require('dotenv').config();
const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const runStartupTasks = require('./config/startup');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect database
  await connectDB();

  // Run startup initializations (Class 1-12 & Main Admin verification)
  await runStartupTasks();

  const server = http.createServer(app);

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
