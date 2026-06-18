import { supabase } from '../lib/supabase';
import { guardCompanyId } from '../lib/tenantGuard';

// ─── Job Postings ───

// Get all job postings — MANDATORY company scope (admin view)
export async function getAllJobs(companyId) {
  if (!guardCompanyId(companyId, 'getAllJobs')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  return { data: data || [], error };
}

// Get open/active jobs (public career page — filtered by company slug or code)
export async function getOpenJobs(companyId) {
  let query = supabase
    .from('job_postings')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query;
  return { data: data || [], error };
}

export async function createJob(job) {
  const { data, error } = await supabase
    .from('job_postings')
    .insert({
      title: job.title,
      department: job.department,
      location: job.location,
      type: job.type || 'Full-time',
      status: job.status || 'open',
      description: job.description,
      requirements: job.requirements || [],
      deadline: job.deadline,
      company_id: job.companyId || null,
    })
    .select()
    .single();
  return { data, error };
}

// Update job — verify company ownership
export async function updateJob(id, job, companyId) {
  let query = supabase
    .from('job_postings')
    .update({
      title: job.title,
      department: job.department,
      location: job.location,
      type: job.type,
      status: job.status,
      description: job.description,
      requirements: job.requirements,
      deadline: job.deadline,
    })
    .eq('id', id);
  if (companyId) query = query.eq('company_id', companyId);
  const { data, error } = await query.select().single();
  return { data, error };
}

// Delete job — verify company ownership
export async function deleteJob(id, companyId) {
  let query = supabase.from('job_postings').delete().eq('id', id);
  if (companyId) query = query.eq('company_id', companyId);
  const { error } = await query;
  return { error };
}

// ─── Candidates ───

export async function getCandidatesByJob(jobId) {
  const { data, error } = await supabase
    .from('candidates')
    .select('*, job_postings(title, department)')
    .eq('job_id', jobId)
    .order('applied_date', { ascending: false });
  return { data: data || [], error };
}

// Get all candidates — MANDATORY company scope via job_postings join
export async function getAllCandidates(companyId) {
  if (!guardCompanyId(companyId, 'getAllCandidates')) return { data: [], error: null };
  const { data, error } = await supabase
    .from('candidates')
    .select('*, job_postings!inner(title, department, company_id)')
    .eq('job_postings.company_id', companyId)
    .order('applied_date', { ascending: false });
  return { data: data || [], error };
}

export async function createCandidate(candidate) {
  const { data, error } = await supabase
    .from('candidates')
    .insert({
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      job_id: candidate.jobId,
      stage: candidate.stage || 'applied',
      source: candidate.source,
      rating: candidate.rating,
      notes: candidate.notes,
      applied_date: candidate.appliedDate || new Date().toISOString().split('T')[0],
    })
    .select()
    .single();
  return { data, error };
}

export async function updateCandidate(id, updates) {
  const { data, error } = await supabase
    .from('candidates')
    .update({
      name: updates.name,
      email: updates.email,
      phone: updates.phone,
      stage: updates.stage,
      rating: updates.rating,
      notes: updates.notes,
    })
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteCandidate(id) {
  const { error } = await supabase.from('candidates').delete().eq('id', id);
  return { error };
}
