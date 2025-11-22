const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

// Load environment variables as soon as possible so modules that rely on them
// (for example modules that instantiate PrismaClient at import time) have
// access to process.env values like DATABASE_URL.
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Require routes after dotenv has been loaded and after `app` exists.
const authRoute = require('./src/routes/authRoutes');
app.use('/api/auth', authRoute);

const userRoutes = require('./src/routes/userRoutes');
app.use('/api/users', userRoutes);

// Inventory Management System Routes
const productRoutes = require('./src/routes/productRoutes');
app.use('/api/products', productRoutes);

const warehouseRoutes = require('./src/routes/warehouseRoutes');
app.use('/api', warehouseRoutes);

const receiptRoutes = require('./src/routes/receiptRoutes');
app.use('/api/receipts', receiptRoutes);

const deliveryRoutes = require('./src/routes/deliveryRoutes');
app.use('/api/deliveries', deliveryRoutes);

const transferRoutes = require('./src/routes/transferRoutes');
app.use('/api/transfers', transferRoutes);

const adjustmentRoutes = require('./src/routes/adjustmentRoutes');
app.use('/api/adjustments', adjustmentRoutes);

const dashboardRoutes = require('./src/routes/dashboardRoutes');
app.use('/api/dashboard', dashboardRoutes);

const partnerRoutes = require('./src/routes/partnerRoutes');
app.use('/api/partners', partnerRoutes);

const moveHistoryRoutes = require('./src/routes/moveHistoryRoutes');
app.use('/api/moves', moveHistoryRoutes);

const staffRoutes = require('./src/routes/staffRoutes');
app.use('/api/staff', staffRoutes);

const staffManagementRoutes = require('./src/routes/staffManagementRoutes');
app.use('/api/staff-management', staffManagementRoutes);

// A simple test route to make sure the server is running
app.get('/', (req, res) => {
  res.send('API is running successfully!');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server is listening on port ${PORT}`));