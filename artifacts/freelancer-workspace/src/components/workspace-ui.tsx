import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  Command,
  FileText,
  FolderKanban,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Search,
  Sparkles,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react';
import {
  getGetDashboardQueryKey,
  getListClientsQueryKey,
  getListInvoicesQueryKey,
  getListProjectsQueryKey,
  getListProposalsQueryKey,
  useCreateClient,
  useCreateInvoice,
  useCreateProject,
  useDeleteClient,
  useDeleteInvoice,
  useDeleteProject,
  useGenerateProposal,
  useGetDashboard,
  useListClients,
  useListInvoices,
  useListProjects,
  useListProposals,
  useUpdateClient,
  useUpdateInvoice,
  useUpdateProject,
} from '@workspace/api-client-react';
import type {
  Client,
  Invoice,
  InvoiceInputStatus,
  InvoiceUpdateStatus,
  Project,
  ProjectInputStatus,
  ProjectStatus,
} from '@workspace/api-client-react';

const statusLabels: Record<string, string> = {
  lead: 'Lead',
  proposal_sent: 'Proposal sent',
  active: 'Active',
  completed: 'Completed',
  archived: 'Archived',
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  overdue: 'Overdue',
};

const projectStatuses: ProjectInputStatus[] = ['lead', 'proposal_sent', 'active', 'completed', 'archived'];
const invoiceStatuses: InvoiceInputStatus[] = ['draft', 'sent', 'paid', 'overdue'];

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return 'Not set';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return (keys: readonly (readonly unknown[])[]) => {
    keys.forEach((queryKey) => queryClient.invalidateQueries({ queryKey }));
  };
}

function Badge({ value, signed }: { value: string; signed?: boolean }) {
  const tone = signed || value === 'paid' || value === 'completed'
    ? 'success'
    : value === 'overdue'
      ? 'danger'
      : value === 'active' || value === 'sent'
        ? 'accent'
        : value === 'proposal_sent'
          ? 'gold'
          : 'neutral';
  return (
    <span data-testid={`status-${value}`} className={`status-badge status-${tone}`}>
      <span className="status-dot" />
      {signed ? 'Signed' : statusLabels[value] ?? value}
    </span>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-[hsl(var(--muted))] ${className}`} />;
}

function QueryError({ onRetry, label = 'workspace data' }: { onRetry: () => void; label?: string }) {
  return (
    <div data-testid="state-error" className="flex flex-col items-center justify-center rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-6 py-16 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[hsl(var(--accent)/.14)] text-[hsl(var(--accent))]"><AlertCircle size={20} /></div>
      <h3 className="font-display text-2xl text-[hsl(var(--foreground))]">Couldn’t load {label}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">The connection took a wrong turn. Try again and we’ll pick up where you left off.</p>
      <button data-testid="button-retry" onClick={onRetry} className="mt-5 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] transition hover:opacity-90">Try again</button>
    </div>
  );
}

function EmptyState({ icon: Icon, title, body, action }: { icon: typeof FileText; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div data-testid="state-empty" className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Icon size={21} /></div>
      <h3 className="font-display text-2xl text-[hsl(var(--foreground))]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function Modal({ title, eyebrow, onClose, children, wide = false }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div data-testid="modal-overlay" className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(var(--foreground)/.38)] p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} max-h-[92dvh] overflow-y-auto rounded-t-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-2xl sm:rounded-2xl sm:p-8`}>
        <div className="mb-7 flex items-start justify-between gap-4">
          <div><p className="eyebrow text-[hsl(var(--primary))]">{eyebrow}</p><h2 className="mt-2 font-display text-3xl text-[hsl(var(--foreground))]">{title}</h2></div>
          <button data-testid="button-close-modal" onClick={onClose} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"><X size={19} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-semibold uppercase tracking-[.12em] text-[hsl(var(--muted-foreground))]">{label}</span>{children}</label>;
}

function TextInput({ value, onChange, placeholder, type = 'text', testId }: { value: string; onChange: (value: string) => void; placeholder?: string; type?: string; testId: string }) {
  return <input data-testid={testId} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3.5 py-3 text-sm text-[hsl(var(--foreground))] outline-none transition placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:ring-2 focus:ring-[hsl(var(--primary)/.13)]" />;
}

function SelectInput({ value, onChange, options, testId }: { value: string; onChange: (value: string) => void; options: Array<string | { value: string; label: string }>; testId: string }) {
  return <div className="relative"><select data-testid={testId} value={value} onChange={(event) => onChange(event.target.value)} className="w-full appearance-none rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3.5 py-3 text-sm text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]">{options.map((option) => { const item = typeof option === 'string' ? { value: option, label: statusLabels[option] ?? option } : option; return <option value={item.value} key={item.value}>{item.label}</option>; })}</select><ChevronDown size={16} className="pointer-events-none absolute right-3 top-3.5 text-[hsl(var(--muted-foreground))]" /></div>;
}

