ALTER TABLE "app"."Report" ADD CONSTRAINT "valid_latitude" CHECK ("latitude" BETWEEN -90 AND 90);
ALTER TABLE "app"."Report" ADD CONSTRAINT "valid_longitude" CHECK ("longitude" BETWEEN -180 AND 180);
ALTER TABLE "app"."Report" ADD CONSTRAINT "valid_location_accuracy" CHECK ("locationAccuracy" IS NULL OR "locationAccuracy" >= 0);
ALTER TABLE "app"."Report" ADD CONSTRAINT "valid_report_version" CHECK ("version" >= 1);
ALTER TABLE "app"."Upload" ADD CONSTRAINT "valid_upload_bytes" CHECK ("bytes" > 0);
ALTER TABLE "app"."Prediction" ADD CONSTRAINT "valid_prediction_confidence" CHECK ("confidence" BETWEEN 0 AND 1);
ALTER TABLE "app"."Prediction" ADD CONSTRAINT "valid_prediction_duration" CHECK ("durationMs" >= 0);
