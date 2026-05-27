CREATE INDEX `analysis_results_wallet_idx` ON `analysis_results` (`wallet_address`);--> statement-breakpoint
CREATE INDEX `analysis_sessions_wallet_idx` ON `analysis_sessions` (`wallet_address`);--> statement-breakpoint
CREATE INDEX `carriers_name_idx` ON `insurance_carriers` (`name_ko`);--> statement-breakpoint
CREATE INDEX `product_sources_carrier_review_idx` ON `insurance_product_sources` (`carrier_id`,`review_status`);--> statement-breakpoint
CREATE INDEX `product_sources_code_idx` ON `insurance_product_sources` (`e_insmarket_product_code`);--> statement-breakpoint
CREATE INDEX `products_active_category_idx` ON `insurance_products` (`is_active`,`coverage_category`);--> statement-breakpoint
CREATE INDEX `products_active_matching_idx` ON `insurance_products` (`is_active`,`matching_strategy`);--> statement-breakpoint
CREATE INDEX `products_source_idx` ON `insurance_products` (`product_source_id`);--> statement-breakpoint
CREATE INDEX `source_documents_product_idx` ON `insurance_source_documents` (`product_source_id`);--> statement-breakpoint
CREATE INDEX `source_documents_hash_idx` ON `insurance_source_documents` (`file_hash_sha256`);--> statement-breakpoint
CREATE INDEX `carts_wallet_status_idx` ON `recommendation_carts` (`wallet_address`,`status`);