function PageHeading({ kicker, title, body, action }: { kicker: string; title: string; body: string; action?: React.ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="eyebrow text-[hsl(var(--primary))]">{kicker}</p><h1 className="mt-2 font-display text-5xl leading-[.95] tracking-[-.025em] text-[hsl(var(--foreground))] sm:text-6xl">{title}</h1><p className="mt-4 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">{body}</p></div>{action}</div>;
}

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = [
    { href: '/', label: 'Overview', icon: Activity },
    { href: '/clients', label: 'Clients', icon: UsersRound },
    { href: '/projects', label: 'Projects', icon: FolderKanban },
    { href: '/proposals', label: 'Proposals', icon: FileText },
    { href: '/invoices', label: 'Invoices', icon: Receipt },
  ];
  return (
    <div className="noise min-h-[100dvh] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[hsl(var(--sidebar))] px-4 py-5 text-[hsl(var(--sidebar-foreground))] transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-3"><Link data-testid="link-brand" href="/" className="flex items-center gap-3"><span className="brand-mark">F</span><span className="font-display text-xl tracking-tight">Freelancer<br /><em className="not-italic text-[hsl(var(--sidebar-primary))]">Workspace</em></span></Link><button data-testid="button-close-nav" onClick={() => setMobileOpen(false)} className="rounded-md p-1.5 text-[hsl(var(--sidebar-foreground)/.6)] hover:bg-[hsl(var(--sidebar-accent))] lg:hidden"><X size={18} /></button></div>
        <div className="mt-12 px-3"><p className="eyebrow text-[hsl(var(--sidebar-foreground)/.48)]">Your practice</p></div>
        <nav className="mt-3 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => <Link data-testid={`link-nav-${label.toLowerCase()}`} key={href} href={href} onClick={() => setMobileOpen(false)} className={`nav-link ${location === href ? 'nav-link-active' : ''}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{location === href && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--sidebar-primary))]" />}</Link>)}
        </nav>
        <div className="mt-auto">
          <div className="mx-3 mb-5 rounded-xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.62)] p-4"><div className="mb-3 flex items-center justify-between"><span className="eyebrow text-[hsl(var(--sidebar-primary))]">Workspace pulse</span><CircleDollarSign size={15} className="text-[hsl(var(--sidebar-primary))]" /></div><p className="font-display text-xl leading-tight text-[hsl(var(--sidebar-foreground))]">Keep the<br />important bits close.</p><p className="mt-2 text-xs text-[hsl(var(--sidebar-foreground)/.55)]">Context, scope, and next steps.</p></div>
          <div className="flex items-center gap-3 border-t border-[hsl(var(--sidebar-border))] px-3 pt-4"><div className="avatar avatar-gold">AR</div><div className="min-w-0"><p className="truncate text-sm font-semibold">Avery Rhodes</p><p className="truncate text-xs text-[hsl(var(--sidebar-foreground)/.52)]">Independent consultant</p></div><MoreHorizontal data-testid="icon-account-more" size={17} className="ml-auto text-[hsl(var(--sidebar-foreground)/.55)]" /></div>
        </div>
      </aside>
      {mobileOpen && <button data-testid="button-close-nav-backdrop" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-[hsl(var(--foreground)/.3)] lg:hidden" aria-label="Close navigation" />}
      <main className="min-h-[100dvh] lg:pl-64"><header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[hsl(var(--border)/.7)] bg-[hsl(var(--background)/.88)] px-5 backdrop-blur-md sm:px-8 lg:px-12"><button data-testid="button-open-nav" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] lg:hidden"><Menu size={21} /></button><div className="hidden items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] sm:flex"><Command size={14} /><span>Good work deserves good systems.</span></div><div className="ml-auto flex items-center gap-3"><div data-testid="text-quick-find" className="hidden items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] px-3 py-2 text-xs text-[hsl(var(--muted-foreground))] sm:flex"><Search size={14} /> Quick find <kbd className="ml-4 rounded border border-[hsl(var(--border))] px-1.5 py-0.5 font-mono text-[10px]">⌘ K</kbd></div><div className="avatar avatar-ink">AR</div></div></header><div className="page-enter mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-11">{children}</div></main>
    </div>
  );
}

