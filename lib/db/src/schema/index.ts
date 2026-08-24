import { createInsertSchema } from "drizzle-zod";
import { date, integer, numeric, pgEnum, pgTable, text, timestamp, uuid, boolean, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const projectStatus = pgEnum("project_status", ["lead", "proposal_sent", "active", "completed", "archived"]);
export const invoiceStatus = pgEnum("invoice_status", ["draft", "sent", "paid", "overdue"]);

const id = () => uuid("id").defaultRandom().primaryKey();
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const clientsTable = pgTable("clients", {
  id: id(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  company: text("company"),
  createdAt: createdAt(),
});

export const projectsTable = pgTable("projects", {
  id: id(),
  clientId: uuid("client_id").references(() => clientsTable.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  budget: numeric("budget", { precision: 10, scale: 2 }),
  status: projectStatus("status").notNull().default("lead"),
  createdAt: createdAt(),
});

export const proposalsTable = pgTable("proposals", {
  id: id(),
  projectId: uuid("project_id").references(() => projectsTable.id, { onDelete: "cascade" }).notNull(),
  scopeMarkdown: text("scope_markdown").notNull(),
  deliverables: jsonb("deliverables").$type<string[]>().notNull().default([]),
  isSigned: boolean("is_signed").notNull().default(false),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const invoicesTable = pgTable("invoices", {
  id: id(),
  projectId: uuid("project_id").references(() => projectsTable.id, { onDelete: "cascade" }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: invoiceStatus("status").notNull().default("draft"),
  dueDate: date("due_date", { mode: "string" }),
  createdAt: createdAt(),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true, createdAt: true });
export const insertProjectSchema = createInsertSchema(projectsTable).omit({ id: true, createdAt: true });
export const insertProposalSchema = createInsertSchema(proposalsTable).omit({ id: true, createdAt: true });
export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({ id: true, createdAt: true });
export type Client = typeof clientsTable.$inferSelect;
export type Project = typeof projectsTable.$inferSelect;
export type Proposal = typeof proposalsTable.$inferSelect;
export type Invoice = typeof invoicesTable.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;