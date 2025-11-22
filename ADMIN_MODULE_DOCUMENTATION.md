# IronVault Admin Module Documentation

## Overview

The Admin Module provides comprehensive inventory management capabilities for administrators. Only users with the ADMIN role can access these features. The first user registered in the system is automatically assigned the ADMIN role.

## Access Control

### Role-Based Access
- **ADMIN**: Full access to all admin features and dashboards
- **MANAGER**: Can perform inventory operations (created by admin)
- **STAFF**: Basic access (created by admin or manager)

### Protected Routes
All admin routes are protected with two middleware checks:
1. **Authentication**: `protect` middleware - verifies JWT token and user existence
2. **Authorization**: `adminOnly` middleware - ensures user has ADMIN role

## Admin Dashboard

### URL
```
http://localhost:5000/api/dashboard
Frontend: /admin/dashboard
```

### Features

#### KPI Cards
Displays real-time inventory metrics:
- **Total Products**: Count of active products in inventory
- **Low Stock Alerts**: Products below reorder point
- **Pending Receipts**: Incoming goods awaiting processing
- **Pending Deliveries**: Outgoing orders to be fulfilled
- **Pending Transfers**: Inter-warehouse transfers in progress
- **Out of Stock**: Products with zero availability
- **Total Stock Value**: Combined value of all inventory

#### Alerts Section
Three-tier alert system:
- **CRITICAL**: Out of stock products
- **HIGH**: Overdue documents (receipts, deliveries, transfers)
- **WARNING**: Low stock products

#### Dashboard Charts
1. **Document Status Overview**: Visual breakdown of all documents by status
   - DRAFT, WAITING, READY, DONE, CANCELED
   - Covers: Receipts, Deliveries, Transfers, Adjustments

2. **Top Warnings**: Real-time warning system
   - Severity-based color coding
   - Quick reference for critical issues

3. **Recent Stock Movements**: Transaction history table
   - Shows all stock movements (IN, OUT, ADJUST, TRANSFER)
   - Includes product, quantity, reference type, and date

## API Endpoints

### Dashboard Endpoints

#### Get Dashboard KPIs
```
GET /api/dashboard/kpis
Authorization: Bearer {token}
```
**Response:**
```json
{
  "kpis": {
    "totalProductsInStock": 150,
    "lowStockCount": 12,
    "outOfStockCount": 3,
    "pendingReceipts": 5,
    "pendingDeliveries": 8,
    "scheduledTransfers": 2,
    "totalStockValue": 45600.00
  },
  "statusBreakdown": { ... },
  "recentActivities": [ ... ]
}
```

#### Get Stock Overview
```
GET /api/dashboard/stock-overview?warehouseId={id}&categoryId={id}
Authorization: Bearer {token}
```

#### Get Document Statistics
```
GET /api/dashboard/document-stats?warehouseId={id}&startDate={date}&endDate={date}
Authorization: Bearer {token}
```

#### Get Top Products
```
GET /api/dashboard/top-products?warehouseId={id}&limit=10&transactionType={type}
Authorization: Bearer {token}
```

#### Get Alerts
```
GET /api/dashboard/alerts?warehouseId={id}
Authorization: Bearer {token}
```
**Response:**
```json
{
  "alerts": [
    {
      "type": "OUT_OF_STOCK",
      "severity": "CRITICAL",
      "product": { ... },
      "message": "Product X is out of stock"
    },
    ...
  ],
  "summary": {
    "critical": 3,
    "high": 2,
    "warning": 12,
    "medium": 1
  }
}
```

## Frontend Components

### Main Component: AdminDashboard
Location: `client/src/pages/AdminDashboard.jsx`

### Sub-Components (in `client/src/components/admin/`)

1. **KPICard.jsx**
   - Displays key performance indicators
   - Customizable colors and icons
   - Props: title, value, icon, color, change

2. **AlertCard.jsx**
   - Shows alert messages with severity levels
   - Color-coded by severity (CRITICAL, HIGH, WARNING)
   - Props: alert object

3. **DocumentStatusChart.jsx**
   - Visual representation of document statuses
   - Stacked bar charts for each document type
   - Props: data object from API

4. **RecentActivityTable.jsx**
   - Table showing recent stock transactions
   - Transaction type icons and colors
   - Props: activities array

5. **StockOverviewChart.jsx**
   - Horizontal bar chart of top products
   - Shows available and reserved stock
   - Props: data array

## Backend Implementation

### Middleware
- **authMiddleware.js**: Updated with role information
  - `protect`: Verifies authentication and includes user role
  - `adminOnly`: Ensures ADMIN role
  - `adminOrManager`: Allows ADMIN or MANAGER roles

### Dashboard Controller
Location: `server/src/controllers/dashboardController.js`

Functions:
- `getDashboardKPIs()`: Aggregates all inventory metrics
- `getStockOverview()`: Detailed stock breakdown by warehouse
- `getDocumentStatistics()`: Document status analysis
- `getTopProducts()`: Most active products
- `getAlerts()`: Low stock and overdue document alerts

## Database Schema

Uses existing Prisma models:
- **User**: Role field (ADMIN, MANAGER, STAFF)
- **Product**: Core product data with pricing
- **Stock**: Inventory quantities by location
- **Receipt**: Incoming goods documents
- **DeliveryOrder**: Outgoing goods documents
- **InternalTransfer**: Inter-warehouse transfers
- **StockAdjustment**: Inventory corrections
- **StockLedger**: Complete transaction history

## Setup Instructions

### Backend Setup
1. Ensure authMiddleware.js includes role in user selection
2. Update dashboard routes with `adminOnly` protection
3. Verify database has user roles populated

### Frontend Setup
1. Create AdminDashboard.jsx page
2. Create component files in `components/admin/` folder
3. Update App.jsx to include admin routes
4. Use ProtectedAdminRoute for access control

### First User Setup
1. Create first user account - automatically assigned ADMIN role
2. Login and access /admin/dashboard
3. Create staff accounts through admin interface (coming soon)

## Future Enhancements

### Product Management
- Create, edit, delete products
- Manage categories and units of measure
- Set reorder rules

### Vendor Management
- Add/edit/delete vendors
- Track vendor information
- Vendor performance analytics

### Warehouse Management
- Create, edit, delete warehouse locations
- Transfer stock between locations
- View warehouse-specific statistics

### Inventory Operations
- Create and validate receipts
- Create and validate deliveries
- Manage internal transfers
- Perform stock adjustments

### User Management
- Create staff accounts
- Assign roles
- Enable/disable accounts
- View user activity logs

### Reporting
- Advanced filtering and search
- Export capabilities
- Custom report generation
- Historical analytics

## Security Considerations

1. **Role-Based Access Control (RBAC)**
   - All admin routes protected with role verification
   - Frontend and backend validation

2. **Token Security**
   - JWT tokens include user role
   - Tokens verified on each request

3. **Data Privacy**
   - Sensitive fields excluded from API responses
   - Warehouse-specific data filtering

4. **Audit Trail**
   - All transactions logged in StockLedger
   - Complete move history maintained

## Troubleshooting

### Dashboard Not Loading
- Verify JWT token is valid
- Check user has ADMIN role
- Verify API server is running on port 5000

### Data Not Updating
- Clear browser cache
- Check API response status
- Verify database connection

### Access Denied Errors
- Confirm user role is ADMIN
- Check token is not expired
- Verify middleware is properly configured

## Performance Optimization

- Dashboard data fetched in parallel
- Pagination for large datasets (future enhancement)
- Caching of frequently accessed data
- Index optimization in database queries

