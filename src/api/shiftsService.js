/**
 * Shifts API Service
 * Handles all shift-related database operations
 */

import { supabase } from './supabase';

/**
 * Get all open shifts
 * @param {Object} filters - Optional filters (profession, municipality, etc.)
 * @returns {Promise<Array>} - List of open shifts
 */
export async function getOpenShifts(filters = {}) {
  if (!supabase) {
    // Return mock data if Supabase not configured
    return getMockOpenShifts();
  }

  let query = supabase
    .from('shifts')
    .select(`
      *,
      departments!inner(
        id,
        municipality_name,
        department_name,
        cost_center_code
      )
    `)
    .eq('status', 'open')
    .gt('start_time', new Date().toISOString())
    .order('start_time', { ascending: true });

  if (filters.profession) {
    query = query.eq('profession_required', filters.profession);
  }

  if (filters.municipality) {
    query = query.eq('departments.municipality_name', filters.municipality);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching open shifts:', error);
    throw error;
  }

  return data;
}

/**
 * Get shifts for a specific department
 * @param {string} departmentId - Department UUID
 * @returns {Promise<Array>} - List of department's shifts
 */
export async function getDepartmentShifts(departmentId) {
  if (!supabase) {
    return getMockDepartmentShifts();
  }

  const { data, error } = await supabase
    .from('shifts')
    .select(`
      *,
      shift_applications(
        id,
        status,
        worker_id,
        created_at,
        workers!inner(
          id,
          profession,
          hourly_rate,
          average_rating,
          profiles!inner(full_name, username)
        )
      )
    `)
    .eq('department_id', departmentId)
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Error fetching department shifts:', error);
    throw error;
  }

  return data;
}

/**
 * Get upcoming shifts (assigned to workers)
 * @param {string} departmentId - Department UUID
 * @returns {Promise<Array>} - List of upcoming shifts
 */
export async function getUpcomingShifts(departmentId) {
  if (!supabase) {
    return getMockUpcomingShifts();
  }

  const { data, error } = await supabase
    .from('shifts')
    .select(`
      *,
      contracts!inner(
        id,
        worker_id,
        status,
        workers!inner(
          id,
          profession,
          profiles!inner(full_name, username)
        )
      )
    `)
    .eq('department_id', departmentId)
    .eq('status', 'assigned')
    .gt('start_time', new Date().toISOString())
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching upcoming shifts:', error);
    throw error;
  }

  return data;
}

/**
 * Get completed shifts (history)
 * @param {string} departmentId - Department UUID
 * @returns {Promise<Array>} - List of completed shifts
 */
export async function getCompletedShifts(departmentId) {
  if (!supabase) {
    return getMockCompletedShifts();
  }

  const { data, error } = await supabase
    .from('shifts')
    .select(`
      *,
      contracts!inner(
        id,
        worker_id,
        workers!inner(
          id,
          profession,
          profiles!inner(full_name, username)
        )
      ),
      reviews(
        id,
        rating,
        comment
      )
    `)
    .eq('department_id', departmentId)
    .eq('status', 'completed')
    .order('start_time', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching completed shifts:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new shift
 * @param {Object} shiftData - Shift details
 * @returns {Promise<Object>} - Created shift
 */
export async function createShift(shiftData) {
  if (!supabase) {
    console.log('Mock: Creating shift', shiftData);
    return { id: 'mock-shift-id', ...shiftData };
  }

  const { data, error } = await supabase
    .from('shifts')
    .insert([{
      department_id: shiftData.departmentId,
      start_time: shiftData.startTime,
      end_time: shiftData.endTime,
      profession_required: shiftData.profession,
      hourly_wage: shiftData.hourlyWage,
      description: shiftData.description,
      status: 'open',
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating shift:', error);
    throw error;
  }

  return data;
}

/**
 * Update shift status
 * @param {string} shiftId - Shift UUID
 * @param {string} status - New status
 * @returns {Promise<Object>} - Updated shift
 */
export async function updateShiftStatus(shiftId, status) {
  if (!supabase) {
    console.log('Mock: Updating shift status', shiftId, status);
    return { id: shiftId, status };
  }

  const { data, error } = await supabase
    .from('shifts')
    .update({ status })
    .eq('id', shiftId)
    .select()
    .single();

  if (error) {
    console.error('Error updating shift status:', error);
    throw error;
  }

  return data;
}

// =====================================================
// MOCK DATA FUNCTIONS (for development without Supabase)
// =====================================================

function getMockOpenShifts() {
  return [
    {
      id: '1',
      profession_required: 'Sykepleier',
      start_time: '2024-12-15T22:00:00Z',
      end_time: '2024-12-16T06:00:00Z',
      hourly_wage: 450,
      description: 'Nattevakt på sykehjem',
      status: 'open',
      departments: {
        municipality_name: 'Gran kommune',
        department_name: 'Sykehjemmet avd. 2',
      },
    },
    {
      id: '2',
      profession_required: 'Vernepleier',
      start_time: '2024-12-20T10:00:00Z',
      end_time: '2024-12-20T22:00:00Z',
      hourly_wage: 420,
      description: 'Helgevakt',
      status: 'open',
      departments: {
        municipality_name: 'Bergen kommune',
        department_name: 'Bofellesskap',
      },
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