CREATE TABLE `source_credentials` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`credential_key` text NOT NULL,
	`encrypted_value` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_source_credentials_source_key` ON `source_credentials` (`source`,`credential_key`);