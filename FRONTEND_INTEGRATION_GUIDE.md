# Frontend Integration Guide - Sales & Order Processing APIs

## 📋 Overview

This guide provides comprehensive documentation for integrating the Sales and Order Processing APIs with the frontend application. All endpoints require JWT authentication and follow a standardized response format.

## 🔐 Authentication

All endpoints require a Bearer token in the Authorization header:
```javascript
headers: {
  'Authorization': 'Bearer your-jwt-token',
  'Content-Type': 'application/json'
}
```

## 📊 Standard Response Format

All API responses follow this structure:
```javascript
{
  "success": boolean,
  "message": string,
  "data": any | null,
  "status": number,
  "timestamp": string
}
```

---

## � **Product Selling Logic (IMPORTANT)**

### **Pack Sales vs Single Item Sales**

#### **Single Item Sales (`packType: "ITEM"`):**
```javascript
{
  "packType": "ITEM",
  "quantity": 5,                    // Must be >= product.minimumSellingQuantity
  "productId": "product_123"
}
// Validation: quantity >= product.minimumSellingQuantity
// Inventory: Reduces product.itemQuantity by 5
```

#### **Pack Sales (`packType: "BOX"`):**
```javascript
{
  "packType": "BOX", 
  "quantity": 3,                    // Number of packs (NO minimum validation)
  "packId": "pack_456"             // Required for pack sales
}
// Validation: NO minimum quantity check for packs
// Inventory: Reduces pack.totalPacksQuantity by 3
// Customer gets: 3 packs × items_per_pack (e.g., 3 × 6 = 18 items)
```

#### **Key Differences:**
- **Single Items**: Must meet minimum quantity requirements
- **Pack Sales**: Can buy any number of packs (1, 2, 5, etc.)
- **Pack Definition**: `pack.minimumSellingQuantity` = items per pack, NOT minimum to buy

---

## �🛒 Core Sales APIs

### 1. Create Sale
**POST** `/api/v1/sales`

Creates a new sale with inventory management, customer balance tracking, optional shipping address, and driver assignment.

**Description:** This is the primary endpoint for creating sales orders. It handles inventory deduction, customer creation/lookup, pricing calculations, automatic history logging, shipping address management, and optional driver assignment for immediate delivery.

**Important**: For pack sales (`packType: "BOX"`), there is no minimum quantity validation - customers can buy any number of packs. The `minimumSellingQuantity` in pack configuration represents items per pack, not minimum packs to sell.

**Request Body:**
```javascript
{
  "customerPhoneNumber": "+1234567890",
  "customerName": "John Doe",
  "customerAddress": "123 Main St",
  "storeId": "store_123",
  "clientId": "client_456",
  "saleItems": [
    {
      "productId": "prod_789",
      "quantity": 2,
      "sellingPrice": 25.00,
      "packType": "UNIT",
      "packId": null
    }
  ],
  "paymentMethod": "CASH",
  "source": "store", // or "website"
  "tax": 5.00,
  "allowance": 2.00,
  "generateInvoice": true,
  "cashierName": "Jane Smith",
  
  // NEW: Shipping Address Fields (Optional)
  "useCustomerAddress": false, // true to use customer address as shipping
  "shippingAddress": "456 Oak Street",
  "shippingCountry": "USA",
  "shippingCity": "New York",
  "shippingZipCode": "10001",
  "shippingStreet": "456 Oak Street, Apt 2B",
  
  // NEW: Driver Assignment Fields (Optional)
  "assignedDriverId": "driver_123", // Optional - assign for immediate delivery
  "assignedDriverName": "Mike Johnson" // Required if assignedDriverId provided
}
```

**Shipping Address Logic:**
- If `useCustomerAddress: true` → Use customer's address as shipping address
- If `useCustomerAddress: false` → Use provided shipping address fields
- All shipping fields are optional and can be null

