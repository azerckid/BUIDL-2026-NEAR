CREATE TABLE `insurance_premium_quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`product_source_id` text NOT NULL,
	`carrier_id` text NOT NULL,
	`age` integer,
	`sex` text,
	`source_sex_code` text,
	`payment_cycle` text,
	`payment_period_years` integer,
	`insurance_period_years` integer,
	`coverage_amount_krw` integer,
	`plan_name` text,
	`renewal_type` text,
	`riders_json` text,
	`premium_currency` text DEFAULT 'KRW' NOT NULL,
	`monthly_premium_krw` integer,
	`premium_text` text,
	`quote_source_type` text NOT NULL,
	`quote_source_url` text,
	`quote_params_json` text,
	`quote_hash_sha256` text,
	`retrieved_at` integer NOT NULL,
	`review_status` text DEFAULT 'raw' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_source_id`) REFERENCES `insurance_product_sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`carrier_id`) REFERENCES `insurance_carriers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `premium_quotes_product_condition_idx` ON `insurance_premium_quotes` (`product_source_id`,`age`,`sex`);--> statement-breakpoint
CREATE INDEX `premium_quotes_product_review_idx` ON `insurance_premium_quotes` (`product_source_id`,`review_status`);--> statement-breakpoint
CREATE INDEX `premium_quotes_hash_idx` ON `insurance_premium_quotes` (`quote_hash_sha256`);