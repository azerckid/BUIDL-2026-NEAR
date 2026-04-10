CREATE TABLE `auth_nonces` (
	`nonce` text PRIMARY KEY NOT NULL,
	`wallet_address` text NOT NULL,
	`expires_at` integer NOT NULL
);
