-- AlterTable: Convert Questionnaire boolean columns to text
ALTER TABLE "Questionnaire"
  ALTER COLUMN "question1" SET DATA TYPE TEXT USING CASE WHEN "question1"::boolean THEN 'true' ELSE 'false' END,
  ALTER COLUMN "question1" SET DEFAULT 'false';

ALTER TABLE "Questionnaire"
  ALTER COLUMN "question2" SET DATA TYPE TEXT USING CASE WHEN "question2"::boolean THEN 'true' ELSE 'false' END,
  ALTER COLUMN "question2" SET DEFAULT 'false';

ALTER TABLE "Questionnaire"
  ALTER COLUMN "question3" SET DATA TYPE TEXT USING CASE WHEN "question3"::boolean THEN 'true' ELSE 'false' END,
  ALTER COLUMN "question3" SET DEFAULT 'false';
