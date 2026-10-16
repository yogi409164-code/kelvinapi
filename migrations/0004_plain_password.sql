-- Store passwords as plain text and rename the column.
ALTER TABLE users RENAME COLUMN password_hash TO password;

UPDATE users
SET password = 'biller123'
WHERE email = 'biller@kelvinscale.com';
