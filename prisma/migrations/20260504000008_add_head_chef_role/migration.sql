ALTER TYPE "Role" ADD VALUE 'HEAD_CHEF' BEFORE 'CHEF';

-- Migrate existing CHEF members to HEAD_CHEF (old Chef is now Head Chef)
UPDATE "user_restaurants" SET role = 'HEAD_CHEF' WHERE role = 'CHEF';
UPDATE "users" SET role = 'HEAD_CHEF' WHERE role = 'CHEF';
