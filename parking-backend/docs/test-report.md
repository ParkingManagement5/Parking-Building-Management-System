# Test Report - ParkSmart Backend
**Date:** 2026-06-24 21:56 ICT
**Result:** BUILD SUCCESS - 38/38 tests passed

## Summary
| Metric | Value |
|--------|-------|
| Total tests | 38 |
| Passed | 38 |
| Failed | 0 |
| Errors | 0 |
| Skipped | 0 |
| Duration | 14.5s |

## Test Suites

### BuildingControllerTest (4 tests)
| # | Test | Result |
|---|------|--------|
| 1 | getAllBuildings | PASS |
| 2 | getBuildingById | PASS |
| 3 | createBuilding | PASS |
| 4 | updateBuilding | PASS |

### VehicleTypeControllerTest (2 tests)
| # | Test | Result |
|---|------|--------|
| 1 | getAllVehicleTypes | PASS |
| 2 | createVehicleType | PASS |

### Be3FlowIntegrationTest (6 tests)
| # | Test | Result |
|---|------|--------|
| 1 | loginShouldReturnJwtForActiveSeedLikeUser | PASS |
| 2 | loginWithWrongPasswordShouldReturn401 | PASS |
| 3 | bookingCreateAndDepositAndEntryFlow | PASS |
| 4 | walkInEntryAndExitAndPaymentFlow | PASS |
| 5 | exitWithoutActiveSessionShouldFail | PASS |
| 6 | driverCannotCallStaffEndpoints | PASS |

### ControllerIntegrationTest (13 tests)
| # | Test | Result |
|---|------|--------|
| 1 | publicEndpointsAccessible | PASS |
| 2 | protectedEndpointsRequireJwt | PASS |
| 3 | driverCanAccessDriverEndpoints | PASS |
| 4 | staffCanAccessStaffEndpoints | PASS |
| 5 | managerCanAccessManagerEndpoints | PASS |
| 6 | adminCanAccessAdminEndpoints | PASS |
| 7 | driverCannotAccessStaffEndpoints | PASS |
| 8 | staffCannotAccessAdminEndpoints | PASS |
| 9 | buildingCrudWorkflow | PASS |
| 10 | floorCrudWorkflow | PASS |
| 11 | zoneCrudWorkflow | PASS |
| 12 | slotCrudWorkflow | PASS |
| 13 | gateCrudWorkflow | PASS |

### ServiceIntegrationTest (12 tests)
| # | Test | Result |
|---|------|--------|
| 1 | buildingServiceShouldCreateAndUpdate | PASS |
| 2 | floorServiceShouldCreateUpdateAndCascadeDelete | PASS |
| 3 | gateServiceShouldCreateUpdateAndFilter | PASS |
| 4 | vehicleTypeServiceShouldCreateUpdateAndDeactivate | PASS |
| 5 | zoneServiceShouldCreateUpdateAndDeleteSlots | PASS |
| 6 | slotServiceShouldCreateUpdateAndQueryByZone | PASS |
| 7 | vehicleServiceShouldCreateAndLookupByPlate | PASS |
| 8 | pricingPolicyServiceShouldCreateUpdateAndFilter | PASS |
| 9 | shiftAndStaffShiftServiceShouldWork | PASS |
| 10 | systemConfigServiceShouldUpsertAndRetrieve | PASS |
| 11 | notificationServiceShouldSendAndMarkAsRead | PASS |
| 12 | exceptionCaseServiceShouldCreateAndResolve | PASS |

### ParkingBackendApplicationTests (1 test)
| # | Test | Result |
|---|------|--------|
| 1 | contextLoads | PASS |

## Environment
- Java: OpenJDK 17.0.18
- Spring Boot: 3.3.5
- Test DB: H2 in-memory (integration tests), MySQL 8.0 (application test)
- Profile: test (integration), dev (application)
