# Offline Billing System - Backend

A production-grade, modular monolith backend for an **Offline Billing System** built with **Java 17 / Spring Boot 3 / PostgreSQL 18**.

Designed for local/on-premise retail and wholesale billing without requiring an active internet connection.

---

## 1. Technology Stack

* **Language & Framework:** Java 17+, Spring Boot 3.3.3
* **Database & ORM:** PostgreSQL 18, Spring Data JPA, Hibernate 6
* **Database Migrations:** Flyway (`flyway-core`, `flyway-database-postgresql`)
* **Security:** Spring Security (Stateless JWT authentication & BCrypt password encryption)
* **Validation:** Jakarta Bean Validation (`spring-boot-starter-validation`)
* **Code Utilities:** Project Lombok
* **Testing:** JUnit 5, Spring Boot Test

---

## 2. Architecture & Design Principles

* **Modular Monolith:** Single, highly cohesive on-premise application without microservice or distributed-system overhead.
* **Flyway Schema Ownership:** Hibernate `ddl-auto` is strictly set to `validate`. Flyway is the sole owner of all schema changes across 17 ordered migrations.
* **Financial & Inventory Precision:**
  * Monetary amounts: `NUMERIC(15, 2)` (no floating point errors)
  * Quantities: `NUMERIC(12, 3)` (milligram/milliliter accuracy)
  * Tax rates: `NUMERIC(5, 2)`
* **Historical Snapshot Integrity:** Line items store historical snapshots of product name, SKU, HSN code, unit price, and tax rate at invoice creation time so subsequent master catalog changes never mutate past invoices.
* **Concurrency-Safe Stock Updates:** Uses `SELECT ... FOR UPDATE` in deterministic ID order with database `CHECK (quantity >= 0.000)` constraints to eliminate race conditions and overselling.
* **Gapless Invoice Numbering:** Dedicated `invoice_sequences` table with pessimistic row locks generates contiguous invoice numbers per financial year.

---

## 3. Database Schema Overview (16 Core Tables)

1. `roles` — Authorization roles (`ADMIN`, `MANAGER`, `BILLER`, `INVENTORY_MANAGER`)
2. `employees` — Business staff registry with soft-deactivation flags
3. `users` — Authentication credentials mapped to employees
4. `categories` — Product catalog categories
5. `units` — Measurement units (`pcs`, `kg`, `g`, `L`, `box`, `pack`)
6. `tax_rates` — GST tax slabs (Exempt, 5%, 12%, 18%, 28%)
7. `products` — Product catalog with price, reorder, and stock tracking limits
8. `customers` — Customer master with phone index and GSTIN
9. `invoices` — Invoice header records with financial totals and statuses
10. `invoice_items` — Invoice line items with immutable snapshots
11. `payments` — Settlement records (`CASH`, `CARD`, `UPI`, `BANK_TRANSFER`)
12. `stock` — Real-time on-hand inventory balances with optimistic versioning
13. `stock_movements` — Complete historical inventory movement audit ledger
14. `invoice_sequences` — Monotonic sequence counters per financial year
15. `company_settings` — Business profile singleton (`CHECK (id = 1)`)
16. `audit_logs` — Tamper-proof append-only ledger protected by database trigger

---

## 4. Configuration

The application connects to your existing local PostgreSQL database. Configuration is externalized in `src/main/resources/application-dev.yml`:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5432}/${DB_NAME:offline_billing_db}
    username: ${DB_USERNAME:postgres}
    password: ${DB_PASSWORD:narenrajaa312}
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  flyway:
    enabled: true
```

---

## 5. API Endpoints

### Authentication
* `POST /api/v1/auth/login` — Authenticate and obtain JWT token
  * Request: `{"username": "admin", "password": "Admin@Offline123"}`
  * Response: `{"token": "<jwt>", "userId": 1, "username": "admin", "role": "ADMIN"}`

### Invoices (Billing)
* `POST /api/v1/invoices` — Create an invoice (atomic 10-step transaction)
* `GET /api/v1/invoices/{id}` — Retrieve invoice by ID
* `GET /api/v1/invoices/number/{invoiceNumber}` — Retrieve invoice by invoice number
* `GET /api/v1/invoices` — List invoices with optional status/date filters

### Products
* `POST /api/v1/products` — Create a new product and initialize stock (Admin/Manager)
* `GET /api/v1/products` — Search and list products with pagination
* `GET /api/v1/products/{id}` — Get product details including current stock

### Customers
* `POST /api/v1/customers` — Register a customer
* `GET /api/v1/customers` — Search customers by name, phone, or code
* `GET /api/v1/customers/{id}` — Get customer details

### Stock
* `POST /api/v1/stock/adjust` — Manual inventory adjustment (`ADJUSTMENT_IN`, `DAMAGE`, etc.)

---

## 6. How to Build & Run

### Prerequisites
* Java 17 or higher
* PostgreSQL 14+ (already deployed and running on `localhost:5432`)

### Running with Maven
```bash
# Build package
mvn clean package

# Run Spring Boot backend
mvn spring-boot:run
```
The server will start on `http://localhost:8080/api/v1`.

### Default Bootstrap Admin Account
On first boot, if no administrator account exists in the database, `AdminBootstrapRunner` creates the initial admin user:
* **Username:** `admin`
* **Password:** `Admin@Offline123`