function Overview() {
  const dashboard = useGetDashboard();
  if (dashboard.isLoading) return <><PageHeading kicker="Monday, workspace" title="Make room for the work." body="A clear view of conversations becoming commitments, commitments becoming invoices." /><OverviewSkeleton /></>;
  if (dashboard.isError || !dashboard.data) return <><PageHeading kicker="Monday, workspace" title="Make room for the work." body="A clear view of conversations becoming commitments, commitments becoming invoices." /><QueryError onRetry={() => dashboard.refetch()} label="your overview" /></>;
  const data = dashboard.data;
  const stages = [{ key: 'lead', label: 'Leads', color: 'bg-[hsl(var(--chart-4))]' }, { key: 'proposal_sent', label: 'Proposals', color: 'bg-[hsl(var(--chart-3))]' }, { key: 'active', label: 'Active', color: 'bg-[hsl(var(--chart-1))]' }, { key: 'completed', label: 'Completed', color: 'bg-[hsl(var(--chart-2))]' }];
  return <div data-testid="page-overview"><PageHeading kicker="Monday, workspace" title="Make room for the work." body="A clear view of conversations becoming commitments, commitments becoming invoices." action={<Link data-testid="link-new-project-overview" href="/projects?new=1" className="primary-button"><Plus size={16} /> New project</Link>} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{ label: 'Total clients', value: data.totalClients, meta: 'people in your orbit', icon: UsersRound, color: 'blue' }, { label: 'Active projects', value: data.activeProjects, meta: 'moving right now', icon: FolderKanban, color: 'green' }, { label: 'Pipeline value', value: formatMoney(data.pipelineValue), meta: 'across open work', icon: CircleDollarSign, color: 'gold' }, { label: 'Outstanding', value: formatMoney(data.outstandingAmount), meta: 'awaiting payment', icon: Clock3, color: 'coral' }].map((stat, index) => <div data-testid={`card-summary-${stat.label.toLowerCase().replace(' ', '-')}`} className={`summary-card summary-${stat.color} rise-in`} style={{ animationDelay: `${index * 65}ms` }} key={stat.label}><div className="flex items-center justify-between"><span className="eyebrow text-[hsl(var(--muted-foreground))]">{stat.label}</span><stat.icon size={18} className="text-[hsl(var(--muted-foreground))]" /></div><p className="mt-5 font-display text-4xl tracking-tight text-[hsl(var(--foreground))]">{stat.value}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{stat.meta}</p></div>)}</div>
    <div className="mt-8 grid gap-5 xl:grid-cols-[1.35fr_.65fr]"><section className="content-card p-5 sm:p-7"><div className="mb-7 flex items-center justify-between"><div><p className="eyebrow text-[hsl(var(--primary))]">Your flow</p><h2 className="mt-1 font-display text-2xl">Work in motion</h2></div><Link data-testid="link-view-projects-overview" href="/projects" className="quiet-link">View projects <ArrowUpRight size={14} /></Link></div><div className="space-y-5">{stages.map((stage) => { const count = data.projectsByStatus?.[stage.key] ?? 0; const max = Math.max(1, ...Object.values(data.projectsByStatus ?? {})); return <div data-testid={`row-stage-${stage.key}`} key={stage.key}><div className="mb-2 flex items-center justify-between text-sm"><span className="flex items-center gap-2 font-medium"><span className={`h-2 w-2 rounded-full ${stage.color}`} />{stage.label}</span><span className="font-mono text-xs text-[hsl(var(--muted-foreground))]">{count}</span></div><div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><div className={`h-full rounded-full ${stage.color} transition-all duration-700`} style={{ width: `${Math.max(count ? 10 : 0, (count / max) * 100)}%` }} /></div></div>; })}</div></section><section className="accent-panel p-6 sm:p-7"><div className="flex items-start justify-between"><div className="brand-mark brand-mark-light">F</div><Sparkles size={18} className="text-[hsl(var(--sidebar-primary))]" /></div><p className="mt-10 font-display text-3xl leading-[1.05] text-[hsl(var(--sidebar-foreground))]">Small systems.<br /><em className="text-[hsl(var(--sidebar-primary))]">Better thinking.</em></p><p className="mt-4 text-sm leading-6 text-[hsl(var(--sidebar-foreground)/.65)]">Keep the admin tidy so your attention stays with the client, the question, and the next useful move.</p><Link data-testid="link-create-proposal-overview" href="/proposals" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--sidebar-primary))]">Draft a proposal <ArrowUpRight size={15} /></Link></section></div>
    <section className="mt-8 content-card overflow-hidden"><div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-5 sm:px-7"><div><p className="eyebrow text-[hsl(var(--primary))]">Recently touched</p><h2 className="mt-1 font-display text-2xl">Projects to pick up</h2></div><Link data-testid="link-view-all-projects" href="/projects" className="quiet-link">All projects <ArrowUpRight size={14} /></Link></div>{data.recentProjects?.length ? <div className="divide-y divide-[hsl(var(--border))]">{data.recentProjects.slice(0, 5).map((project) => <ProjectRow key={project.id} project={project} />)}</div> : <div className="p-7"><EmptyState icon={FolderKanban} title="A clean slate." body="Your next good conversation can become the first project here." action={<Link data-testid="link-add-first-project" href="/projects?new=1" className="secondary-button">Add a project</Link>} /></div>}</section>
  </div>;
}

function OverviewSkeleton() {
  return <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((n) => <div key={n} className="summary-card"><Skeleton className="h-3 w-24" /><Skeleton className="mt-5 h-10 w-28" /><Skeleton className="mt-2 h-3 w-32" /></div>)}</div><div className="mt-8 grid gap-5 xl:grid-cols-[1.35fr_.65fr]"><div className="content-card h-72 p-7"><Skeleton className="h-3 w-20" /><Skeleton className="mt-2 h-7 w-44" /></div><div className="content-card h-72 p-7"><Skeleton className="h-full w-full" /></div></div></>;
}

