# Vehicle Management System

A Django REST Framework based Vehicle Management System that provides APIs for managing users, drivers, vehicles, and driver-vehicle assignments.

The application supports Admin and Driver roles with JWT authentication.

---

## Features

### Authentication

- User registration
- User login
- JWT authentication
- Access token
- Refresh token
- Admin and Driver roles

### Vehicle Management

- Create vehicle
- List vehicles
- View vehicle details
- Update vehicle
- Delete vehicle
- Vehicle status management
- Vehicle condition management
- Search vehicles
- Filter vehicles
- Ordering
- Pagination

### Driver Management

- Create driver profile
- List drivers
- View driver details
- Update driver
- Delete driver
- Driver license information
- License expiry validation
- Driver availability management
- Search drivers
- Filter drivers
- Ordering
- Pagination

### Driver-Vehicle Assignment

- Assign driver to vehicle
- Prevent duplicate active assignments
- Check driver availability
- Check vehicle availability
- Automatically update driver availability
- Automatically update vehicle status
- Unassign driver and vehicle
- Assignment history
- Search assignments
- Filter assignments
- Pagination
- Database transaction handling

### Admin Dashboard

The system can be integrated with a frontend dashboard to display:

- Total vehicles
- Available vehicles
- Assigned vehicles
- Vehicles under maintenance
- Total drivers
- Available drivers
- Assigned drivers
- Active assignments

---

# Technology Stack

- Python 3.x
- Django
- Django REST Framework
- PostgreSQL / SQLite
- Django Filter
- Simple JWT
- HTML/CSS/JavaScript or React for frontend

---

# Project Structure

