CREATE TABLE `outreach_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`vacancy_id` text NOT NULL,
	`candidate_profile_id` text NOT NULL,
	`recipient` text NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`resume_name` text,
	`resume_type` text,
	`resume_data` blob,
	`status` text DEFAULT 'draft' NOT NULL,
	`provider_message_id` text,
	`error` text,
	`approved_at` integer,
	`sent_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`vacancy_id`) REFERENCES `vacancies`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`candidate_profile_id`) REFERENCES `candidate_profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_outreach_vacancy_profile` ON `outreach_drafts` (`vacancy_id`,`candidate_profile_id`);--> statement-breakpoint
CREATE INDEX `idx_outreach_status` ON `outreach_drafts` (`status`);