function ProjectRow({ project, actions }: { project: Project; actions?: React.ReactNode }) {
  return <div data-testid={`row-project-${project.id}`} className="flex flex-col gap-3 px-5 py-4 transition hover:bg-[hsl(var(--muted)/.45)] sm:flex-row sm:items-center sm:px-7"><div className="avatar avatar-project">{initials(project.clientName || project.title)}</div><div className="min-w-0 flex-1"><p data-testid={`text-project-title-${project.id}`} className="truncate text-sm font-semibold">{project.title}</p><p className="mt-0.5 truncate text-xs text-[hsl(var(--muted-foreground))]">{project.clientName} <span className="mx-1.5 opacity-40">/</span> {formatDate(project.createdAt)}</p></div><div className="flex items-center gap-5 sm:justify-end">{project.budget !== null && <span className="font-mono text-sm text-[hsl(var(--foreground))]">{formatMoney(project.budget)}</span>}<Badge value={project.status} />{actions}</div></div>;
}

function Clients() {
  const query = useListClients();
  const invalidate = useInvalidate();
  const create = useCreateClient();
  const update = useUpdateClient();
  const remove = useDeleteClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Client | null>(null);
  const [modal, setModal] = useState(false);
  const clients = useMemo(() => (query.data ?? []).filter((client) => `${client.name} ${client.email} ${client.company ?? ''}`.toLowerCase().includes(search.toLowerCase())), [query.data, search]);
  const save = (form: { name: string; email: string; company: string }) => {
    if (!form.name.trim() || !form.email.trim()) return;
    const done = () => { invalidate([getListClientsQueryKey(), getGetDashboardQueryKey()]); setModal(false); setEditing(null); };
    if (editing) update.mutate({ id: editing.id, data: { name: form.name, email: form.email, company: form.company || null } }, { onSuccess: done });
    else create.mutate({ data: { name: form.name, email: form.email, company: form.company } }, { onSuccess: done });
  };
  const del = (client: Client) => { if (window.confirm(`Delete ${client.name}?`)) remove.mutate({ id: client.id }, { onSuccess: () => invalidate([getListClientsQueryKey(), getGetDashboardQueryKey()]) }); };
  return <div data-testid="page-clients"><PageHeading kicker="Relationships" title="People worth knowing." body="Keep the context close. Every client here is a conversation with somewhere useful to go." action={<button data-testid="button-new-client" onClick={() => { setEditing(null); setModal(true); }} className="primary-button"><Plus size={16} /> Add client</button>} />
    <div className="mb-5 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search size={16} className="absolute left-3.5 top-3.5 text-[hsl(var(--muted-foreground))]" /><input data-testid="input-search-clients" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search names, companies, email..." className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-3 pl-10 pr-4 text-sm outline-none focus:border-[hsl(var(--primary))]" /></div><div className="hidden items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 text-xs text-[hsl(var(--muted-foreground))] sm:flex"><UsersRound size={15} /> {clients.length} shown</div></div>
    {query.isLoading ? <div className="content-card divide-y divide-[hsl(var(--border))]">{[1, 2, 3, 4].map((n) => <div className="flex gap-4 p-5" key={n}><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1"><Skeleton className="h-4 w-44" /><Skeleton className="mt-2 h-3 w-64" /></div></div>)}</div> : query.isError ? <QueryError onRetry={() => query.refetch()} label="your clients" /> : clients.length === 0 ? <EmptyState icon={UsersRound} title={search ? 'No close matches.' : 'Start with a good conversation.'} body={search ? 'Try a different name, company, or email.' : 'Add the people you do your best work with and keep their context handy.'} action={!search && <button data-testid="button-empty-new-client" onClick={() => setModal(true)} className="secondary-button"><Plus size={15} /> Add first client</button>} /> : <div className="content-card divide-y divide-[hsl(var(--border))]">{clients.map((client) => <div data-testid={`row-client-${client.id}`} key={client.id} className="flex flex-col gap-4 p-5 transition hover:bg-[hsl(var(--muted)/.4)] sm:flex-row sm:items-center sm:p-6"><div className="avatar avatar-client">{initials(client.name)}</div><div className="min-w-0 flex-1"><p data-testid={`text-client-name-${client.id}`} className="font-semibold">{client.name}</p><p className="mt-1 truncate text-sm text-[hsl(var(--muted-foreground))]">{client.company || 'Independent client'} <span className="mx-1.5 opacity-40">·</span> {client.email}</p></div><p className="hidden text-xs text-[hsl(var(--muted-foreground))] md:block">Added {formatDate(client.createdAt)}</p><div className="flex gap-1"><button data-testid={`button-edit-client-${client.id}`} onClick={() => { setEditing(client); setModal(true); }} className="icon-button" title="Edit client"><Pencil size={15} /></button><button data-testid={`button-delete-client-${client.id}`} onClick={() => del(client)} className="icon-button icon-danger" title="Delete client"><Trash2 size={15} /></button></div></div>)}</div>}
    {modal && <ClientModal client={editing} pending={create.isPending || update.isPending} onClose={() => { setModal(false); setEditing(null); }} onSave={save} />}
  </div>;
}

function ClientModal({ client, pending, onClose, onSave }: { client: Client | null; pending: boolean; onClose: () => void; onSave: (form: { name: string; email: string; company: string }) => void }) {
  const [name, setName] = useState(client?.name ?? '');
  const [email, setEmail] = useState(client?.email ?? '');
  const [company, setCompany] = useState(client?.company ?? '');
  return <Modal eyebrow={client ? 'Edit relationship' : 'New relationship'} title={client ? 'Refine the details.' : 'Who are you working with?'} onClose={onClose}><div className="space-y-5"><Field label="Name"><TextInput testId="input-client-name" value={name} onChange={setName} placeholder="e.g. Maya Chen" /></Field><Field label="Email"><TextInput testId="input-client-email" type="email" value={email} onChange={setEmail} placeholder="maya@company.com" /></Field><Field label="Company (optional)"><TextInput testId="input-client-company" value={company} onChange={setCompany} placeholder="Company or practice name" /></Field></div><div className="mt-8 flex justify-end gap-3"><button data-testid="button-cancel-client" onClick={onClose} className="secondary-button">Cancel</button><button data-testid="button-save-client" disabled={pending} onClick={() => onSave({ name, email, company })} className="primary-button">{pending ? 'Saving...' : client ? 'Save changes' : 'Add client'}</button></div></Modal>;
}

function Projects() {
  const query = useListProjects();
  const clients = useListClients();
  const invalidate = useInvalidate();
  const create = useCreateProject();
  const update = useUpdateProject();
  const remove = useDeleteProject();
  const [editing, setEditing] = useState<Project | null>(null);
  const [modal, setModal] = useState(false);
  const [filter, setFilter] = useState<'all' | ProjectStatus>('all');
  const [search, setSearch] = useState('');
  const projects = useMemo(() => (query.data ?? []).filter((p) => (filter === 'all' || p.status === filter) && `${p.title} ${p.clientName}`.toLowerCase().includes(search.toLowerCase())), [query.data, filter, search]);
  const save = (form: { clientId: string; title: string; budget: string; status: ProjectInputStatus }) => {
    const data = { clientId: form.clientId, title: form.title, budget: form.budget ? Number(form.budget) : undefined, status: form.status };
    const done = () => { invalidate([getListProjectsQueryKey(), getGetDashboardQueryKey()]); setModal(false); setEditing(null); };
    if (editing) update.mutate({ id: editing.id, data }, { onSuccess: done }); else create.mutate({ data }, { onSuccess: done });
  };
  const del = (project: Project) => { if (window.confirm(`Delete ${project.title}?`)) remove.mutate({ id: project.id }, { onSuccess: () => invalidate([getListProjectsQueryKey(), getGetDashboardQueryKey()]) }); };
  const changeStatus = (project: Project, status: ProjectInputStatus) => update.mutate({ id: project.id, data: { status } }, { onSuccess: () => invalidate([getListProjectsQueryKey(), getGetDashboardQueryKey()]) });
  return <div data-testid="page-projects"><PageHeading kicker="The pipeline" title="From maybe to meaningful." body="A simple view of every opportunity, with just enough structure to keep momentum." action={<button data-testid="button-new-project" onClick={() => { setEditing(null); setModal(true); }} className="primary-button"><Plus size={16} /> New project</button>} />
    <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="relative max-w-md flex-1"><Search size={16} className="absolute left-3.5 top-3.5 text-[hsl(var(--muted-foreground))]" /><input data-testid="input-search-projects" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search projects or clients..." className="w-full rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-3 pl-10 pr-4 text-sm outline-none focus:border-[hsl(var(--primary))]" /></div><div className="flex gap-1 overflow-x-auto rounded-lg bg-[hsl(var(--muted))] p-1">{(['all', ...projectStatuses] as const).map((value) => <button data-testid={`button-filter-project-${value}`} key={value} onClick={() => setFilter(value)} className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition ${filter === value ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm' : 'text-[hsl(var(--muted-foreground))]'}`}>{value === 'all' ? 'All' : statusLabels[value]}</button>)}</div></div>
    {query.isLoading ? <div className="content-card h-80 p-6"><Skeleton className="h-full w-full" /></div> : query.isError ? <QueryError onRetry={() => query.refetch()} label="your projects" /> : projects.length === 0 ? <EmptyState icon={FolderKanban} title={search || filter !== 'all' ? 'Nothing in this view.' : 'Make the first move.'} body={search || filter !== 'all' ? 'Try widening your search or choosing another stage.' : 'Projects give a good conversation somewhere to land.'} action={<button data-testid="button-empty-new-project" onClick={() => setModal(true)} className="secondary-button"><Plus size={15} /> New project</button>} /> : <div className="content-card divide-y divide-[hsl(var(--border))]">{projects.map((project) => <ProjectRow key={project.id} project={project} actions={<div className="flex items-center gap-1"><div className="relative hidden sm:block"><select data-testid={`select-status-project-${project.id}`} value={project.status} onChange={(event) => changeStatus(project, event.target.value as ProjectInputStatus)} className="max-w-[130px] appearance-none rounded-md bg-transparent py-1.5 pl-2 pr-6 text-xs text-[hsl(var(--muted-foreground))] outline-none hover:bg-[hsl(var(--muted))]"><option value="lead">Move to...</option>{projectStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select><ChevronDown size={13} className="pointer-events-none absolute right-1 top-2.5 text-[hsl(var(--muted-foreground))]" /></div><button data-testid={`button-edit-project-${project.id}`} onClick={() => { setEditing(project); setModal(true); }} className="icon-button" title="Edit project"><Pencil size={15} /></button><button data-testid={`button-delete-project-${project.id}`} onClick={() => del(project)} className="icon-button icon-danger" title="Delete project"><Trash2 size={15} /></button></div>} />)}</div>}
    {modal && <ProjectModal project={editing} clients={clients.data ?? []} pending={create.isPending || update.isPending} onClose={() => { setModal(false); setEditing(null); }} onSave={save} />}
  </div>;
}

function ProjectModal({ project, clients, pending, onClose, onSave }: { project: Project | null; clients: Client[]; pending: boolean; onClose: () => void; onSave: (form: { clientId: string; title: string; budget: string; status: ProjectInputStatus }) => void }) {
  const [clientId, setClientId] = useState(project?.clientId ?? clients[0]?.id ?? '');
  const [title, setTitle] = useState(project?.title ?? '');
  const [budget, setBudget] = useState(project?.budget?.toString() ?? '');
  const [status, setStatus] = useState<ProjectInputStatus>(project?.status ?? 'lead');
  return <Modal eyebrow={project ? 'Edit project' : 'New project'} title={project ? 'Keep it moving.' : 'Give the work a shape.'} onClose={onClose}><div className="space-y-5">{clients.length ? <Field label="Client"><SelectInput testId="select-project-client" value={clientId} onChange={setClientId} options={clients.map((client) => ({ value: client.id, label: client.name + (client.company ? ` · ${client.company}` : '') }))} /></Field> : <div className="rounded-lg bg-[hsl(var(--accent)/.12)] p-4 text-sm text-[hsl(var(--foreground))]">Add a client first, then give this project a home.</div>}<Field label="Project title"><TextInput testId="input-project-title" value={title} onChange={setTitle} placeholder="e.g. Positioning sprint" /></Field><div className="grid gap-5 sm:grid-cols-2"><Field label="Budget (USD)"><TextInput testId="input-project-budget" type="number" value={budget} onChange={setBudget} placeholder="8500" /></Field><Field label="Stage"><SelectInput testId="select-project-status" value={status} onChange={(value) => setStatus(value as ProjectInputStatus)} options={projectStatuses} /></Field></div></div><div className="mt-8 flex justify-end gap-3"><button data-testid="button-cancel-project" onClick={onClose} className="secondary-button">Cancel</button><button data-testid="button-save-project" disabled={pending || !clients.length} onClick={() => onSave({ clientId, title, budget, status })} className="primary-button">{pending ? 'Saving...' : project ? 'Save changes' : 'Create project'}</button></div></Modal>;
}

function Proposals() {
  const query = useListProposals();
  const projects = useListProjects();
  const generate = useGenerateProposal();
  const invalidate = useInvalidate();
  const [modal, setModal] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [notes, setNotes] = useState('');
  const open = () => { setProjectId(projects.data?.[0]?.id ?? ''); setNotes(''); setModal(true); };
  const submit = () => { if (!projectId || !notes.trim()) return; generate.mutate({ data: { projectId, notes } }, { onSuccess: () => { invalidate([getListProposalsQueryKey()]); setModal(false); } }); };
  return <div data-testid="page-proposals"><PageHeading kicker="Make the case" title="Good scope travels." body="Turn the useful bits of a conversation into a clear yes. Your proposals stay here, ready for the next client." action={<button data-testid="button-generate-proposal" onClick={open} className="primary-button"><Sparkles size={16} /> Generate proposal</button>} />
    <div className="mb-6 flex items-center gap-3 rounded-xl border border-[hsl(var(--accent)/.35)] bg-[hsl(var(--accent)/.08)] p-4 text-sm"><Sparkles size={18} className="shrink-0 text-[hsl(var(--accent))]" /><span className="text-[hsl(var(--foreground))]"><strong className="font-semibold">A useful first draft, not a final answer.</strong> Add the sharp edges from your client conversation and we’ll shape the scope.</span></div>
    {query.isLoading ? <div className="grid gap-4 md:grid-cols-2">{[1, 2].map((n) => <div className="content-card h-64 p-6" key={n}><Skeleton className="h-3 w-20" /><Skeleton className="mt-5 h-6 w-3/4" /><Skeleton className="mt-8 h-3 w-full" /><Skeleton className="mt-3 h-3 w-2/3" /></div>)}</div> : query.isError ? <QueryError onRetry={() => query.refetch()} label="your proposals" /> : !query.data?.length ? <EmptyState icon={FileText} title="Nothing drafted yet." body="Pick a project, add what you heard, and let the first draft do the heavy lifting." action={<button data-testid="button-empty-generate-proposal" onClick={open} className="secondary-button"><Sparkles size={15} /> Draft a proposal</button>} /> : <div className="grid gap-4 md:grid-cols-2">{query.data.map((proposal) => <div data-testid={`card-proposal-${proposal.id}`} key={proposal.id} className="content-card flex flex-col p-6 transition hover:-translate-y-0.5 hover:shadow-lg"><div className="flex items-start justify-between"><span className="eyebrow text-[hsl(var(--primary))]">Proposal / {formatDate(proposal.createdAt)}</span><Badge value={proposal.isSigned ? 'signed' : 'draft'} signed={proposal.isSigned} /></div><h2 data-testid={`text-proposal-title-${proposal.id}`} className="mt-5 font-display text-3xl leading-tight">{proposal.projectTitle}</h2><p className="mt-4 line-clamp-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{proposal.scopeMarkdown.replace(/[#*_]/g, '')}</p><div className="mt-auto flex items-center justify-between border-t border-[hsl(var(--border))] pt-5"><span data-testid={`text-proposal-deliverables-${proposal.id}`} className="text-xs text-[hsl(var(--muted-foreground))]">{proposal.deliverables.length} deliverable{proposal.deliverables.length === 1 ? '' : 's'}</span><span data-testid={`text-proposal-read-scope-${proposal.id}`} className="quiet-link">Read scope <ArrowUpRight size={14} /></span></div></div>)}</div>}
    {modal && <Modal eyebrow="AI-assisted draft" title="What did you hear?" onClose={() => setModal(false)} wide><div className="space-y-5"><Field label="Project"><SelectInput testId="select-proposal-project" value={projectId} onChange={setProjectId} options={(projects.data ?? []).map((project) => ({ value: project.id, label: project.title }))} /></Field><Field label="Conversation notes"><textarea data-testid="textarea-proposal-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="The client wants to clarify their offer before the next launch. They have three audiences..." rows={7} className="w-full resize-y rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3.5 py-3 text-sm leading-6 text-[hsl(var(--foreground))] outline-none placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))]" /></Field></div><div className="mt-8 flex justify-end gap-3"><button data-testid="button-cancel-proposal" onClick={() => setModal(false)} className="secondary-button">Cancel</button><button data-testid="button-submit-proposal" disabled={generate.isPending || !projectId || !notes.trim()} onClick={submit} className="primary-button"><Sparkles size={15} />{generate.isPending ? 'Finding the shape...' : 'Generate draft'}</button></div></Modal>}
  </div>;
}

function Invoices() {
  const query = useListInvoices();
  const projects = useListProjects();
  const invalidate = useInvalidate();
  const create = useCreateInvoice();
  const update = useUpdateInvoice();
  const remove = useDeleteInvoice();
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [modal, setModal] = useState(false);
  const [filter, setFilter] = useState<'all' | InvoiceInputStatus>('all');
  const invoices = useMemo(() => (query.data ?? []).filter((invoice) => filter === 'all' || invoice.status === filter), [query.data, filter]);
  const save = (form: { projectId: string; amount: string; status: InvoiceInputStatus; dueDate: string }) => {
    const done = () => { invalidate([getListInvoicesQueryKey(), getGetDashboardQueryKey()]); setModal(false); setEditing(null); };
    if (editing) update.mutate({ id: editing.id, data: { amount: Number(form.amount), status: form.status as InvoiceUpdateStatus, dueDate: form.dueDate || null } }, { onSuccess: done }); else create.mutate({ data: { projectId: form.projectId, amount: Number(form.amount), status: form.status, dueDate: form.dueDate || undefined } }, { onSuccess: done });
  };
  const del = (invoice: Invoice) => { if (window.confirm(`Delete this invoice for ${invoice.projectTitle}?`)) remove.mutate({ id: invoice.id }, { onSuccess: () => invalidate([getListInvoicesQueryKey(), getGetDashboardQueryKey()]) }); };
  const changeStatus = (invoice: Invoice, status: InvoiceInputStatus) => update.mutate({ id: invoice.id, data: { status: status as InvoiceUpdateStatus } }, { onSuccess: () => invalidate([getListInvoicesQueryKey(), getGetDashboardQueryKey()]) });
  return <div data-testid="page-invoices"><PageHeading kicker="The money part" title="Good work, paid well." body="Invoices that know where they came from, when they’re due, and what happened next." action={<button data-testid="button-new-invoice" onClick={() => { setEditing(null); setModal(true); }} className="primary-button"><Plus size={16} /> New invoice</button>} />
    <div className="mb-5 flex items-center justify-between"><div className="flex gap-1 overflow-x-auto rounded-lg bg-[hsl(var(--muted))] p-1">{(['all', ...invoiceStatuses] as const).map((value) => <button data-testid={`button-filter-invoice-${value}`} key={value} onClick={() => setFilter(value)} className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-semibold transition ${filter === value ? 'bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm' : 'text-[hsl(var(--muted-foreground))]'}`}>{value === 'all' ? 'All' : statusLabels[value]}</button>)}</div><span data-testid="text-invoice-count" className="hidden text-xs text-[hsl(var(--muted-foreground))] sm:block">{invoices.length} invoice{invoices.length === 1 ? '' : 's'}</span></div>
    {query.isLoading ? <div className="content-card h-80 p-6"><Skeleton className="h-full w-full" /></div> : query.isError ? <QueryError onRetry={() => query.refetch()} label="your invoices" /> : invoices.length === 0 ? <EmptyState icon={Receipt} title="No invoices in this view." body="When the scope is clear, the money part should be clear too." action={<button data-testid="button-empty-new-invoice" onClick={() => setModal(true)} className="secondary-button"><Plus size={15} /> Create an invoice</button>} /> : <div className="content-card divide-y divide-[hsl(var(--border))]">{invoices.map((invoice) => <div data-testid={`row-invoice-${invoice.id}`} key={invoice.id} className="flex flex-col gap-4 p-5 transition hover:bg-[hsl(var(--muted)/.4)] sm:flex-row sm:items-center sm:p-6"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Receipt size={18} /></div><div className="min-w-0 flex-1"><p data-testid={`text-invoice-project-${invoice.id}`} className="truncate font-semibold">{invoice.projectTitle}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]"><CalendarDays size={13} /> Due {formatDate(invoice.dueDate)}</p></div><p data-testid={`text-invoice-amount-${invoice.id}`} className="font-mono text-lg">{formatMoney(invoice.amount)}</p><Badge value={invoice.status} /><div className="flex items-center gap-1"><div className="relative hidden sm:block"><select data-testid={`select-status-invoice-${invoice.id}`} value={invoice.status} onChange={(event) => changeStatus(invoice, event.target.value as InvoiceInputStatus)} className="max-w-[115px] appearance-none rounded-md bg-transparent py-1.5 pl-2 pr-6 text-xs text-[hsl(var(--muted-foreground))] outline-none hover:bg-[hsl(var(--muted))]"><option value="draft">Move to...</option>{invoiceStatuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}</select><ChevronDown size={13} className="pointer-events-none absolute right-1 top-2.5 text-[hsl(var(--muted-foreground))]" /></div><button data-testid={`button-edit-invoice-${invoice.id}`} onClick={() => { setEditing(invoice); setModal(true); }} className="icon-button" title="Edit invoice"><Pencil size={15} /></button><button data-testid={`button-delete-invoice-${invoice.id}`} onClick={() => del(invoice)} className="icon-button icon-danger" title="Delete invoice"><Trash2 size={15} /></button></div></div>)}</div>}
    {modal && <InvoiceModal invoice={editing} projects={projects.data ?? []} pending={create.isPending || update.isPending} onClose={() => { setModal(false); setEditing(null); }} onSave={save} />}
  </div>;
}

function InvoiceModal({ invoice, projects, pending, onClose, onSave }: { invoice: Invoice | null; projects: Project[]; pending: boolean; onClose: () => void; onSave: (form: { projectId: string; amount: string; status: InvoiceInputStatus; dueDate: string }) => void }) {
  const [projectId, setProjectId] = useState(invoice?.projectId ?? projects[0]?.id ?? '');
  const [amount, setAmount] = useState(invoice?.amount.toString() ?? '');
  const [status, setStatus] = useState<InvoiceInputStatus>(invoice?.status ?? 'draft');
  const [dueDate, setDueDate] = useState(invoice?.dueDate?.slice(0, 10) ?? '');
  return <Modal eyebrow={invoice ? 'Edit invoice' : 'New invoice'} title={invoice ? 'Keep the details crisp.' : 'Name the number.'} onClose={onClose}><div className="space-y-5">{!invoice && (projects.length ? <Field label="Project"><SelectInput testId="select-invoice-project" value={projectId} onChange={setProjectId} options={projects.map((project) => ({ value: project.id, label: project.title }))} /></Field> : <div className="rounded-lg bg-[hsl(var(--accent)/.12)] p-4 text-sm">Create a project first, then attach the invoice to it.</div>)}<Field label="Amount (USD)"><TextInput testId="input-invoice-amount" type="number" value={amount} onChange={setAmount} placeholder="2400" /></Field><div className="grid gap-5 sm:grid-cols-2"><Field label="Status"><SelectInput testId="select-invoice-status" value={status} onChange={(value) => setStatus(value as InvoiceInputStatus)} options={invoiceStatuses} /></Field><Field label="Due date"><TextInput testId="input-invoice-due-date" type="date" value={dueDate} onChange={setDueDate} /></Field></div></div><div className="mt-8 flex justify-end gap-3"><button data-testid="button-cancel-invoice" onClick={onClose} className="secondary-button">Cancel</button><button data-testid="button-save-invoice" disabled={pending || (!invoice && !projects.length)} onClick={() => onSave({ projectId, amount, status, dueDate })} className="primary-button">{pending ? 'Saving...' : invoice ? 'Save changes' : 'Create invoice'}</button></div></Modal>;
}

function WorkspaceNotFound() {
  return <div data-testid="page-not-found" className="flex min-h-[65dvh] items-center justify-center"><div className="max-w-md text-center"><p className="eyebrow text-[hsl(var(--accent))]">404 / wrong turn</p><h1 className="mt-4 font-display text-6xl leading-none">That page wandered off.</h1><p className="mt-4 text-sm leading-6 text-[hsl(var(--muted-foreground))]">The work is still here. This particular view just isn’t part of the workspace.</p><Link data-testid="link-not-found-home" href="/" className="primary-button mt-7">Back to overview <ArrowUpRight size={15} /></Link></div></div>;
}

export { Overview, Clients, Projects, Proposals, Invoices, WorkspaceNotFound };