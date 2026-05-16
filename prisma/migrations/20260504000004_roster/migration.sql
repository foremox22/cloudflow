CREATE TYPE "RosterStatus"       AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ShiftConfirmStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'EXCUSED', 'OVERRIDE');
CREATE TYPE "LeaveType"          AS ENUM ('SICK', 'ANNUAL', 'HOLIDAY', 'OTHER');
CREATE TYPE "LeaveStatus"        AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "roster_weeks" (
  "id"           TEXT          NOT NULL,
  "restaurantId" TEXT          NOT NULL,
  "weekStart"    TIMESTAMP(3)  NOT NULL,
  "notes"        TEXT,
  "status"       "RosterStatus" NOT NULL DEFAULT 'DRAFT',
  "publishedAt"  TIMESTAMP(3),
  "createdById"  TEXT          NOT NULL,
  "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)  NOT NULL,
  CONSTRAINT "roster_weeks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "roster_shifts" (
  "id"            TEXT                  NOT NULL,
  "rosterId"      TEXT                  NOT NULL,
  "restaurantId"  TEXT                  NOT NULL,
  "userId"        TEXT                  NOT NULL,
  "date"          TIMESTAMP(3)          NOT NULL,
  "startTime"     TEXT                  NOT NULL,
  "endTime"       TEXT                  NOT NULL,
  "position"      TEXT,
  "notes"         TEXT,
  "confirmStatus" "ShiftConfirmStatus"  NOT NULL DEFAULT 'PENDING',
  "confirmNote"   TEXT,
  "confirmedAt"   TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "roster_shifts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "roster_invites" (
  "id"       TEXT         NOT NULL,
  "rosterId" TEXT         NOT NULL,
  "userId"   TEXT         NOT NULL,
  "token"    TEXT         NOT NULL,
  "sentAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "roster_invites_pkey"              PRIMARY KEY ("id"),
  CONSTRAINT "roster_invites_token_key"         UNIQUE ("token"),
  CONSTRAINT "roster_invites_rosterId_userId_key" UNIQUE ("rosterId", "userId")
);

CREATE TABLE "leave_requests" (
  "id"           TEXT          NOT NULL,
  "restaurantId" TEXT          NOT NULL,
  "userId"       TEXT          NOT NULL,
  "type"         "LeaveType"   NOT NULL,
  "startDate"    TIMESTAMP(3)  NOT NULL,
  "endDate"      TIMESTAMP(3)  NOT NULL,
  "reason"       TEXT,
  "status"       "LeaveStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewNote"   TEXT,
  "reviewedAt"   TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)  NOT NULL,
  CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "roster_weeks"
  ADD CONSTRAINT "roster_weeks_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "roster_weeks_createdById_fkey"  FOREIGN KEY ("createdById")  REFERENCES "users"("id")       ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "roster_shifts"
  ADD CONSTRAINT "roster_shifts_rosterId_fkey"     FOREIGN KEY ("rosterId")     REFERENCES "roster_weeks"("id")  ON DELETE CASCADE  ON UPDATE CASCADE,
  ADD CONSTRAINT "roster_shifts_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id")  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "roster_shifts_userId_fkey"       FOREIGN KEY ("userId")       REFERENCES "users"("id")        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "roster_invites"
  ADD CONSTRAINT "roster_invites_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "roster_weeks"("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  ADD CONSTRAINT "roster_invites_userId_fkey"   FOREIGN KEY ("userId")   REFERENCES "users"("id")        ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "leave_requests"
  ADD CONSTRAINT "leave_requests_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "leave_requests_userId_fkey"       FOREIGN KEY ("userId")       REFERENCES "users"("id")       ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "leave_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id")       ON DELETE SET NULL ON UPDATE CASCADE;