**Driver Assignment Logic:**
- If driver is assigned during creation → Sale status becomes `SHIPPED`
- OrderProcessing record is automatically created
- Driver can immediately start delivery process
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "sale": {
      "id": "sale_123",
      "totalAmount": 48.00,
      "status": "COMPLETED", // "PENDING" for website orders, "SHIPPED" if driver assigned
      "confirmation": "CONFIRMED",
      // NEW: Shipping address fields (if provided)
      "shippingAddress": "456 Oak Street",
      "shippingCountry": "USA", 
      "shippingCity": "New York",
      "shippingZipCode": "10001",
      "shippingStreet": "456 Oak Street, Apt 2B",
      // NEW: Driver assignment fields (if assigned)
      "assignedDriverId": "driver_123",
      "assignedDriverName": "Mike Johnson"
    },
    "customer": {
      "id": "customer_456",
      "customerName": "John Doe",
      "phoneNumber": "+1234567890"
    },
    "saleItems": [...],
    "profitAmount": 15.00
  }
}
```

### 2. Get All Sales
**GET** `/api/v1/sales`

Retrieves paginated list of sales with advanced filtering options.

**Description:** Fetches sales with comprehensive filtering, pagination, and related data (customer, items, user info). Perfect for sales dashboards and reporting.

**Query Parameters:**
```javascript
{
  "storeId": "store_123", // Required
  "page": 1,
  "limit": 20,
  "customerId": "customer_456", // Optional filter
  "status": "COMPLETED", // Optional filter
  "paymentMethod": "CASH", // Optional filter
  "dateFrom": "2025-01-01", // Optional filter
  "dateTo": "2025-01-31" // Optional filter
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "sales": [
      {
        "id": "sale_123",
        "customer": {
          "id": "customer_456",
          "customerName": "John Doe",
          "phoneNumber": "+1234567890"
        },
        "totalAmount": 48.00,
        "paymentMethod": "CASH",
        "status": "COMPLETED",
        "saleItems": [...],
        "user": {...},
        "createdAt": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalCount": 150,
      "totalPages": 8
    }
  }
}
```

### 3. Get Sale by ID
**GET** `/api/v1/sales/:id`

Retrieves detailed information for a specific sale.

**Description:** Fetches complete sale details including customer info, sale items, invoices, returns, and user information. Use for sale detail views.

**Path Parameters:**
- `id`: Sale ID

**Query Parameters:**
- `storeId`: Store ID (required)

**Response:**
```javascript
{
  "success": true,
  "data": {
    "id": "sale_123",
    "customer": {...},
    "totalAmount": 48.00,
    "saleItems": [...],
    "invoices": [...],
    "returns": [...],
    "user": {...},
    "status": "COMPLETED",
    "createdAt": "2025-01-15T10:30:00Z"
  }
}
```

### 4. Update Sale
**PUT** `/api/v1/sales/:id`

Updates an existing sale with inventory adjustment.

**Description:** Modifies sale details with automatic inventory management. If sale items are updated, old inventory is restored and new inventory is deducted.

**Path Parameters:**
- `id`: Sale ID

**Request Body:**
```javascript
{
  "storeId": "store_123", // Required in query or body
  "paymentMethod": "CREDIT_CARD",
  "totalAmount": 55.00,
  "tax": 7.00,
  "allowance": 3.00,
  "status": "COMPLETED",
  "cashierName": "John Cashier",
  "saleItems": [...] // Optional - triggers inventory update
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "id": "sale_123",
    "totalAmount": 55.00,
    "paymentMethod": "CREDIT_CARD",
    // ... updated sale data
  }
}
```

### 5. Delete Sale
**DELETE** `/api/v1/sales/:id`

Deletes a sale and restores inventory.

**Description:** Permanently deletes a sale and all related records (items, returns, invoices, balance entries) while restoring inventory quantities.

**Path Parameters:**
- `id`: Sale ID

**Query Parameters:**
- `storeId`: Store ID (required)

**Response:**
```javascript
{
  "success": true,
  "data": {
    "message": "Sale deleted successfully and inventory restored"
  }
}
```

### 6. Delete All Sales
**DELETE** `/api/v1/sales/all`

Deletes all sales for a store and restores inventory.

**Description:** Bulk operation to delete all sales in a store. Use with caution - typically for testing or store closure scenarios.

**Query Parameters:**
- `storeId`: Store ID (required)

**Response:**
```javascript
{
  "success": true,
  "data": {
    "message": "All sales deleted successfully. 150 sales deleted and inventory restored",
    "deletedCount": 150,
    "inventoryItemsRestored": 300
  }
}
```

---

## 📈 Sales History & Activity Tracking

### 7. Get Sales History
**GET** `/api/v1/sales/history`

Retrieves comprehensive sales activity log with advanced filtering.

**Description:** **[RESTRICTED: Super Admin & Store Admin Only]** Fetches detailed activity history for sales operations including creation, updates, status changes, returns, and order processing events. Only shows current store's activities.

**Query Parameters:**
```javascript
{
  "storeId": "store_123", // Required
  "page": 1,
  "limit": 20,
  "saleId": "sale_123", // Optional filter
  "userId": "user_456", // Optional filter
  "activityType": "SALE_CREATED", // Optional filter
  "dateFrom": "2025-01-01T00:00:00Z",
  "dateTo": "2025-01-31T23:59:59Z",
  "search": "customer name or description" // Optional search
}
```

**Activity Types:**
- `SALE_CREATED`, `SALE_UPDATED`, `SALE_DELETED`
- `STATUS_CHANGED`, `RETURN_PROCESSED`, `PAYMENT_UPDATED`
- `ORDER_PROCESSING_CREATED`, `ORDER_SENT_FOR_VALIDATION`, `ORDER_VALIDATED`

**Response:**
```javascript
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "history_123",
        "saleId": "sale_456",
        "userId": "user_789",
        "activityType": "SALE_CREATED",
        "description": "Sale created for customer John Doe",
        "metadata": {
          "totalAmount": 48.00,
          "paymentMethod": "CASH",
          "customerName": "John Doe",
          "itemCount": 3
        },
        "createdAt": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalCount": 250,
      "totalPages": 13
    },
    "summary": {
      "totalActivities": 250,
      "activityBreakdown": {
        "SALE_CREATED": 50,
        "STATUS_CHANGED": 75,
        "RETURN_PROCESSED": 25
      }
    }
  }
}
```

---

## 🔄 Order Status Management

### 8. Change Sale Status
**PATCH** `/api/v1/sales/:id/status`

Updates sale status with automatic workflow management.

**Description:** Changes sale status following business rules. When status becomes "SHIPPED", automatically creates OrderProcessing record for driver workflow.

**Path Parameters:**
- `id`: Sale ID

**Request Body:**
```javascript
{
  "status": "SHIPPED", // Required: PENDING, CONFIRMED, PICKED, PACKED, SHIPPED, DELIVERED, CANCELLED
  "storeId": "store_123", // Required
  "driverId": "driver_123", // Required for SHIPPED status
  "driverName": "John Driver", // Required for SHIPPED status
  "notes": "Order ready for delivery" // Optional
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "sale": {
      "id": "sale_123",
      "status": "SHIPPED",
      "updatedAt": "2025-01-15T14:30:00Z"
    },
    "orderProcessing": {
      "id": "order_456",
      "driverId": "driver_123",
      "status": "SHIPPED",
      "createdAt": "2025-01-15T14:30:00Z"
    },
    "message": "Sale status updated to SHIPPED and order processing created"
  }
}
```

### 9. Get Available Statuses
**GET** `/api/v1/sales/:id/available-statuses`

Gets valid next statuses for a sale based on current status.

**Description:** Returns list of statuses that a sale can transition to based on business rules and current state.

**Path Parameters:**
- `id`: Sale ID

**Query Parameters:**
- `storeId`: Store ID (required)

**Response:**
```javascript
{
  "success": true,
  "data": {
    "currentStatus": "CONFIRMED",
    "availableStatuses": [
      {
        "status": "PICKED",
        "description": "Mark as picked from inventory",
        "requiresDriver": false
      },
      {
        "status": "CANCELLED",
        "description": "Cancel this order",
        "requiresDriver": false
      }
    ]
  }
}
```

---

## 🚚 Order Processing & Driver Workflow

### 10. Create Order Processing
**POST** `/api/v1/sales/:id/order-processing`

Creates order processing record for driver assignment.

**Description:** Manually creates order processing for driver workflow. Usually auto-created when sale status becomes "SHIPPED".

**Path Parameters:**
- `id`: Sale ID

**Request Body:**
```javascript
{
  "storeId": "store_123",
  "driverId": "driver_123",
  "driverName": "John Driver",
  "expectedDeliveryDate": "2025-01-16T10:00:00Z", // Optional
  "notes": "Handle with care" // Optional
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "id": "order_456",
    "saleId": "sale_123",
    "customerId": "customer_789",
    "customerName": "John Doe",
    "driverId": "driver_123",
    "driverName": "John Driver",
    "status": "SHIPPED",
    "isValidated": false,
    "createdAt": "2025-01-15T14:30:00Z"
  }
}
```

### 11. Update Order Processing (Driver Reports Delivery)
**PATCH** `/api/v1/sales/:id/order-processing`

Driver updates order processing with delivery details.

**Description:** **[Driver Mobile App Endpoint]** Driver reports delivery completion, payment received, and sends for admin validation.

**Path Parameters:**
- `id`: Sale ID

**Request Body:**
```javascript
{
  "storeId": "store_123",
  "paymentAmount": 48.00, // Optional - payment received from customer
  "paymentType": "CASH", // Optional: CASH, CARD, MOBILE_MONEY
  "status": "SENT_FOR_VALIDATION", // Required: SENT_FOR_VALIDATION
  "deliveryNotes": "Customer paid in cash, delivered successfully", // Optional
  "deliveryDate": "2025-01-16T15:30:00Z" // Optional
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "id": "order_456",
    "paymentAmount": 48.00,
    "paymentType": "CASH",
    "status": "SENT_FOR_VALIDATION",
    "deliveryNotes": "Customer paid in cash, delivered successfully",
    "updatedAt": "2025-01-16T15:30:00Z",
    "message": "Order sent for validation successfully"
  }
}
```

### 12. Get Order Processing Details
**GET** `/api/v1/sales/order-processing/:id`

Retrieves order processing information for a sale.

**Description:** Fetches current order processing status, driver details, and delivery information. Used by both driver apps and admin dashboards.

**Path Parameters:**
- `id`: Sale ID

**Query Parameters:**
- `storeId`: Store ID (required)

**Response:**
```javascript
{
  "success": true,
  "data": {
    "id": "order_456",
    "saleId": "sale_123",
    "customerId": "customer_789",
    "customerName": "John Doe",
    "driverId": "driver_123",
    "driverName": "John Driver",
    "paymentAmount": 48.00,
    "paymentType": "CASH",
    "status": "SENT_FOR_VALIDATION",
    "isValidated": false,
    "validatorId": null,
    "deliveryNotes": "Customer paid in cash, delivered successfully",
    "validationNotes": null,
    "expectedDeliveryDate": "2025-01-16T10:00:00Z",
    "deliveryDate": "2025-01-16T15:30:00Z",
    "createdAt": "2025-01-15T14:30:00Z",
    "updatedAt": "2025-01-16T15:30:00Z"
  }
}
```

### 13. Validate Order Processing (Admin Validation)
**PATCH** `/api/v1/sales/:id/order-processing/validate`

Admin validates driver's delivery report.

**Description:** **[Admin Dashboard Endpoint]** Admin reviews and approves/rejects driver's delivery report. Upon validation, sale status becomes "DELIVERED" and customer balance is updated.

**Path Parameters:**
- `id`: Sale ID

**Request Body:**
```javascript
{
  "storeId": "store_123",
  "status": "VALIDATED", // Required: VALIDATED or PENDING_VALIDATION
  "validatorId": "admin_456", // Required
  "validationNotes": "Payment amount verified, delivery confirmed", // Optional
  "adjustedPaymentAmount": 48.00 // Optional - if payment amount needs adjustment
}
```

**Response:**
```javascript
{
  "success": true,
  "data": {
    "id": "order_456",
    "status": "VALIDATED",
    "isValidated": true,
    "validatorId": "admin_456",
    "validationNotes": "Payment amount verified, delivery confirmed",
    "validatedAt": "2025-01-16T16:00:00Z",
    "sale": {
      "id": "sale_123",
      "status": "DELIVERED" // Auto-updated upon validation
    },
    "message": "Order validated successfully and sale marked as delivered"
  }
}
```

### 14. Bulk Assign Driver to Multiple Sales
**PATCH** `/api/v1/sales/assign-driver?storeId={storeId}`

Assign multiple sales to a single driver for bulk delivery.

**Description:** Allows assigning multiple sales to one driver in a single operation. Perfect for optimizing delivery routes and driver workload management. Automatically creates OrderProcessing records and updates sale statuses to SHIPPED.

**Query Parameters:**
- `storeId`: Store ID (required)

**Request Body:**
```javascript
{
  "saleIds": ["sale_123", "sale_456", "sale_789"],
  "driverId": "driver_123",
  "driverName": "Mike Johnson"
}
```

**Response:**
```javascript
{
  "success": true,
  "message": "Sales assigned to driver successfully",
  "data": {
    "assignedSales": 3,
    "driverAssigned": "Mike Johnson",
    "saleIds": ["sale_123", "sale_456", "sale_789"],
    "newStatus": "SHIPPED",
    "message": "Successfully assigned 3 sales to driver Mike Johnson"
  }
}
```

**Business Rules:**
- Only sales with status `PENDING`, `CONFIRMED`, `PICKED`, or `PACKED` can be assigned
- Sales already assigned to a driver will be rejected
- All sales must belong to the specified store
- OrderProcessing records are automatically created for each sale

---

## 🔍 Query & Filter Examples

### Driver Mobile App Queries

**Get driver's assigned orders:**
```javascript
GET /api/v1/order-processing?driverId=driver_123&status=SHIPPED
```

**Get orders pending validation:**
```javascript
GET /api/v1/order-processing?status=SENT_FOR_VALIDATION
```

### Admin Dashboard Queries

**Get recent sales for store:**
```javascript
GET /api/v1/sales?storeId=store_123&page=1&limit=20&dateFrom=2025-01-01
```

**Get sales history for audit:**
```javascript
GET /api/v1/sales/history?storeId=store_123&activityType=STATUS_CHANGED&dateFrom=2025-01-01
```

**Get completed sales for reporting:**
```javascript
GET /api/v1/sales?storeId=store_123&status=DELIVERED&paymentMethod=CASH
```

---

## 🔐 Access Control

### Role-Based Access:

**Super Admin & Store Admin Only:**
- GET `/api/v1/sales/history` - Sales history and activity logs

**Driver Role:**
- PATCH `/api/v1/sales/:id/order-processing` - Report delivery

**All Authenticated Users:**
- All other sales endpoints (filtered by store access)

### Store-Level Security:
- All endpoints are automatically filtered by user's store access
- Users can only see/modify data from their assigned stores
- Multi-tenant isolation is enforced at the database level

---

## 🚀 Integration Tips

### 1. Error Handling
```javascript
try {
  const response = await fetch('/api/v1/sales', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(saleData)
  });
  
  const result = await response.json();
  
  if (!result.success) {
    // Handle API error
    console.error('API Error:', result.message);
    return;
  }
  
  // Handle success
  console.log('Sale created:', result.data);
} catch (error) {
  // Handle network error
  console.error('Network Error:', error);
}
```

### 2. Real-time Updates
Consider implementing WebSocket connections for:
- Order status changes
- New validation requests
- Driver location updates

### 3. Caching Strategy
Cache the following for better performance:
- Available statuses (refresh every 5 minutes)
- Store configuration
- User permissions

### 4. Pagination Handling
```javascript
const loadMoreSales = async (page) => {
  const response = await fetch(`/api/v1/sales?storeId=${storeId}&page=${page}&limit=20`);
  const result = await response.json();
  
  return {
    sales: result.data.sales,
    hasMore: result.data.pagination.page < result.data.pagination.totalPages
  };
};
```

---

## � New Features Added

### Shipping Address Management
- **Optional shipping address fields** in sale creation
- **Use customer address option** with `useCustomerAddress: true`
- **Custom shipping address** with individual fields for full flexibility
- All shipping fields are optional and stored directly in the sale record

### Driver Assignment at Sale Creation
- **Immediate driver assignment** during sale creation
- **Automatic status change** to SHIPPED when driver assigned
- **OrderProcessing record creation** happens automatically
- Skip manual status transitions for urgent deliveries

### Bulk Driver Assignment
- **Assign multiple sales** to one driver in single operation
- **Efficient route planning** for delivery optimization
- **Batch processing** with validation and error handling
- **Automatic OrderProcessing** records for all assigned sales

### Enhanced Workflow Options
1. **Traditional Flow:** Create Sale → Change Status → Assign Driver → Deliver
2. **Express Flow:** Create Sale with Driver Assignment → Driver Delivers
3. **Bulk Flow:** Create Multiple Sales → Bulk Assign Driver → Optimize Routes

---

## �📱 Mobile App Integration

### Driver App Key Features:
1. **Order List:** GET orders assigned to driver
2. **Order Details:** GET specific order processing details
3. **Report Delivery:** PATCH with delivery status and payment info
4. **Real-time Updates:** WebSocket for new assignments

### Admin Dashboard Key Features:
1. **Sales Dashboard:** GET sales with filtering and pagination
2. **Validation Queue:** GET orders pending validation
3. **Sales History:** GET activity logs for audit trail
4. **Status Management:** PATCH to change order statuses

---

## 🔧 Development Environment Setup

Before testing these APIs:

1. **Run Database Migration:**
```bash
npx prisma db push
npx prisma generate
```

2. **Test Authentication:**
Ensure you have valid JWT tokens for testing

3. **Seed Test Data:**
Create sample stores, users, and products for testing

4. **Test Endpoints:**
Start with basic CRUD operations, then test the workflow

---

## 📞 Support & Questions

For integration support or questions about specific endpoints:
1. Check the Swagger documentation at `/api/docs`
2. Review the error messages in API responses
3. Test with smaller data sets first
4. Contact the backend development team

**Happy Integration! 🚀**
