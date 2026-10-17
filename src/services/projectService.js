import { supabase } from '../lib/supabase';
import { guardCompanyId, resolveMyEmployee } from '../lib/tenantGuard';

/**
 * Owner check for timesheet rows: the row's employee_id must equal the
 * session employee (timesheets has no company_id column — ownership via
 * employees join is the tenant boundary; RLS remains the DB backstop).
 * Returns { employeeId } or { error }.
 */
async function assertTimesheetOwner(id, context) {
  const me = await resolveMyEmployee();
  if (!me?.id) {
    return { error: { message: `${context}: employee identity unavailable`, code: 'IDENTITY_UNAVAILABLE' } };
  }
  const { data, error } = await supabase
    .from('timesheets')
    .select('id, employee_id')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) {
    return { error: { message: `${context}: timesheet not found`, code: 'NOT_FOUND' } };
  }
  if (String(data.employee_id) !== String(me.id)) {
    return { error: { message: `${context}: not your timesheet entry`, code: 'FORBIDDEN' } };
  }
  return { employeeId: me.id };
}

// ─── Projects CRUD ───

// Get all projects — MANDATORY company scope
export async function getAllProjects(companyId) {
  if (!guardCompanyId(companyId, 'getAllProjects')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

// Get active projects — MANDATORY company scope (was missing company filter!)
export async function getActiveProjects(companyId) {
  if (!guardCompanyId(companyId, 'getActiveProjects')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .order('name');
  return { data: data || [], error };
}

export async function getProjectById(id) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  return { data, error };
}

export async function createProject(project) {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: project.name,
      client: project.client || null,
      description: project.description || null,
      status: project.status || 'active',
      priority: project.priority || 'medium',
      start_date: project.startDate,
      end_date: project.endDate || null,
      hourly_rate: project.hourlyRate || 0,
      color: project.color || '#4F46E5',
      company_id: project.companyId || null,
    })
    .select()
    .single();
  return { data, error };
}

// Update project — MANDATORY company ownership
export async function updateProject(id, project, companyId) {
  if (!guardCompanyId(companyId, 'updateProject')) return { data: null, error: { message: 'company_id required' } };
  const payload = {};
  if (project.name !== undefined) payload.name = project.name;
  if (project.client !== undefined) payload.client = project.client;
  if (project.description !== undefined) payload.description = project.description;
  if (project.status !== undefined) payload.status = project.status;
  if (project.priority !== undefined) payload.priority = project.priority;
  if (project.startDate !== undefined) payload.start_date = project.startDate;
  if (project.endDate !== undefined) payload.end_date = project.endDate;
  if (project.hourlyRate !== undefined) payload.hourly_rate = project.hourlyRate;
  if (project.color !== undefined) payload.color = project.color;

  const { data, error } = await supabase
    .from('projects')
    .update(payload)
    .eq('id', id)
    .eq('company_id', companyId)
    .select().single();
  return { data, error };
}

// Delete project — MANDATORY company ownership
export async function deleteProject(id, companyId) {
  if (!guardCompanyId(companyId, 'deleteProject')) return { error: { message: 'company_id required' } };
  const { error } = await supabase.from('projects').delete().eq('id', id).eq('company_id', companyId);
  return { error };
}

// ─── Project Assignments ───

export async function getProjectAssignments(projectId) {
  const { data, error } = await supabase
    .from('project_assignments')
    .select('*, employees(id, name, division, position), projects(name, color)')
    .eq('project_id', projectId)
    .order('created_at');
  return { data: data || [], error };
}

