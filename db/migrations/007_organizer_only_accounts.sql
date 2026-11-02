UPDATE users SET account_type = 'organizer' WHERE account_type <> 'organizer';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_type_check;
ALTER TABLE users ADD CONSTRAINT users_account_type_check CHECK (account_type = 'organizer');
