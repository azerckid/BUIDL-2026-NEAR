CREATE TABLE `insurance_carriers` (
	`id` text PRIMARY KEY NOT NULL,
	`name_ko` text NOT NULL,
	`name_en` text,
	`carrier_type` text NOT NULL,
	`association_source` text NOT NULL,
	`homepage_url` text,
	`disclosure_url` text,
	`is_active` integer DEFAULT 1 NOT NULL,
	`last_checked_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `insurance_product_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`carrier_id` text NOT NULL,
	`raw_product_name` text NOT NULL,
	`normalized_product_name` text NOT NULL,
	`product_group` text NOT NULL,
	`e_insmarket_product_code` text,
	`official_product_url` text,
	`sale_status` text DEFAULT 'unknown' NOT NULL,
	`sale_status_evidence` text,
	`premium_currency` text DEFAULT 'KRW' NOT NULL,
	`monthly_premium_krw` integer,
	`premium_text` text,
	`premium_basis` text,
	`renewal_type` text,
	`coverage_summary` text,
	`exclusions_summary` text,
	`coverage_details_json` text,
	`coverage_caveats_json` text,
	`review_status` text DEFAULT 'raw' NOT NULL,
	`reviewed_at` integer,
	`last_verified_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`carrier_id`) REFERENCES `insurance_carriers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `insurance_source_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`product_source_id` text NOT NULL,
	`carrier_id` text NOT NULL,
	`source_type` text NOT NULL,
	`document_type` text NOT NULL,
	`source_url` text NOT NULL,
	`file_hash_sha256` text NOT NULL,
	`content_type` text,
	`content_length_bytes` integer,
	`retrieved_at` integer NOT NULL,
	`effective_date` text,
	`published_at` text,
	`usage_status` text DEFAULT 'link_only' NOT NULL,
	`parse_status` text DEFAULT 'not_parsed' NOT NULL,
	`extracted_text_hash` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_source_id`) REFERENCES `insurance_product_sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`carrier_id`) REFERENCES `insurance_carriers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `insurance_products` ADD `product_source_id` text REFERENCES insurance_product_sources(id);--> statement-breakpoint
ALTER TABLE `insurance_products` ADD `monthly_premium_krw` integer;--> statement-breakpoint
ALTER TABLE `insurance_products` ADD `premium_currency` text DEFAULT 'KRW' NOT NULL;--> statement-breakpoint
ALTER TABLE `insurance_products` ADD `premium_basis` text;--> statement-breakpoint
ALTER TABLE `insurance_products` ADD `matching_strategy` text DEFAULT 'risk_target' NOT NULL;--> statement-breakpoint
ALTER TABLE `insurance_products` ADD `coverage_details_json` text;--> statement-breakpoint
ALTER TABLE `insurance_products` ADD `coverage_caveats_json` text;--> statement-breakpoint
ALTER TABLE `insurance_products` ADD `source_checked_at` integer;--> statement-breakpoint
ALTER TABLE `insurance_products` ADD `primary_source_document_id` text REFERENCES insurance_source_documents(id);--> statement-breakpoint
ALTER TABLE `insurance_products` ADD `catalog_status` text DEFAULT 'approved' NOT NULL;