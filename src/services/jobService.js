import { supabase } from '../lib/supabase';

// ─── Job Postings ───

export async function getAllJobs() {
    const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .order('created_at', { ascending: false });
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
        })
        .select()
        .single();
    return { data, error };
}

export async function updateJob(id, job) {
    const { data, error } = await supabase
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
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

export async function deleteJob(id) {
    const { error } = await supabase.from('job_postings').delete().eq('id', id);
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

export async function getAllCandidates() {
    const { data, error } = await supabase
        .from('candidates')
        .select('*, job_postings(title, department)')
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
