
require('dotenv').config();
const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./Routes/auths');
const commentsRoutes = require('./Routes/comments');
const adminRoutes = require('./Routes/admin');
const dealsRoutes = require('./Routes/deals');

const app = express();

connectDB();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/deals', dealsRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to DealExpress API' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});