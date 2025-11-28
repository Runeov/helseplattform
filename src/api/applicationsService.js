/**
 * Applications API Service
 * Handles shift application operations
 */

import { supabase } from './supabase';

/**
 * Get pending applications for a department
 * @param {string} departmentId - Department UUID
 * @returns {Promise<Array>} - List of pending applications
 */
export async function getPendingApplications(departmentId) {
  if (!supabase) {
    return getMockPendingApplications();
  }

  const { data, error } = await supabase
    .from('shift_applications')
    .select(`
      *,
      shifts!inner(
        id,
        profession_required,
        start_time,
        end_time,
        hourly_wage,
        description,
        department_id
      ),
      workers!inner(
        id,
        profession,
        hourly_rate,
        average_rating,
        total_reviews,
        profiles!inner(
          full_name,
          username,
          email
        )
      )
    `)
    .eq('shifts.department_id', departmentId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending applications:', error);
    throw error;
  }

  return data;
}

/**
 * Apply for a shift
 * @param {string} shiftId - Shift UUID
 * @param {string} workerId - Worker UUID
 * @param {string} message - Optional application message
 * @returns {Promise<Object>} - Created application
 */
export async function applyForShift(shiftId, workerId, message = '') {
  if (!supabase) {
    console.log('Mock: Applying for shift', shiftId);
    return { id: 'mock-application-id', shift_id: shiftId, worker_id: workerId };
  }

  const { data, error} = await supabase
    .from('shift_applications')
    .insert([{
      shift_id: shiftId,
      worker_id: workerId,
      status: 'pending',
      message: message,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error applying for shift:', error);
    throw error;
  }

  return data;
}

/**
 * Approve an application
 * @param {string} applicationId - Application UUID
 * @returns {Promise<Object>} - Updated application and created contract
 */
export async function approveApplication(applicationId) {
  if (!supabase) {
    console.log('Mock: Approving application', applicationId);
    return { id: applicationId, status: 'approved' };
  }

  // Start a transaction
  const { data: application, error: appError } = await supabase
    .from('shift_applications')
    .update({ status: 'approved' })
    .eq('id', applicationId)
    .select(`
      *,
      shifts!inner(id, department_id)
    `)
    .single();

  if (appError) {
    console.error('Error approving application:', appError);
    throw appError;
  }

  // Create contract
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .insert([{
      shift_id: application.shift_id,
      worker_id: application.worker_id,
      status: 'active',
    }])
    .select()
    .single();

  if (contractError) {
    console.error('Error creating contract:', contractError);
    throw contractError;
  }

  // Update shift status to assigned
  await supabase
    .from('shifts')
    .update({ status: 'assigned' })
    .eq('id', application.shift_id);

  return { application, contract };
}

/**
 * Reject an application
 * @param {string} applicationId - Application UUID
 * @returns {Promise<Object>} - Updated application
 */
export async function rejectApplication(applicationId) {
  if (!supabase) {
    console.log('Mock: Rejecting application', applicationId);
    return { id: applicationId, status: 'rejected' };
  }

  const { data, error } = await supabase
    .from('shift_applications')
    .update({ status: 'rejected' })
    .eq('id', applicationId)
    .select()
    .single();

  if (error) {
    console.error('Error rejecting application:', error);
    throw error;
  }

  return data;
}

/**
 * Get worker's applications
 * @param {string} workerId - Worker UUID
 * @returns {Promise<Array>} - List of worker's applications
 */
export async function getWorkerApplications(workerId) {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('shift_applications')
    .select(`
      *,
      shifts!inner(
        id,
        profession_required,
        start_time,
        end_time,
        hourly_wage,
        description,
        status,
        departments!inner(
          municipality_name,
          department_name
        )
      )
    `)
    .eq('worker_id', workerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching worker applications:', error);
    throw error;
  }

  return data;
}

// =====================================================
// MOCK DATA
// =====================================================

function getMockPendingApplications() {
  return [
    {
      id: '1',
      status: 'pending',
      message: 'Jeg er interessert i denne vakten',
      created_at: '2024-12-10T10:00:00Z',
      shifts: [{
        id: 'shift-1',
        profession_required: 'Sykepleier',
        start_time: '2024-12-16T08:00:00Z',
        end_time: '2024-12-16T16:00:00Z',
        hourly_wage: 460,
      }],
      workers: [{
        profession: 'Sykepleier',
        hourly_rate: 450,
        average_rating: 4.5,
        total_reviews: 10,
        profiles: [{
          full_name: 'Kari Hansen',
          username: 'kari_h',
        }],
      }],
    },
  ];
}

function getMockDepartmentShifts() {
  return getMockOpenShifts();
}

function getMockUpcomingShifts() {
  return [
    {
      id: '3',
      profession_required: 'Helsefagarbeider',
      start_time: '2024-12-18T08:00:00Z',
      end_time: '2024-12-18T16:00:00Z',
      hourly_wage: 380,
      status: 'assigned',
      contracts: [{
        workers: [{
          profiles: [{
            full_name: 'Thomas Sykepleier',
            username: 'user1',
          }],
        }],
      }],
    },
  ];
}

function getMockCompletedShifts() {
  return [
    {
      id: '4',
      profession_required: 'Sykepleier',
      start_time: '2024-12-05T22:00:00Z',
      end_time: '2024-12-06T06:00:00Z',
      hourly_wage: 450,
      status: 'completed',
      contracts: [{
        workers: [{
          profiles: [{
            full_name: 'Thomas Sykepleier',
            username: 'user1',
          }],
        }],
      }],
      reviews: [{
        rating: 5,
        comment: 'Utmerket arbeid!',
      }],
    },
  ];
}

function getMockOpenShifts() {
  return [
    {
      id: '1',
      profession_required: 'Sykepleier',
      start_time: '2024-12-15T22:00:00Z',
      end_time: '2024-12-16T06:00:00Z',
      hourly_wage: 450,
      description: 'Nattevakt',
      status: 'open',
      departments: {
        municipality_name: 'Gran kommune',
        department_name: 'Sykehjemmet avd. 2',
      },
    },
  ];
}