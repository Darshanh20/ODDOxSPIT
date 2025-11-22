# Admin Module Testing Guide

## 🧪 Testing Setup

### Prerequisites
- Backend running: `npm run dev` (from server folder, port 5000)
- Frontend running: `npm run dev` (from client folder, port 5173)
- Database populated with test data
- Postman or Insomnia (for API testing)

---

## 🔐 Step 1: User Setup

### Create First User (Auto-becomes ADMIN)
```bash
POST http://localhost:5000/api/auth/register

Body:
{
  "username": "SM20251",
  "email": "admin@stockmaster.com",
  "password": "Admin@1234"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "ADMIN",  // ✅ First user is ADMIN
  "username": "SM20251",
  "email": "admin@stockmaster.com"
}
```

### Login with Admin
```bash
POST http://localhost:5000/api/auth/login

Body:
{
  "username": "SM20251",
  "password": "Admin@1234"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "ADMIN",
  "username": "SM20251",
  "email": "admin@stockmaster.com"
}
```

---

## 📊 Step 2: Test Dashboard APIs

### Test 1: Get KPIs
```bash
GET http://localhost:5000/api/dashboard/kpis

Headers:
Authorization: Bearer {TOKEN_FROM_LOGIN}

Expected Response:
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

✅ Status: 200 OK
❌ If 403: User is not ADMIN
❌ If 401: Token is invalid

### Test 2: Get Alerts
```bash
GET http://localhost:5000/api/dashboard/alerts

Headers:
Authorization: Bearer {TOKEN}

Expected Response:
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

### Test 3: Stock Overview
```bash
GET http://localhost:5000/api/dashboard/stock-overview

Optional Query:
?warehouseId=warehouse-id&categoryId=category-id

Expected Response:
{
  "stockOverview": [
    {
      "product": { ... },
      "totalQuantity": 500,
      "totalAvailable": 480,
      "totalReserved": 20,
      "warehouses": [ ... ]
    },
    ...
  ]
}
```

### Test 4: Document Statistics
```bash
GET http://localhost:5000/api/dashboard/document-stats

Optional Query:
?warehouseId=id&startDate=2025-01-01&endDate=2025-12-31

Expected Response:
{
  "receipts": [
    { "status": "DRAFT", "_count": 5 },
    { "status": "WAITING", "_count": 3 },
    ...
  ],
  "deliveries": [ ... ],
  "transfers": [ ... ],
  "adjustments": [ ... ]
}
```

### Test 5: Top Products
```bash
GET http://localhost:5000/api/dashboard/top-products

Optional Query:
?warehouseId=id&limit=10&transactionType=IN

Expected Response:
{
  "topProducts": [
    {
      "product": { ... },
      "totalMovement": 1000,
      "inbound": 600,
      "outbound": 400,
      "transactionCount": 45
    },
    ...
  ]
}
```

---

## 🌐 Step 3: Frontend Testing

### Test 1: Access Admin Dashboard
```
1. Login as admin user
2. Navigate to http://localhost:5173/admin/dashboard
3. Should load without errors
4. Should display dashboard with all data
```

✅ **Success Indicators:**
- Dashboard loads
- KPI cards show values
- Alerts display
- Charts render
- No console errors

❌ **Failure Indicators:**
- "Verifying access..." spinner loops
- Redirects to /home
- Console shows 403 error
- "Access denied" message

### Test 2: Non-Admin User Access
```bash
POST http://localhost:5000/api/auth/register

# Create second user (will be STAFF)
{
  "username": "SM20252",
  "email": "staff@stockmaster.com",
  "password": "Staff@1234"
}

# Login as staff
# Navigate to /admin/dashboard
# Should redirect to /home (access denied)
```

✅ **Expected**: Redirected to /home
❌ **Bug**: Staff can access admin dashboard

### Test 3: Check Protected Routes
```javascript
// Open browser console
// Try accessing dashboard without token:

localStorage.removeItem('token')
// Refresh page at /admin/dashboard
// Should redirect to login
```

---

## 🔄 Step 4: Component Testing

### Test KPI Card
```jsx
// In browser console, check if cards render:
document.querySelectorAll('.kpi-card')
// Should return 7 elements

// Check values display
document.querySelector('.kpi-card').textContent
// Should show: "Total Products" and a number
```

### Test Alert Card
```jsx
// Check if alerts section exists
document.querySelector('.alert-section')

// Check alert cards
document.querySelectorAll('.alert-card')
// Should display critical alerts first

// Check severity colors
document.querySelector('.alert-card.critical')
// Should have red background
```

### Test Charts
```jsx
// Check document status chart
document.querySelector('[data-testid="document-chart"]')

// Check recent activity table
document.querySelector('table')
// Should have rows with recent activities
```

---

## 📈 Step 5: Data Validation Testing

