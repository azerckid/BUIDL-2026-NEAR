CREATE TABLE `analysis_results` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`wallet_address` text NOT NULL,
	`risk_profile` text NOT NULL,
	`recommended_product_ids` text NOT NULL,
	`zkp_proof_hash` text,
	`generated_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `analysis_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`wallet_address`) REFERENCES `user_profiles`(`wallet_address`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `analysis_results_session_id_unique` ON `analysis_results` (`session_id`);--> statement-breakpoint
CREATE TABLE `analysis_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`wallet_address` text NOT NULL,
	`file_hash` text NOT NULL,
	`file_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`error_code` text,
	`started_at` integer NOT NULL,
	`tee_entered_at` integer,
	`completed_at` integer,
	`purged_at` integer,
	FOREIGN KEY (`wallet_address`) REFERENCES `user_profiles`(`wallet_address`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `insurance_products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`provider` text NOT NULL,
	`chain_network` text NOT NULL,
	`contract_address` text,
	`monthly_premium_usdc` real NOT NULL,
	`coverage_category` text NOT NULL,
	`risk_targets` text NOT NULL,
	`discount_eligible` integer DEFAULT 0 NOT NULL,
	`original_premium_usdc` real,
	`is_active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `recommendation_carts` (
	`id` text PRIMARY KEY NOT NULL,
	`wallet_address` text NOT NULL,
	`session_id` text NOT NULL,
	`selected_product_ids` text NOT NULL,
	`total_monthly_usdc` real NOT NULL,
	`discount_applied_usdc` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`wallet_address`) REFERENCES `user_profiles`(`wallet_address`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `analysis_sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`wallet_address` text NOT NULL,
	`cart_id` text NOT NULL,
	`tx_hash` text,
	`network` text NOT NULL,
	`amount_usdc` real NOT NULL,
	`confidential_intents_used` integer DEFAULT 1 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`failure_reason` text,
	`created_at` integer NOT NULL,
	`confirmed_at` integer,
	FOREIGN KEY (`wallet_address`) REFERENCES `user_profiles`(`wallet_address`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cart_id`) REFERENCES `recommendation_carts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_cart_id_unique` ON `transactions` (`cart_id`);--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`wallet_address` text PRIMARY KEY NOT NULL,
	`subscription_tier` text DEFAULT 'free' NOT NULL,
	`subscription_expires_at` integer,
	`last_analysis_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
