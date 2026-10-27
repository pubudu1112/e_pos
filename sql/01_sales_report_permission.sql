INSERT INTO permission (code, name, description)
SELECT
  'REPORT_SALES_VIEW',
  'View Sales Report',
  'View sales reports and AI sales analysis'
WHERE NOT EXISTS (
  SELECT 1 FROM permission WHERE code = 'REPORT_SALES_VIEW'
);