// Get all assignments — MANDATORY company scope (was missing company filter!)
export async function getAllAssignments(companyId) {
  if (!guardCompanyId(companyId, 'getAllAssignments')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('project_assignments')
    .select('*, employees!inner(id, name, division, position, company_id), projects(id, name, color, start_date, end_date, status, priority)')
    .eq('employees.company_id', companyId)
    .order('employee_id');
  return { data: data || [], error };
}

export async function getEmployeeProjects(employeeId) {
  const { data, error } = await supabase
    .from('project_assignments')
    .select('*, projects(id, name, client, description, status, priority, start_date, end_date, hourly_rate, color)')
    .eq('employee_id', employeeId)
    .order('created_at');
  return { data: data || [], error };
}

export async function assignEmployee(projectId, employeeId, role = 'member', allocationPct = 100) {
  const { data, error } = await supabase
    .from('project_assignments')
    .upsert({
      project_id: projectId,
      employee_id: employeeId,
      role,
      allocation_pct: allocationPct,
    }, { onConflict: 'project_id,employee_id' })
    .select()
    .single();
  return { data, error };
}

export async function removeAssignment(id) {
  const { error } = await supabase.from('project_assignments').delete().eq('id', id);
  return { error };
}

// ─── Timesheets ───

export async function getTimesheets(filters = {}, companyId = null) {
  // Prefer company scope via employees join (multi-tenant)
  let query = companyId
    ? supabase
      .from('timesheets')
      .select('*, employees!inner(id, name, division, company_id), projects(id, name, client, hourly_rate, color)')
      .eq('employees.company_id', companyId)
      .order('date', { ascending: false })
    : supabase
      .from('timesheets')
      .select('*, employees(id, name, division), projects(id, name, client, hourly_rate, color)')
      .order('date', { ascending: false });

  if (filters.projectId) query = query.eq('project_id', filters.projectId);
  if (filters.employeeId) query = query.eq('employee_id', filters.employeeId);
  if (filters.dateFrom) query = query.gte('date', filters.dateFrom);
  if (filters.dateTo) query = query.lte('date', filters.dateTo);

  const { data, error } = await query;
  return { data: data || [], error };
}

export async function getMyTimesheets(employeeId, dateFrom, dateTo, limit = null) {
  let query = supabase
    .from('timesheets')
    .select('*, projects(id, name, color)')
    .eq('employee_id', employeeId)
    .order('date', { ascending: false });

  if (dateFrom) query = query.gte('date', dateFrom);
  if (dateTo) query = query.lte('date', dateTo);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  return { data: data || [], error };
}

// Log a manual timesheet entry (PWA) — scoped by employee ownership;
// RLS remains primary (timesheets has no company_id column).
export async function logTimesheet(employeeId, entry) {
  if (!employeeId) return { data: null, error: { message: 'employeeId required' } };
  const hours = parseFloat(entry?.hours);
  if (!hours || hours <= 0 || hours > 24) {
    return { data: null, error: { message: 'Hours must be between 0 and 24' } };
  }
  if (!entry?.task) return { data: null, error: { message: 'Task required' } };
  const { data, error } = await supabase
    .from('timesheets')
    .insert({
      employee_id: employeeId,
      date: entry.date || new Date().toISOString().split('T')[0],
      hours,
      project: entry.project || null,
      task: entry.task,
      notes: entry.notes || null,
    })
    .select()
    .single();
  return { data, error };
}

export async function startTimer(employeeId, projectId, description = '') {
  const { data, error } = await supabase
    .from('timesheets')
    .insert({
      employee_id: employeeId,
      project_id: projectId,
      date: new Date().toISOString().split('T')[0],
      start_time: new Date().toISOString(),
      description,
      billable: true,
    })
    .select()
    .single();
  return { data, error };
}

export async function stopTimer(id) {
  const ownership = await assertTimesheetOwner(id, 'stopTimer');
  if (ownership.error) return { data: null, error: ownership.error };
  const now = new Date();
  // First get the start_time to calculate hours
  const { data: entry } = await supabase.from('timesheets').select('start_time').eq('id', id).single();
  let hours = 0;
  if (entry?.start_time) {
    hours = Math.round(((now - new Date(entry.start_time)) / 3600000) * 100) / 100;
  }
  const { data, error } = await supabase
    .from('timesheets')
    .update({ end_time: now.toISOString(), hours })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function getActiveTimer(employeeId) {
  const { data, error } = await supabase
    .from('timesheets')
    .select('*, projects(id, name, color)')
    .eq('employee_id', employeeId)
    .is('end_time', null)
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data, error };
}

export async function updateTimesheet(id, updates) {
  const ownership = await assertTimesheetOwner(id, 'updateTimesheet');
  if (ownership.error) return { data: null, error: ownership.error };
  const { data, error } = await supabase
    .from('timesheets')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteTimesheet(id) {
  const ownership = await assertTimesheetOwner(id, 'deleteTimesheet');
  if (ownership.error) return { error: ownership.error };
  const { error } = await supabase.from('timesheets').delete().eq('id', id);
  return { error };
}

// ─── Stats ───

export async function getProjectStats(projectId) {
  const { data, error } = await supabase
    .from('timesheets')
    .select('hours, billable, projects(hourly_rate)')
    .eq('project_id', projectId)
    .not('hours', 'is', null);

  if (error) return { data: null, error };

  const totalHours = (data || []).reduce((s, t) => s + (t.hours || 0), 0);
  const billableHours = (data || []).filter(t => t.billable).reduce((s, t) => s + (t.hours || 0), 0);
  const rate = data?.[0]?.projects?.hourly_rate || 0;
  const revenue = billableHours * rate;

  return { data: { totalHours, billableHours, revenue }, error: null };
}
