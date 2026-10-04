CREATE TABLE `application_events` (
	`id` text PRIMARY KEY NOT NULL,
	`application_id` text NOT NULL,
	`type` text NOT NULL,
	`previous_status` text,
	`new_status` text,
	`metadata` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`application_id`) REFERENCES `applications`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_events_application_created` ON `application_events` (`application_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`vacancy_id` text NOT NULL,
	`candidate_profile_id` text NOT NULL,
	`status` text DEFAULT 'FOUND' NOT NULL,
	`applied_at` integer,
	`last_contact_at` integer,
	`follow_up_at` integer,
	`contact_name` text,
	`contact_role` text,
	`contact_url` text,
	`notes` text,
	`rejection_reason` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`vacancy_id`) REFERENCES `vacancies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`candidate_profile_id`) REFERENCES `candidate_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_applications_vacancy_profile` ON `applications` (`vacancy_id`,`candidate_profile_id`);--> statement-breakpoint
CREATE INDEX `idx_applications_profile_status` ON `applications` (`candidate_profile_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_applications_follow_up` ON `applications` (`follow_up_at`);--> statement-breakpoint
CREATE TABLE `candidate_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`target_titles` text NOT NULL,
	`years_experience` real NOT NULL,
	`location` text NOT NULL,
	`remote_preference` text NOT NULL,
	`salary_target` integer NOT NULL,
	`salary_floor` integer NOT NULL,
	`salary_currency` text NOT NULL,
	`strong_skills` text NOT NULL,
	`secondary_skills` text NOT NULL,
	`strong_domains` text NOT NULL,
	`positive_keywords` text NOT NULL,
	`negative_keywords` text NOT NULL,
	`hard_stop_keywords` text NOT NULL,
	`preferred_locations` text NOT NULL,
	`allowed_remote_regions` text NOT NULL,
	`languages` text NOT NULL,
	`weights` text NOT NULL,
	`is_active` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vacancies` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`source_id` text,
	`url` text,
	`canonical_url` text,
	`title` text NOT NULL,
	`company` text NOT NULL,
	`description` text NOT NULL,
	`location` text,
	`remote_type` text,
	`salary_min` integer,
	`salary_max` integer,
	`salary_currency` text,
	`experience_min` integer,
	`experience_max` integer,
	`published_at` integer,
	`created_at` integer NOT NULL,
	`archived_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_vacancies_source_source_id` ON `vacancies` (`source`,`source_id`);--> statement-breakpoint
CREATE INDEX `idx_vacancies_published_at` ON `vacancies` (`published_at`);--> statement-breakpoint
CREATE TABLE `vacancy_normalized_data` (
	`vacancy_id` text PRIMARY KEY NOT NULL,
	`skills` text NOT NULL,
	`domains` text NOT NULL,
	`detected_language` text,
	`detected_remote` text,
	`detected_seniority` text,
	`detected_years_min` integer,
	`detected_years_max` integer,
	`detected_salary` text,
	`location_restrictions` text NOT NULL,
	`raw_signals` text NOT NULL,
	FOREIGN KEY (`vacancy_id`) REFERENCES `vacancies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `vacancy_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`vacancy_id` text NOT NULL,
	`candidate_profile_id` text NOT NULL,
	`score` integer NOT NULL,
	`bucket` text NOT NULL,
	`positive_reasons` text NOT NULL,
	`negative_reasons` text NOT NULL,
	`hard_stops` text NOT NULL,
	`breakdown` text NOT NULL,
	`recommendation` text NOT NULL,
	`scored_at` integer NOT NULL,
	FOREIGN KEY (`vacancy_id`) REFERENCES `vacancies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`candidate_profile_id`) REFERENCES `candidate_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_scores_vacancy_profile` ON `vacancy_scores` (`vacancy_id`,`candidate_profile_id`);--> statement-breakpoint
CREATE INDEX `idx_scores_profile_score` ON `vacancy_scores` (`candidate_profile_id`,`score`);