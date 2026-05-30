CREATE TABLE `test_pilot_checkouts` (
	`id` text PRIMARY KEY NOT NULL,
	`cart_id` text NOT NULL,
	`wallet_address` text NOT NULL,
	`selected_product_ids` text NOT NULL,
	`total_monthly_usdc` real NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`disclaimer_accepted` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`cart_id`) REFERENCES `recommendation_carts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`wallet_address`) REFERENCES `user_profiles`(`wallet_address`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `test_pilot_checkouts_cart_id_unique` ON `test_pilot_checkouts` (`cart_id`);--> statement-breakpoint
CREATE INDEX `test_pilot_checkouts_wallet_idx` ON `test_pilot_checkouts` (`wallet_address`);