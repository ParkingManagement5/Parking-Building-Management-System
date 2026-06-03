# Backend Architecture

## 1. Project Overview

**Project Name:** Parking Building Management System

The backend system is responsible for managing:

* User authentication and authorization
* Parking building management
* Vehicle and booking management
* Parking sessions and ticket processing
* Payment management
* OCR vehicle plate recognition
* Request and exception handling
* Staff scheduling
* Reporting and auditing

---

# 2. Technology Stack

## Core Technologies

| Component  | Technology      |
| ---------- | --------------- |
| Language   | Java 17         |
| Framework  | Spring Boot 3.x |
| Build Tool | Maven           |
| Database   | MySQL 8         |
| API Style  | RESTful API     |

## Libraries

* Spring Web
* Spring Data JPA
* Spring Security
* JWT Authentication
* Bean Validation
* Lombok
* MapStruct
* Swagger OpenAPI

---

# 3. Architecture Pattern

The backend follows a layered architecture.

```text
Client
   ↓
Controller Layer
   ↓
Service Layer
   ↓
Repository Layer
   ↓
MySQL Database
```

## Controller Layer

Responsibilities:

* Receive HTTP requests
* Validate request data
* Return API responses

## Service Layer

Responsibilities:

* Implement business logic
* Handle transactions
* Process validations

## Repository Layer

Responsibilities:

* Database access
* CRUD operations
* Query execution

---

# 4. Package Structure

```text
com.swp391.parking

├── config
├── security
├── controller
├── service
│   └── impl
├── repository
├── entity
├── dto
│   ├── request
│   └── response
├── mapper
├── exception
├── util
└── scheduler
```

---

# 5. Environment Configuration

## Application Files

```text
src/main/resources

├── application.yml
├── application-dev.yml
└── application-prod.yml
```

### application.yml

Shared configuration committed to Git.

Contains:

* JPA settings
* JWT configuration
* Common application settings

### application-dev.yml

Local development configuration.

Contains:

* Local database URL
* Username
* Password

This file must not be committed to Git.

---

# 6. Security Design

## Authentication

JWT Token Authentication

### Features

* Login
* Register
* Password Reset
* Token Validation

## Authorization

Role-Based Access Control (RBAC)

### System Roles

* ADMIN
* MANAGER
* STAFF
* DRIVER

## Password Security

* BCrypt Password Encoder

---

# 7. Business Modules

## Authentication Module

Entities:

* User
* Role
* UserRole
* PasswordResetToken

Features:

* Login
* Register
* JWT Authentication
* Password Reset

---

## Parking Infrastructure Module

Entities:

* ParkingBuilding
* Floor
* Zone
* ParkingSlot
* Gate

Features:

* Building Management
* Floor Management
* Zone Management
* Slot Management
* Gate Management

---

## Vehicle & Booking Module

Entities:

* Vehicle
* VehicleType
* Booking

Features:

* Vehicle Registration
* Slot Reservation
* Booking Management
* Booking Expiration

---

## Parking Session Module

Entities:

* ParkingSession
* Ticket
* GateLog
* OCRScan

Features:

* Vehicle Check-In
* Vehicle Check-Out
* Ticket Management
* OCR Verification

---

## Payment Module

Entities:

* PricingPolicy
* Payment

Features:

* Fee Calculation
* Payment Processing
* Revenue Tracking

---

## Request & Exception Module

Entities:

* Request
* ExceptionCase

Features:

* Lost Ticket Handling
* Wrong Fee Handling
* Customer Support Requests
* Exception Resolution

---

## Staff Management Module

Entities:

* Shift
* StaffShift

Features:

* Staff Scheduling
* Shift Assignment

---

## Audit & Configuration Module

Entities:

* ActivityLog
* Notification
* SystemConfig

Features:

* Audit Logging
* Notifications
* System Configuration

---

# 8. Git Branch Strategy

## Main Branches

```text
main
└── backend
```

## Feature Branches

```text
backend
├── feature/auth
├── feature/parking-infra
├── feature/booking-session
├── feature/payment-report
```

### Development Workflow

```text
feature branch
      ↓
Pull Request
      ↓
backend
      ↓
main
```

### Rules

1. Create feature branches from backend.
2. Open Pull Request before merging.
3. At least one team member reviews the code.
4. Do not commit local configuration files.
5. Keep feature branches focused on a single module.

---

# 9. Team Development Plan

## Sprint 1

Authentication & Security

Entities:

* User
* Role
* UserRole
* PasswordResetToken

Deliverables:

* Login API
* Register API
* JWT Authentication
* Role Authorization

---

## Sprint 2

Parking Infrastructure

Entities:

* ParkingBuilding
* Floor
* Zone
* ParkingSlot
* Gate

Deliverables:

* CRUD APIs
* Slot Management

---

## Sprint 3

Vehicle & Booking

Entities:

* Vehicle
* VehicleType
* Booking

Deliverables:

* Vehicle APIs
* Booking APIs
* Booking Expiration Scheduler

---

## Sprint 4

Parking Session

Entities:

* ParkingSession
* Ticket
* GateLog
* OCRScan

Deliverables:

* Check-In APIs
* Check-Out APIs
* OCR Integration

---

## Sprint 5

Payment

Entities:

* PricingPolicy
* Payment

Deliverables:

* Fee Calculation
* Payment APIs
* Revenue Statistics

---

## Sprint 6

Support & Reporting

Entities:

* Request
* ExceptionCase
* Shift
* StaffShift
* ActivityLog
* Notification
* SystemConfig

Deliverables:

* Request Management
* Exception Handling
* Staff Scheduling
* Reports

---

# 10. Coding Standards

* Java 17 syntax
* RESTful API design
* DTO pattern for request/response
* Constructor injection preferred
* Global exception handling
* Swagger documentation for all APIs
* Meaningful commit messages
* Follow clean code principles
