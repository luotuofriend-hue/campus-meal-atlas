import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
export const visits = sqliteTable("visits", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  university: text("university").notNull(),
  cityId: text("city_id").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("visits_user_campus").on(table.userId, table.university, table.cityId)]);
