# Local Testing Runbook

This note records the local startup order used for project testing before demo.

## Services

1. Start backend from `parking-backend`.
2. Start frontend from `parking-frontend`.
3. Start OCR service from `ocr-service`.

## Demo accounts

- admin / Password123!
- manager / Password123!
- staff1 / Password123!
- driver1 / Password123!
- driver2 / Password123!

## Smoke test order

1. Login as driver.
2. Create a booking.
3. Complete deposit payment.
4. Verify booking QR.
5. Login as staff.
6. Process vehicle entry.
7. Process vehicle exit.
8. Complete parking fee payment.
9. Check manager and admin pages.
