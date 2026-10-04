ALTER TABLE `applications` ADD `application_method` text DEFAULT 'tailored' NOT NULL;--> statement-breakpoint
ALTER TABLE `candidate_profiles` ADD `proof_points` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `candidate_profiles` ADD `language_policy` text DEFAULT 'strict' NOT NULL;--> statement-breakpoint
ALTER TABLE `vacancies` ADD `is_demo` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `vacancies` ADD `verification_status` text DEFAULT 'unchecked' NOT NULL;--> statement-breakpoint
ALTER TABLE `vacancies` ADD `verified_at` integer;--> statement-breakpoint
ALTER TABLE `vacancies` ADD `verification_reason` text;--> statement-breakpoint
CREATE INDEX `idx_vacancies_verification_status` ON `vacancies` (`verification_status`);--> statement-breakpoint
ALTER TABLE `vacancy_normalized_data` ADD `description_language` text;--> statement-breakpoint
ALTER TABLE `vacancy_normalized_data` ADD `required_languages` text;