### Test 1: Verify KPI Calculations
```javascript
// Manually verify:
totalProducts = count of active products
lowStockCount = products where available <= reorderPoint
outOfStockCount = products where available = 0
```

### Test 2: Check Alert Calculations
```javascript
// Critical alerts should include:
✅ All out-of-stock products
✅ All overdue documents

// High alerts should include:
✅ Overdue receipts
✅ Overdue deliveries
```

### Test 3: Verify Recent Activities
```javascript
// Should show latest transactions:
✅ Stock IN movements
✅ Stock OUT movements
✅ Adjustments
✅ Transfers
```

---

## 🔒 Step 6: Security Testing

### Test 1: Authorization Check
```bash
# Try accessing KPI without token
GET http://localhost:5000/api/dashboard/kpis

Expected: 401 Unauthorized
```

### Test 2: Admin-Only Protection
```bash
# Login as STAFF user
# Get token from login response

# Try accessing dashboard with STAFF token
GET http://localhost:5000/api/dashboard/kpis
Headers: Authorization: Bearer {STAFF_TOKEN}

Expected: 403 Forbidden (Access denied)
```

### Test 3: Token Expiry
```bash
# Manually expire token:
localStorage.setItem('token', 'invalid.token.here')

# Refresh dashboard
Expected: "Verifying access..." then redirect to login
```

---

## 🎯 Step 7: Error Handling Tests

### Test 1: API Failure
```bash
# Stop backend server
# Try accessing /admin/dashboard
# Should show: "Error Loading Dashboard"
```

### Test 2: Invalid Response
```javascript
// Mock API error response in Network tab
// Modify response: { kpis: null }
// Dashboard should handle gracefully
```

### Test 3: Empty Data
```bash
# Ensure clean database with no transactions
# Dashboard should still load
# KPIs should show 0 values
```

---

## ⚡ Step 8: Performance Testing

### Test 1: Load Time
```javascript
// Open DevTools Network tab
// Measure time to load all API calls
// Should complete in < 2 seconds

Performance targets:
- KPI load: < 500ms
- Alerts load: < 500ms
- Total: < 2s
```

### Test 2: Memory Usage
```javascript
// Open DevTools Performance tab
// Reload dashboard
// Check memory profile
// Should not increase continuously
```

### Test 3: API Call Optimization
```javascript
// Check Network tab
// Should see parallel API calls:
✅ /kpis
✅ /alerts
// Not sequential (one after another)
```

---

## 📝 Test Results Template

```
Admin Dashboard Test Report
===========================

Date: _______________
Tester: ______________
Environment: Development / Staging / Production

API Tests:
✅ ✗ Get KPIs
✅ ✗ Get Alerts
✅ ✗ Get Stock Overview
✅ ✗ Get Document Stats
✅ ✗ Get Top Products

Frontend Tests:
✅ ✗ Admin can access dashboard
✅ ✗ Staff cannot access dashboard
✅ ✗ KPI cards render
✅ ✗ Alerts display
✅ ✗ Charts render
✅ ✗ Table displays data

Security Tests:
✅ ✗ Authorization working
✅ ✗ Role check working
✅ ✗ Token validation working

Performance:
- Load time: _____ ms
- Memory: _____ MB
- API calls: _____ (should be 2)

Issues Found:
1. ___________________
2. ___________________
3. ___________________

Notes:
_______________________________
```

---

## 🐛 Troubleshooting During Tests

### Dashboard Shows "Loading..."
```
Solution:
1. Check if backend is running
2. Check if database has data
3. Check browser DevTools Network tab
4. Verify JWT token is valid
```

### "Error Loading Dashboard"
```
Solution:
1. Check API response in DevTools
2. Check backend console for errors
3. Verify database connection
4. Check authMiddleware logs
```

### KPI Cards Show 0
```
Solution:
1. Verify test data in database
2. Check query calculations
3. Run raw SQL queries to verify counts
4. Check data filtering logic
```

### "Access Denied" Error
```
Solution:
1. Verify user role is ADMIN
2. Check JWT token decode
3. Verify protect middleware
4. Check adminOnly middleware
```

---

## ✅ Sign-Off Checklist

Before marking as complete:

- [ ] All API endpoints return 200 OK
- [ ] Admin user can access dashboard
- [ ] Non-admin users blocked
- [ ] All KPI values display
- [ ] Alerts show correctly
- [ ] Charts render without errors
- [ ] Recent activity shows latest transactions
- [ ] No console errors
- [ ] Load time acceptable (< 2s)
- [ ] Responsive on mobile
- [ ] Database queries optimized
- [ ] Security validations pass
- [ ] Error handling works
- [ ] Documentation complete

---

## 📞 Support

If tests fail:
1. Check ADMIN_MODULE_DOCUMENTATION.md
2. Review backend logs
3. Check browser DevTools
4. Verify database state
5. Test API with Postman first
6. Check JWT token validity

**Ready to test! 🚀**
