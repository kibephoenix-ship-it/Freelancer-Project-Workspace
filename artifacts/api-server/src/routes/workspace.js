import { GoogleGenAI, Type } from "@google/genai";
import { Router } from "express";
import { desc, eq } from "drizzle-orm";
import { db, clientsTable, invoicesTable, projectsTable, proposalsTable, } from "@workspace/db";
import { CreateClientBody, CreateInvoiceBody, CreateProjectBody, GenerateProposalBody, UpdateClientBody, UpdateInvoiceBody, UpdateProjectBody, } from "@workspace/api-zod";
const router = Router();
const genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    : null;
let seedPromise = null;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const projectWithClient = () => db
    .select({
    id: projectsTable.id,
    clientId: projectsTable.clientId,
    clientName: clientsTable.name,
    title: projectsTable.title,
    budget: projectsTable.budget,
    status: projectsTable.status,
    createdAt: projectsTable.createdAt,
})
    .from(projectsTable)
    .innerJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id));
async function ensureSeed() {
    if (!seedPromise) {
        seedPromise = (async () => {
            const existing = await db.select({ id: clientsTable.id }).from(clientsTable).limit(1);
            if (existing.length)
                return;
            const [client] = await db.insert(clientsTable).values({
                name: "Amara Wanjiku",
                email: "amara@northstar.studio",
                company: "Northstar Studio",
            }).returning();
            await db.insert(projectsTable).values([
                { clientId: client.id, title: "Northstar brand refresh", budget: "6800", status: "active" },
                { clientId: client.id, title: "Quarterly content system", budget: "2400", status: "proposal_sent" },
            ]);
        })();
    }
    await seedPromise;
}
function projectResponse(project) {
    return {
        ...project,
        budget: project.budget === null ? null : Number(project.budget),
        createdAt: project.createdAt.toISOString(),
    };
}
router.get("/dashboard", async (_req, res, next) => {
    try {
        await ensureSeed();
        const [clients, projects, invoices, recent] = await Promise.all([
            db.select({ id: clientsTable.id }).from(clientsTable),
            db.select({ budget: projectsTable.budget, status: projectsTable.status }).from(projectsTable),
            db.select({ amount: invoicesTable.amount, status: invoicesTable.status }).from(invoicesTable),
            projectWithClient().orderBy(desc(projectsTable.createdAt)).limit(5),
        ]);
        const projectsByStatus = projects.reduce((acc, p) => {
            acc[p.status] = (acc[p.status] ?? 0) + 1;
            return acc;
        }, {});
        const pipelineValue = projects.reduce((sum, p) => sum + Number(p.budget ?? 0), 0);
        const outstandingAmount = invoices
            .filter((i) => i.status !== "paid")
            .reduce((sum, i) => sum + Number(i.amount), 0);
        res.json({
            totalClients: clients.length,
            activeProjects: projects.filter((p) => p.status === "active").length,
            pipelineValue,
            outstandingAmount,
            projectsByStatus,
            recentProjects: recent.map(projectResponse),
        });
    }
    catch (error) {
        next(error);
    }
});
router.get("/clients", async (_req, res, next) => {
    try {
        await ensureSeed();
        res.json(await db.select().from(clientsTable).orderBy(desc(clientsTable.createdAt)));
    }
    catch (error) {
        next(error);
    }
});
router.post("/clients", async (req, res, next) => {
    try {
        const data = CreateClientBody.parse(req.body);
        const [client] = await db.insert(clientsTable).values(data).returning();
        res.status(201).json({ ...client, createdAt: client.createdAt.toISOString() });
    }
    catch (error) {
        next(error);
    }
});
router.patch("/clients/:id", async (req, res, next) => {
    try {
        const data = UpdateClientBody.parse(req.body);
        const [client] = await db.update(clientsTable).set(data).where(eq(clientsTable.id, req.params.id)).returning();
        if (!client)
            return res.status(404).json({ error: "Client not found" });
        return res.json({ ...client, createdAt: client.createdAt.toISOString() });
    }
    catch (error) {
        return next(error);
    }
});
router.delete("/clients/:id", async (req, res, next) => {
    try {
        await db.delete(clientsTable).where(eq(clientsTable.id, req.params.id));
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
router.get("/projects", async (_req, res, next) => {
    try {
        await ensureSeed();
        res.json((await projectWithClient().orderBy(desc(projectsTable.createdAt))).map(projectResponse));
    }
    catch (error) {
        next(error);
    }
});
router.post("/projects", async (req, res, next) => {
    try {
        const data = CreateProjectBody.parse(req.body);
        const [project] = await db.insert(projectsTable).values({
            ...data,
            budget: data.budget === undefined ? null : String(data.budget),
        }).returning();
        const [full] = await projectWithClient().where(eq(projectsTable.id, project.id));
        res.status(201).json(projectResponse(full));
    }
    catch (error) {
        next(error);
    }
});
router.patch("/projects/:id", async (req, res, next) => {
    try {
        const data = UpdateProjectBody.parse(req.body);
        const [project] = await db.update(projectsTable).set({
            ...data,
            budget: data.budget === undefined ? undefined : data.budget === null ? null : String(data.budget),
        }).where(eq(projectsTable.id, req.params.id)).returning();
        if (!project)
            return res.status(404).json({ error: "Project not found" });
        const [full] = await projectWithClient().where(eq(projectsTable.id, project.id));
        return res.json(projectResponse(full));
    }
    catch (error) {
        return next(error);
    }
});
router.delete("/projects/:id", async (req, res, next) => {
    try {
        await db.delete(projectsTable).where(eq(projectsTable.id, req.params.id));
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
router.get("/proposals", async (_req, res, next) => {
    try {
        await ensureSeed();
        const rows = await db.select({
            id: proposalsTable.id, projectId: proposalsTable.projectId,
            projectTitle: projectsTable.title, scopeMarkdown: proposalsTable.scopeMarkdown,
            deliverables: proposalsTable.deliverables, isSigned: proposalsTable.isSigned,
            createdAt: proposalsTable.createdAt,
        }).from(proposalsTable).innerJoin(projectsTable, eq(proposalsTable.projectId, projectsTable.id)).orderBy(desc(proposalsTable.createdAt));
        res.json(rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })));
    }
    catch (error) {
        next(error);
    }
});
router.post("/proposals", async (req, res, next) => {
    try {
        const { projectId, notes } = GenerateProposalBody.parse(req.body);
        if (!uuidPattern.test(projectId))
            return res.status(400).json({ error: "Invalid project id" });
        const [project] = await projectWithClient().where(eq(projectsTable.id, projectId));
        if (!project)
            return res.status(404).json({ error: "Project not found" });
        let scopeMarkdown = `## Executive summary\n\nA focused engagement for **${project.title}**, shaped around the goals in your notes.\n\n## Approach\n\nWe will align on priorities, create the core work, and refine it with your feedback.\n\n## Milestones\n\n1. Discovery and direction\n2. First working draft\n3. Review and final delivery`;
        let deliverables = ["Discovery brief and agreed direction", "First working draft", "Refined final delivery", "Handover notes"];
        if (genAI) {
            const response = await genAI.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `You are an expert freelance consultant. Create a professional project proposal for "${project.title}" based on these notes:\n${notes}`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            scope_markdown: { type: Type.STRING },
                            deliverables: { type: Type.ARRAY, items: { type: Type.STRING } },
                        },
                        required: ["scope_markdown", "deliverables"],
                    },
                    temperature: 0.3,
                },
            });
            const generated = JSON.parse(response.text ?? "{}");
            if (generated.scope_markdown)
                scopeMarkdown = generated.scope_markdown;
            if (generated.deliverables?.length)
                deliverables = generated.deliverables;
        }
        const [proposal] = await db.insert(proposalsTable).values({ projectId, scopeMarkdown, deliverables }).returning();
        await db.update(projectsTable).set({ status: "proposal_sent" }).where(eq(projectsTable.id, projectId));
        return res.status(201).json({
            id: proposal.id, projectId, projectTitle: project.title, scopeMarkdown,
            deliverables, isSigned: proposal.isSigned, createdAt: proposal.createdAt.toISOString(),
        });
    }
    catch (error) {
        return next(error);
    }
});
router.get("/invoices", async (_req, res, next) => {
    try {
        await ensureSeed();
        const rows = await db.select({
            id: invoicesTable.id, projectId: invoicesTable.projectId, projectTitle: projectsTable.title,
            amount: invoicesTable.amount, status: invoicesTable.status, dueDate: invoicesTable.dueDate,
            createdAt: invoicesTable.createdAt,
        }).from(invoicesTable).innerJoin(projectsTable, eq(invoicesTable.projectId, projectsTable.id)).orderBy(desc(invoicesTable.createdAt));
        res.json(rows.map((row) => ({ ...row, amount: Number(row.amount), createdAt: row.createdAt.toISOString() })));
    }
    catch (error) {
        next(error);
    }
});
router.post("/invoices", async (req, res, next) => {
    try {
        const data = CreateInvoiceBody.parse(req.body);
        const [invoice] = await db.insert(invoicesTable).values({
            projectId: data.projectId, amount: String(data.amount), status: data.status, dueDate: data.dueDate,
        }).returning();
        const [project] = await db.select({ title: projectsTable.title }).from(projectsTable).where(eq(projectsTable.id, invoice.projectId));
        res.status(201).json({ id: invoice.id, projectId: invoice.projectId, projectTitle: project?.title ?? "Project", amount: Number(invoice.amount), status: invoice.status, dueDate: invoice.dueDate, createdAt: invoice.createdAt.toISOString() });
    }
    catch (error) {
        next(error);
    }
});
router.patch("/invoices/:id", async (req, res, next) => {
    try {
        const data = UpdateInvoiceBody.parse(req.body);
        const [invoice] = await db.update(invoicesTable).set({
            amount: data.amount === undefined ? undefined : String(data.amount),
            status: data.status, dueDate: data.dueDate,
        }).where(eq(invoicesTable.id, req.params.id)).returning();
        if (!invoice)
            return res.status(404).json({ error: "Invoice not found" });
        const [project] = await db.select({ title: projectsTable.title }).from(projectsTable).where(eq(projectsTable.id, invoice.projectId));
        return res.json({ id: invoice.id, projectId: invoice.projectId, projectTitle: project?.title ?? "Project", amount: Number(invoice.amount), status: invoice.status, dueDate: invoice.dueDate, createdAt: invoice.createdAt.toISOString() });
    }
    catch (error) {
        return next(error);
    }
});
router.delete("/invoices/:id", async (req, res, next) => {
    try {
        await db.delete(invoicesTable).where(eq(invoicesTable.id, req.params.id));
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
export default router;
