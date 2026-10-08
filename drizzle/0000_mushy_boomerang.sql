CREATE TABLE `visits` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`university` text NOT NULL,
	`city_id` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `visits_user_campus` ON `visits` (`user_id`,`university`,`city_id`);