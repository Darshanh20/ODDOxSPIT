# Admin Module - Quick Reference Guide

## 🚀 Quick Access

### Admin Dashboard URL
```
Frontend: http://localhost:5173/admin/dashboard
Backend API: http://localhost:5000/api/dashboard/
```

### Access Requirements
- Must be logged in
- Must have ADMIN role
- Valid JWT token required

---

## 📁 File Structure

```
Frontend:
  client/src/
  ├── pages/AdminDashboard.jsx
  ├── components/
  │   ├── ProtectedAdminRoute.jsx
  │   └── admin/
  │       ├── KPICard.jsx
  │       ├── AlertCard.jsx
  │       ├── DocumentStatusChart.jsx
  │       ├── RecentActivityTable.jsx
  │       └── StockOverviewChart.jsx
  └── App.jsx (updated)

Backend:
  server/src/
  ├── middlewares/authMiddleware.js (updated)
  ├── controllers/dashboardController.js (existing)
  └── routes/dashboardRoutes.js (updated)
```

---

## 🔗 API Endpoints

| Endpoint | Method | Protected | Description |
|----------|--------|-----------|-------------|
| `/api/dashboard/kpis` | GET | Yes | KPI metrics |
| `/api/dashboard/alerts` | GET | Yes | Alert system |
| `/api/dashboard/stock-overview` | GET | Yes | Stock data |
| `/api/dashboard/document-stats` | GET | Yes | Document stats |
| `/api/dashboard/top-products` | GET | Yes | Top products |

---

## 🔐 Authentication

### Headers Required
```
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json
```

### Get Token
Login → JWT token stored in localStorage
Access via: `localStorage.getItem('token')`

---

## 🎨 Component Usage

### KPICard
```jsx
<KPICard
  title="Total Products"
  value={150}
  icon={Package}
  color="blue"
  change="+12%"
/>
```

### AlertCard
```jsx
<AlertCard
  alert={{
    type: 'OUT_OF_STOCK',
    severity: 'CRITICAL',
    message: 'Product X is out of stock'
  }}
/>
```

---

## 🔄 Data Flow

```
AdminDashboard.jsx
├── useEffect() - Fetch on mount
├── fetchDashboardData()
│   ├── /api/dashboard/kpis
│   └── /api/dashboard/alerts
├── setDashboardData()
├── setAlerts()
└── Render Components
    ├── KPICard (x7)
    ├── AlertCard (x5)
    ├── DocumentStatusChart
    ├── RecentActivityTable
    └── StockOverviewChart
```

---

## 🛠️ Common Modifications

### Add New KPI
1. Update `dashboardController.js` - Add calculation
2. Update API response
3. Add KPICard in `AdminDashboard.jsx`

### Add New Chart
1. Create component in `components/admin/`
2. Fetch data in `AdminDashboard.jsx`
3. Add chart to render section
4. Update API if needed

### Change Colors
Edit color arrays in component files:
```javascript
const colorClasses = {
  blue: 'bg-blue-50 text-blue-600',
  // Add more colors...
}
```

---

## 🐛 Debugging

### Check Token
```javascript
console.log(localStorage.getItem('token'))
```

### Check User Role
```javascript
const response = await fetch('http://localhost:5000/api/users/me', {
  headers: { Authorization: `Bearer ${token}` }
})
const user = await response.json()
console.log(user.role)
```

### Check API Response
```javascript
// In AdminDashboard.jsx
.then(res => {
  console.log('Status:', res.status)
  return res.json()
})
.then(data => {
  console.log('Data:', data)
  // ...
})
```

### Browser DevTools
1. Network tab - Check API calls
2. Console - Check errors
3. Application - Check localStorage token
4. Elements - Check component rendering

---

## 📊 Data Structures

### KPI Object
```javascript
{
  totalProductsInStock: 150,
  lowStockCount: 12,
  outOfStockCount: 3,
  pendingReceipts: 5,
  pendingDeliveries: 8,
  scheduledTransfers: 2,
  totalStockValue: 45600.00
}
```

### Alert Object
```javascript
{
  type: 'OUT_OF_STOCK',
  severity: 'CRITICAL',
  product: {...},
  message: 'Product X is out of stock',
  currentStock: 0,
  reorderPoint: 10
}
```

### Activity Object
```javascript
{
  id: 'uuid',
  productId: 'uuid',
  transactionType: 'IN|OUT|ADJUST|TRANSFER',
  referenceType: 'RECEIPT|DELIVERY|TRANSFER|ADJUSTMENT',
  quantityChange: 50,
  createdAt: '2025-11-22T...',
  product: { name: '...' }
}
```

---

## 🎯 Testing Checklist

- [ ] Login as first user (ADMIN)
- [ ] Access /admin/dashboard
- [ ] Verify all KPI cards load
- [ ] Check alerts display
- [ ] Verify charts render
- [ ] Check recent activity table
- [ ] Try non-admin user - should get access denied
- [ ] Check API calls in network tab
- [ ] Verify error handling (disconnect API)
- [ ] Test responsive design

---

## 🚨 Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 401 | Unauthorized | Check token validity |
| 403 | Forbidden | Verify ADMIN role |
| 404 | Not Found | Check API endpoint |
| 500 | Server Error | Check backend logs |

---

## 💡 Tips & Tricks

### Refresh Data Manually
```javascript
// In AdminDashboard component
const refreshData = () => {
  setLoading(true)
  fetchDashboardData()
}

// Call on button click
<button onClick={refreshData}>Refresh</button>
```

### Filter by Warehouse
```javascript
// API call with warehouse filter
const response = await fetch(
  'http://localhost:5000/api/dashboard/kpis?warehouseId=warehouse1'
)
```

### Export Data
```javascript
// Convert data to CSV
const exportCSV = (data) => {
  const csv = Object.keys(data[0]).join(',') + '\n'
  data.forEach(row => {
    csv += Object.values(row).join(',') + '\n'
  })
  // Download csv
}
```

---

## 📚 Documentation Files

- `ADMIN_MODULE_DOCUMENTATION.md` - Complete guide
- `ADMIN_MODULE_SUMMARY.md` - Implementation overview
- This file - Quick reference

---

## 🔐 Security Notes

- Never expose JWT token
- Always use Bearer prefix
- Verify role on frontend AND backend
- Validate all user input
- Use HTTPS in production
- Implement rate limiting
- Log all admin activities

---

## 🎓 Learning Resources

### Component Pattern
All admin components follow this pattern:
```javascript
import React from 'react'

export default function ComponentName({ data, props }) {
  // Logic here
  
  return (
    <div>
      {/* JSX here */}
    </div>
  )
}
```

### API Pattern
All API calls follow this pattern:
```javascript
const token = localStorage.getItem('token')
const response = await fetch('http://localhost:5000/api/...', {
  headers: { Authorization: `Bearer ${token}` }
})
const data = await response.json()
```

---

## 🤝 Contributing

### Adding Features
1. Branch from main
2. Create feature in isolated files
3. Test thoroughly
4. Update documentation
5. Submit PR with tests

### Code Style
- Use functional components
- Use hooks (useState, useEffect)
- Name components with PascalCase
- Name files with PascalCase
- Use descriptive variable names
- Add comments for complex logic

---

## 📞 Support

For issues:
1. Check documentation files
2. Review API responses
3. Check browser console
4. Verify JWT token
5. Check backend logs
6. Test in Postman/Insomnia

---

**Last Updated**: November 22, 2025
**Version**: 1.0
**Status**: Production Ready
