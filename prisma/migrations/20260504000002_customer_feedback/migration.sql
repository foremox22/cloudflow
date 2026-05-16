CREATE TABLE "customer_feedback" (
  "id"            TEXT NOT NULL,
  "restaurantId"  TEXT NOT NULL,
  "customerName"  TEXT,
  "rating"        INTEGER,
  "comment"       TEXT NOT NULL,
  "submittedById" TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_feedback_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "customer_feedback"
  ADD CONSTRAINT "customer_feedback_restaurantId_fkey"
    FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "customer_feedback"
  ADD CONSTRAINT "customer_feedback_submittedById_fkey"
    FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
