# SWP391 Parking System - Backend Specification

## I. User Requirements
### Functional Requirements
FR-1 Authentication & Account Management
FR-2 User Role Management
FR-3 Vehicle Management
FR-4 Parking Infrastructure Management
FR-5 Vehicle Type Management
FR-6 Booking Management
FR-7 Parking Session Management
FR-8 Ticket Management
FR-9 Gate Log Management
FR-10 OCR License Plate Recognition
FR-11 Pricing Policy Management
FR-12 Payment Processing
FR-13 Request Management
FR-14 Exception Case Management
FR-15 Notification Management
FR-16 Staff Shift Management
FR-17 Activity Logging
FR-18 System Configuration
FR-19 Report Management

## II. Non-Functional Requirements
NFR-1 Performance
NFR-2 Security
NFR-3 Authorization
NFR-4 Reliability
NFR-5 Data Integrity
NFR-6 Availability
NFR-7 Usability
NFR-8 Compatibility
NFR-9 Maintainability
NFR-10 Scalability
NFR-11 OCR Accuracy
NFR-12 Auditability
NFR-13 Notification Reliability
NFR-14 Backup & Recovery
NFR-15 Configurability

## III. Functional Requirement Specifications
### FRS-01 Authentication & Account Management
- Account registration, login, logout
- Password reset and profile management

### FRS-02 Booking Management
- Reserve parking slots
- Validate availability
- Send booking notifications

### FRS-03 Parking Session Management
- Vehicle entry and exit processing
- Ticket verification
- Gate logging

### FRS-04 OCR License Plate Recognition
- OCR plate recognition
- Staff verification

### FRS-05 Fee Calculation & Payment Processing
- Calculate parking fee
- Process payments
- Generate receipts

### FRS-06 Request & Exception Case Management
- User requests
- Lost ticket / exception handling

### FRS-07 Notification Management
- Event notifications
- Email/In-app notifications

### FRS-08 Report Management
- Revenue reports
- Operational reports

## IV. Flowcharts
- Authentication
- User Role Management

## V. UI
(UI Mockups)

## VI. Database Design
(Database Diagrams)

## VII. Package Design
controller, service, repository, entity, dto, security, config,
booking, parking, payment, request, exception, ocr,
notification, scheduler, audit

## VIII. Class Diagrams
1. Authentication
2. Parking Infrastructure
3. Vehicle, Booking & Parking Session
4. OCR, Payment, Request & Notification
5. Staff Shift & System Configuration
