# 🗺️ Multi-Branch FSM: Screen Roadmap & Wireframes

This document outlines the complete user journey and screen-by-screen breakdown for the entire Field Service Management system, including the current completion status.

---

## 🖥️ 1. Web Admin Panel (Next.js)
*The centralized command center for Master Admins and Branch Admins.*

### 🟢 Completed Screens & Rough Designs

**1. Admin Login**
```text
+-----------------------------------+
|            FSM Admin              |
|        Sign in to manage          |
|                                   |
|  Email:    [ admin@fsm.com   ]    |
|  Password: [ *********       ]    |
|                                   |
|        [   Sign In   ]            |
+-----------------------------------+
```

**2. Master Dashboard**
```text
+-----------------------------------------------------------+
| ☰ FSM Admin | Welcome, Master Admin           [Log Out] |
+-------------+---------------------------------------------+
| Dashboard   | Overview                                    |
| Locations   | +-------------+ +-------------+ +---------+ |
| Users       | | Revenue     | | Customers   | | Techs   | |
| Services    | | ₹ 45,000    | | 124         | | 18      | |
| Bookings    | +-------------+ +-------------+ +---------+ |
| Settings    |                                             |
|             | +-------------+ +-------------+             |
|             | | Pending Jobs| | Completed   |             |
|             | | 12          | | 89          |             |
|             | +-------------+ +-------------+             |
+-------------+---------------------------------------------+
```

- **[x] Locations Management**: Tables and forms to add/manage Cities and Branches.
- **[x] Users & Techs Management**: Interface to register Branch Admins and Technicians, assigning them to specific branches.
- **[x] Service Catalog**: Management of Service Categories (Electrical, IT) and individual services with base pricing.
- **[x] Bookings & Jobs**: Global view of all customer bookings, their statuses, and assigned technicians.
- **[x] System Settings**: Global configuration for Company Name, GST Number, and Invoice Prefixes.

### 🟡 Pending Screens
- **[ ] Reporting Engine**: Exportable PDF/CSV reports for financial audits and technician performance.
- **[ ] Invoice Viewer**: A detailed view of generated invoices and payment receipts.

---

## 📱 2. Customer Mobile App (Flutter)
*For end-users to book electrical and IT services, track technicians, and make payments.*

### 🟢 Completed Screens & Rough Designs
**1. Login & Registration (Mobile)**
```text
+-----------------------------------+
|             [ LOGO ]              |
|             FSM APP               |
|                                   |
|                                   |
|   Email:    [ ___________ ]       |
|   Password: [ ___________ ]       |
|                                   |
|       [     LOGIN     ]           |
|                                   |
|   Don't have an account? Sign Up  |
+-----------------------------------+
```
*(Unified auth screen with smart role routing. Stores JWT securely.)*

### 🟡 Pending Screens & Rough Designs

**1. Customer Home (Dashboard)**
```text
+-----------------------------------+
| ☰   Hello, John!             [👤] |
| 📍  Current City: Mumbai          |
+-----------------------------------+
| 🔍 Search for services...         |
+-----------------------------------+
| [ Promo Banner - 20% OFF! ]       |
+-----------------------------------+
| Categories                        |
| +--------+  +--------+  +-------+ |
| |   ⚡️   |  |   💻   |  |   🚰  | |
| | Elect. |  |   IT   |  | Plumb | |
| +--------+  +--------+  +-------+ |
+-----------------------------------+
| Recommended Services              |
| - AC Repair          ₹499  [Add]  |
| - Fan Installation   ₹199  [Add]  |
+-----------------------------------+
| 🏠 Home | 📅 Bookings | ⚙️ Profile|
+-----------------------------------+
```

**2. Booking Wizard**
```text
+-----------------------------------+
| ←   Book: AC Repair               |
+-----------------------------------+
| 1. Select Date & Time             |
| [ Today ] [ Tomorrow ] [ 12 Oct ] |
| [ 10 AM ] [ 1 PM ] [ 4 PM ]       |
|                                   |
| 2. Address Details                |
| [ Use Current GPS Location 📍 ]   |
| Flat / House No: [____________]   |
|                                   |
| 3. Problem Description            |
| [ Type issue here...          ]   |
| [ 📷 Upload Image (Optional)  ]   |
+-----------------------------------+
| Total: ₹499                       |
| [     CONFIRM BOOKING       ]     |
+-----------------------------------+
```

- **[ ] Splash / Onboarding**
- **[ ] Service List**: Display services under a selected category with base pricing and descriptions.
- **[ ] My Bookings (History)**: Tabbed view showing `Active`, `Pending`, and `Completed` service requests.
- **[ ] Booking Details**: Status tracker (Assigned, Tech En Route, Started, Completed).
- **[ ] Invoice & Payment Checkout**: View the final quotation/invoice and proceed to pay via gateway (UPI/Card).
- **[ ] User Profile**: Manage saved addresses, phone numbers, and view wallet/credits.

---

## 🛠️ 3. Technician Mobile App (Flutter)
*For field workers to receive jobs, navigate to customers, and execute services.*

### 🟢 Completed Screens
- **[x] Login**: Unified auth screen (shared with Customer app). Identifies role as `TECHNICIAN`.

### 🟡 Pending Screens & Rough Designs

**1. Technician Home (Job Board)**
```text
+-----------------------------------+
| ☰   Tech Panel               [🟢] |
| Welcome, Rahul (Online)           |
+-----------------------------------+
| Today's Assigned Jobs (2)         |
+-----------------------------------+
| [NEW] Job: BKG-1045               |
| AC Repair - 10:00 AM              |
| 📍 Andheri West, Mumbai           |
| [ ACCEPT JOB ]  [ REJECT JOB ]    |
+-----------------------------------+
| [ACCEPTED] Job: BKG-1012          |
| Fan Installation - 02:00 PM       |
| 📍 Bandra East, Mumbai            |
| [ VIEW DETAILS ]                  |
+-----------------------------------+
| 🏠 Jobs | 💰 Earnings | ⚙️ Profile|
+-----------------------------------+
```

**2. Job Execution Workflow**
```text
+-----------------------------------+
| ←   Job BKG-1012 (In Progress)    |
+-----------------------------------+
| Customer: John Doe (📞 Call)      |
| Service: Fan Installation         |
+-----------------------------------+
| 1. Arrival                        |
| [ MARK EN ROUTE ] [ ARRIVED ]     |
|                                   |
| 2. Execution                      |
| [ START JOB ] (Logs time)         |
|                                   |
| 3. Add Material Costs (Optional)  |
| - Wire 2m: ₹100             [+]   |
|                                   |
| 4. Final Verification             |
| [ 📷 Upload "After" Photo   ]     |
| [ ✍️ Customer Signature     ]     |
+-----------------------------------+
| [    GENERATE INVOICE       ]     |
+-----------------------------------+
```

- **[ ] My Earnings / History**: Summary of completed jobs and total revenue generated for the branch.
- **[ ] Profile**: View assigned branch, update availability status (Online/Offline).