```text
vehicle-management/
│
├── manage.py
├── README.md
├── requirements.txt
│
├── config/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   ├── asgi.py
│   └── wsgi.py
│
├── accounts/
│   ├── migrations/
│   ├── admin.py
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   └── urls.py
│
├── vehicles/
│   ├── migrations/
│   ├── admin.py
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── permissions.py
│   └── urls.py
│
├── drivers/
│   ├── migrations/
│   ├── admin.py
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── permissions.py
│   └── urls.py
│
└── assignments/
    ├── migrations/
    ├── admin.py
    ├── models.py
    ├── serializers.py
    ├── views.py
    ├── permissions.py
    └── urls.py



15. Authentication APIs

Authentication uses JWT.

15.1 Login
Endpoint
POST /api/auth/login/
Full URL
http://127.0.0.1:8000/api/auth/login/
Request Headers
Content-Type: application/json
Request Body
{
    "username": "admin",
    "password": "Admin@123"
}
Example Response
{
    "access": "eyJhbGciOiJIUzI1NiIs...",
    "refresh": "eyJhbGciOiJIUzI1NiIs..."
}

Save the access token.

It is required for protected APIs.

16. Refresh Access Token
Endpoint
POST /api/auth/token/refresh/
Request
{
    "refresh": "YOUR_REFRESH_TOKEN"
}
Response
{
    "access": "NEW_ACCESS_TOKEN"
}
17. Authentication Header

For protected APIs use:

Authorization: Bearer ACCESS_TOKEN

Example:

Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
18. User Roles

The system supports two roles.

Admin

Admin can:

Create vehicles
Update vehicles
Delete vehicles
Create drivers
Update drivers
Delete drivers
Assign vehicles
Unassign vehicles
View vehicles
View drivers
View assignments
Driver

Driver can:

Login
View vehicles
View drivers
View assignments

Driver cannot:

Create vehicles
Delete vehicles
Create assignments
Unassign vehicles
19. Vehicle APIs

Base endpoint:

/api/vehicles/
19.1 List Vehicles
Request
GET /api/vehicles/
Example
GET http://127.0.0.1:8000/api/vehicles/
Headers
Authorization: Bearer ACCESS_TOKEN
Example Response
{
    "count": 2,
    "next": null,
    "previous": null,
    "results": [
        {
            "id": 1,
            "vehicle_number": "BR01AB1234",
            "vehicle_type": "Car",
            "model": "Swift",
            "status": "available",
            "condition": "good",
            "created_at": "2026-08-20T10:00:00Z",
            "updated_at": "2026-08-20T10:00:00Z"
        },
        {
            "id": 2,
            "vehicle_number": "BR01CD5678",
            "vehicle_type": "SUV",
            "model": "Creta",
            "status": "assigned",
            "condition": "good",
            "created_at": "2026-08-20T11:00:00Z",
            "updated_at": "2026-08-20T11:30:00Z"
        }
    ]
}
20. Create Vehicle

Admin only.

Endpoint
POST /api/vehicles/
Headers
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
Request
{
    "vehicle_number": "BR01AB1234",
    "vehicle_type": "Car",
    "model": "Swift",
    "status": "available",
    "condition": "good"
}
Response
{
    "id": 1,
    "vehicle_number": "BR01AB1234",
    "vehicle_type": "Car",
    "model": "Swift",
    "status": "available",
    "condition": "good",
    "created_at": "2026-08-20T10:00:00Z",
    "updated_at": "2026-08-20T10:00:00Z"
}
21. Get Vehicle Details
Endpoint
GET /api/vehicles/{id}/

Example:

GET /api/vehicles/1/
Response
{
    "id": 1,
    "vehicle_number": "BR01AB1234",
    "vehicle_type": "Car",
    "model": "Swift",
    "status": "available",
    "condition": "good",
    "created_at": "2026-08-20T10:00:00Z",
    "updated_at": "2026-08-20T10:00:00Z"
}
22. Update Vehicle

Admin only.

Endpoint
PUT /api/vehicles/{id}/

Example:

PUT /api/vehicles/1/
Request
{
    "vehicle_number": "BR01AB1234",
    "vehicle_type": "Car",
    "model": "Swift",
    "status": "available",
    "condition": "fair"
}
23. Partial Update Vehicle
Endpoint
PATCH /api/vehicles/{id}/

Example:

PATCH /api/vehicles/1/
Request
{
    "condition": "fair"
}
Response
{
    "id": 1,
    "vehicle_number": "BR01AB1234",
    "vehicle_type": "Car",
    "model": "Swift",
    "status": "available",
    "condition": "fair",
    "created_at": "2026-08-20T10:00:00Z",
    "updated_at": "2026-08-20T12:00:00Z"
}
24. Delete Vehicle

Admin only.

Endpoint
DELETE /api/vehicles/{id}/

Example:

DELETE /api/vehicles/1/
Response
204 No Content
25. Vehicle Search

Search by vehicle number:

GET /api/vehicles/?search=BR01AB1234

Search by model:

GET /api/vehicles/?search=Swift

Search by vehicle type:

GET /api/vehicles/?search=Car
26. Vehicle Filters

Filter available vehicles:

GET /api/vehicles/?status=available

Filter assigned vehicles:

GET /api/vehicles/?status=assigned

Filter maintenance vehicles:

GET /api/vehicles/?status=maintenance

Filter by condition:

GET /api/vehicles/?condition=good

Multiple filters:

GET /api/vehicles/?status=available&condition=good
27. Vehicle Ordering

Newest vehicles:

GET /api/vehicles/?ordering=-created_at

Oldest vehicles:

GET /api/vehicles/?ordering=created_at

Sort by vehicle number:

GET /api/vehicles/?ordering=vehicle_number
28. Vehicle Pagination

Example:

GET /api/vehicles/?page=2

Example response:

{
    "count": 25,
    "next": "http://127.0.0.1:8000/api/vehicles/?page=3",
    "previous": "http://127.0.0.1:8000/api/vehicles/?page=1",
    "results": []
}
29. Driver APIs

Base endpoint:

/api/drivers/
30. List Drivers
Endpoint
GET /api/drivers/
Response
{
    "count": 2,
    "next": null,
    "previous": null,
    "results": [
        {
            "id": 1,
            "user": 2,
            "username": "rahul",
            "phone": "9876543210",
            "license_number": "DL123456789",
            "license_expiry": "2028-10-20",
            "is_available": true,
            "created_at": "2026-08-20T10:00:00Z",
            "updated_at": "2026-08-20T10:00:00Z"
        }
    ]
}
31. Create Driver

Admin only.

Endpoint
POST /api/drivers/
Request
{
    "user": 2,
    "phone": "9876543210",
    "license_number": "DL123456789",
    "license_expiry": "2028-10-20",
    "is_available": true
}
Response
{
    "id": 1,
    "user": 2,
    "username": "rahul",
    "phone": "9876543210",
    "license_number": "DL123456789",
    "license_expiry": "2028-10-20",
    "is_available": true
}
32. Get Driver
Endpoint
GET /api/drivers/{id}/

Example:

GET /api/drivers/1/
33. Update Driver
Endpoint
PUT /api/drivers/{id}/

Example:

PUT /api/drivers/1/
Request
{
    "user": 2,
    "phone": "9999999999",
    "license_number": "DL123456789",
    "license_expiry": "2028-10-20",
    "is_available": true
}
34. Partial Update Driver
Endpoint
PATCH /api/drivers/{id}/

Example:

{
    "phone": "9999999999"
}
35. Delete Driver

Admin only.

Endpoint
DELETE /api/drivers/{id}/

Example:

DELETE /api/drivers/1/

Response:

204 No Content
36. Driver Search

Search by username:

GET /api/drivers/?search=rahul

Search by phone:

GET /api/drivers/?search=9876543210

Search by license:

GET /api/drivers/?search=DL123456789
37. Driver Filters

Available drivers:

GET /api/drivers/?is_available=true

Unavailable drivers:

GET /api/drivers/?is_available=false
38. Driver Ordering

Newest:

GET /api/drivers/?ordering=-created_at

Oldest:

GET /api/drivers/?ordering=created_at
39. Assignment APIs

Base endpoint:

/api/assignments/

The Assignment module connects drivers and vehicles.

40. List Assignments
Endpoint
GET /api/assignments/
Response
{
    "count": 1,
    "next": null,
    "previous": null,
    "results": [
        {
            "id": 1,
            "driver": 1,
            "driver_name": "rahul",
            "vehicle": 1,
            "vehicle_number": "BR01AB1234",
            "assigned_at": "2026-08-20T12:00:00Z",
            "unassigned_at": null,
            "is_active": true,
            "created_at": "2026-08-20T12:00:00Z",
            "updated_at": "2026-08-20T12:00:00Z"
        }
    ]
}
41. Create Assignment

Admin only.

Endpoint
POST /api/assignments/
Headers
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
Request
{
    "driver": 1,
    "vehicle": 1
}
Successful Response
{
    "id": 1,
    "driver": 1,
    "driver_name": "rahul",
    "vehicle": 1,
    "vehicle_number": "BR01AB1234",
    "assigned_at": "2026-08-20T12:00:00Z",
    "unassigned_at": null,
    "is_active": true,
    "created_at": "2026-08-20T12:00:00Z",
    "updated_at": "2026-08-20T12:00:00Z"
}
42. Assignment Business Logic

When a driver is assigned to a vehicle:

Driver
is_available = false


Vehicle
status = assigned


Assignment
is_active = true

Example:

Before:


Driver Rahul
is_available = true


Vehicle BR01AB1234
status = available

After:

Driver Rahul
is_available = false


Vehicle BR01AB1234
status = assigned


Assignment
is_active = true
43. Prevent Duplicate Driver Assignment

A driver cannot have two active vehicles.

Example:

{
    "driver": 1,
    "vehicle": 2
}

If Driver 1 is already assigned:

{
    "driver": [
        "Driver already has an active vehicle."
    ]
}
44. Prevent Duplicate Vehicle Assignment

A vehicle cannot have two active drivers.

Example:

{
    "driver": 2,
    "vehicle": 1
}

If Vehicle 1 is already assigned:

{
    "vehicle": [
        "Vehicle already has an active driver."
    ]
}
45. Vehicle Maintenance Validation

A vehicle under maintenance cannot be assigned.

If:

Vehicle status = maintenance

and we try:

{
    "driver": 2,
    "vehicle": 1
}

Response:

{
    "vehicle": [
        "Vehicle is not available. Current status: maintenance"
    ]
}
46. Get Assignment Details
Endpoint
GET /api/assignments/{id}/

Example:

GET /api/assignments/1/
47. Unassign Driver and Vehicle

To unassign an active assignment:

Endpoint
PATCH /api/assignments/{id}/

Example:

PATCH /api/assignments/1/
Request
{
    "is_active": false
}
Response
{
    "id": 1,
    "driver": 1,
    "driver_name": "rahul",
    "vehicle": 1,
    "vehicle_number": "BR01AB1234",
    "assigned_at": "2026-08-20T12:00:00Z",
    "unassigned_at": "2026-08-20T15:00:00Z",
    "is_active": false,
    "created_at": "2026-08-20T12:00:00Z",
    "updated_at": "2026-08-20T15:00:00Z"
}

After unassignment:

Driver
is_available = true


Vehicle
status = available


Assignment
is_active = false
48. Assignment History

Get only active assignments:

GET /api/assignments/?is_active=true

Get previous assignments:

GET /api/assignments/?is_active=false
49. Assignment Search

Search by driver:

GET /api/assignments/?search=rahul

Search by vehicle:

GET /api/assignments/?search=BR01AB1234

Search by driver license:

GET /api/assignments/?search=DL123456789
50. Assignment Filters

Filter by driver:

GET /api/assignments/?driver=1

Filter by vehicle:

GET /api/assignments/?vehicle=1

Filter active assignments:

GET /api/assignments/?is_active=true

Example combined filter:

GET /api/assignments/?driver=1&is_active=true
51. Assignment Ordering

Newest assignments:

GET /api/assignments/?ordering=-assigned_at

Oldest assignments:

GET /api/assignments/?ordering=assigned_at
52. Assignment Pagination
GET /api/assignments/?page=2
53. Dashboard API

If a dashboard endpoint is implemented:

GET /api/dashboard/

Example response:

{
    "vehicles": {
        "total": 20,
        "available": 10,
        "assigned": 7,
        "maintenance": 3
    },
    "drivers": {
        "total": 15,
        "available": 8,
        "unavailable": 7
    },
    "assignments": {
        "active": 7
    }
}

This information can be displayed on the frontend dashboard.

54. API Summary
Method	Endpoint	Access	Description
POST	/api/auth/login/	Public	Login
POST	/api/auth/token/refresh/	Public	Refresh JWT
GET	/api/vehicles/	Authenticated	List vehicles
POST	/api/vehicles/	Admin	Create vehicle
GET	/api/vehicles/{id}/	Authenticated	Vehicle details
PUT	/api/vehicles/{id}/	Admin	Update vehicle
PATCH	/api/vehicles/{id}/	Admin	Partial update
DELETE	/api/vehicles/{id}/	Admin	Delete vehicle
GET	/api/drivers/	Authenticated	List drivers
POST	/api/drivers/	Admin	Create driver
GET	/api/drivers/{id}/	Authenticated	Driver details
PUT	/api/drivers/{id}/	Admin	Update driver
PATCH	/api/drivers/{id}/	Admin	Partial update
DELETE	/api/drivers/{id}/	Admin	Delete driver
GET	/api/assignments/	Authenticated	List assignments
POST	/api/assignments/	Admin	Create assignment
GET	/api/assignments/{id}/	Authenticated	Assignment details
PATCH	/api/assignments/{id}/	Admin	Unassign
DELETE	/api/assignments/{id}/	Admin	Delete assignment
GET	/api/dashboard/	Authenticated	Dashboard statistics
55. Complete Assignment Workflow

The recommended testing sequence is:

1. Login
      ↓
2. Get JWT access token
      ↓
3. Create Vehicle
      ↓
4. Create Driver User
      ↓
5. Create Driver Profile
      ↓
6. Assign Driver → Vehicle
      ↓
7. Driver becomes unavailable
      ↓
8. Vehicle becomes assigned
      ↓
9. View Assignment
      ↓
10. Unassign
      ↓
11. Driver becomes available
      ↓
12. Vehicle becomes available
      ↓
13. Assignment becomes inactive
56. Example Complete Workflow
Step 1 - Login
POST /api/auth/login/
{
    "username": "admin",
    "password": "Admin@123"
}
Step 2 - Create Vehicle
POST /api/vehicles/
{
    "vehicle_number": "BR01AB1234",
    "vehicle_type": "Car",
    "model": "Swift",
    "status": "available",
    "condition": "good"
}

Vehicle ID:

1
Step 3 - Create Driver
POST /api/drivers/
{
    "user": 2,
    "phone": "9876543210",
    "license_number": "DL123456789",
    "license_expiry": "2028-10-20",
    "is_available": true
}

Driver ID:

1
Step 4 - Assign
POST /api/assignments/
{
    "driver": 1,
    "vehicle": 1
}

Result:

Driver:
is_available = false


Vehicle:
status = assigned


Assignment:
is_active = true
Step 5 - Unassign
PATCH /api/assignments/1/
{
    "is_active": false
}

Result:

Driver:
is_available = true


Vehicle:
status = available


Assignment:
is_active = false
57. Database Relationships
User
 │
 │ 1
 │
 ▼
Driver
 │
 │ 1
 │
 ▼
Assignment
 │
 │ 1
 │
 ▼
Vehicle

More accurately:

User
  │
  └────── Driver
             │
             │
             ▼
        Assignment
             │
             │
             ▼
          Vehicle

One driver can have multiple historical assignments but only one active assignment.

One vehicle can have multiple historical assignments but only one active assignment.

58. Transaction Safety

Assignment creation is handled using:

transaction.atomic()

The following operations are treated as one transaction:

Create Assignment
       ↓
Update Driver
       ↓
Update Vehicle

If any operation fails, the transaction is rolled back.

This prevents inconsistent data.


For fronend run------- python -m http.server 5500
```
