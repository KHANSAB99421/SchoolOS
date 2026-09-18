# Security Specification for SchoolOS

## 1. Data Invariants
1. A student record cannot exist without a valid parent `schoolId`.
2. A payment record cannot exist without a valid parent `schoolId` and referenced `studentId`.
3. An accountant cannot write or update feeStructures or delete student records.
4. Receipts are scoped exclusively to a school's tenant space.
5. Users can only read and mutate documents within their authenticated `schoolId`.
6. Amounts in payments must be positive numbers.

## 2. The Dirty Dozen Attack Payloads
1. Cross-tenant student injection (User from School A attempts to create student in School B).
2. Ghost fields in Student document (e.g. inject `isVipSchoolMaster: true`).
3. Privilege Escalation (Accountant attempts to change role to 'admin' in user doc).
4. Negative or NaN payment amount in fee collection.
5. Non-admin attempting to delete or overwrite class fee structures.
6. Spoofed payment receipt number with malicious SQL/script injection string.
7. Unauthenticated user listing all payments.
8. Accountant deleting a student record or school record.
9. Modifying immutable `createdAt` or `studentId` on payments after creation.
10. Overflow string attack (>5000 chars) in student names or remarks.
11. Reading another school's financial report or payment documents.
12. Direct client overwrite of receipt sequence counters without auth.
