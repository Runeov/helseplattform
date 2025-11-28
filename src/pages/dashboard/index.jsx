import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getOpenShifts, getUpcomingShifts, getCompletedShifts } from '../../api/shiftsService';
import { getPendingApplications, approveApplication, rejectApplication, getWorkerApplications } from '../../api/applicationsService';
import { supabase } from '../../api/supabase';

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data states
  const [openShifts, setOpenShifts] = useState([]);
  const [pendingApplications, setPendingApplications] = useState([]);
  const [upcomingShifts, setUpcomingShifts] = useState([]);
  const [completedShifts, setCompletedShifts] = useState([]);
  
  // User info
  const [userProfile, setUserProfile] = useState(null);
  const [departmentId, setDepartmentId] = useState(null);
  const [workerId, setWorkerId] = useState(null);
  const [userRole, setUserRole] = useState(null);

  // Load user profile on mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  // Load all stats data when user profile and role-specific IDs are loaded
  useEffect(() => {
    // Only load stats when we have the user profile AND the role-specific ID
    if (userProfile && userRole) {
      // For workers, wait for workerId; for employers, wait for departmentId
      if ((userRole === 'worker' && workerId) || (userRole === 'employer' && departmentId)) {
        loadAllStats();
      }
    }
  }, [userProfile, userRole, departmentId, workerId]);

  // Load tab-specific data when tab changes
  useEffect(() => {
    if (userProfile) {
      loadData();
    }
  }, [activeTab, userProfile, departmentId, workerId]);

  const loadUserProfile = async () => {
    try {
      const userEmail = sessionStorage.getItem('user_email');
      if (!userEmail) {
        setError('Ikke innlogget. Vennligst logg inn.');
        setLoading(false);
        return;
      }

      if (!supabase) {
        // Mock mode - use mock data
        setUserProfile({ id: 'mock-user', email: userEmail });
        setUserRole('employer');
        setDepartmentId('mock-dept-id');
        return;
      }

      // Get user profile from database
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, username, role')
        .eq('email', userEmail)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setError('Kunne ikke hente brukerprofil');
        setLoading(false);
        return;
      }

      setUserProfile(profileData);
      setUserRole(profileData.role);

      // If user is an employer (department), their profile ID is also their department ID
      if (profileData.role === 'employer') {
        // Check if they have a department entry
        const { data: deptData, error: deptError } = await supabase
          .from('departments')
          .select('id')
          .eq('id', profileData.id)
          .single();

        if (deptData) {
          setDepartmentId(deptData.id);
        } else {
          // Profile ID is the department ID in this schema
          setDepartmentId(profileData.id);
        }
      }

      // If user is a worker, their profile ID is also their worker ID
      if (profileData.role === 'worker') {
        // Check if they have a worker entry
        const { data: workerData, error: workerError } = await supabase
          .from('workers')
          .select('id')
          .eq('id', profileData.id)
          .single();

        if (workerData) {
          setWorkerId(workerData.id);
        } else {
          // Profile ID is the worker ID in this schema
          setWorkerId(profileData.id);
        }
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
      setError('Kunne ikke laste brukerprofil');
      setLoading(false);
    }
  };

  // Load all stats for the dashboard cards
  const loadAllStats = async () => {
    try {
      // Always load open shifts
      const open = await getOpenShifts();
      setOpenShifts(open);

      // Load applications based on role
      // For workers: show their own applications
      // For employers: show applications to their shifts
      if (userRole === 'worker' && workerId) {
        const workerApps = await getWorkerApplications(workerId);
        setPendingApplications(workerApps);
        
        // Workers also need to see their upcoming and completed contracts
        // TODO: Add worker-specific upcoming/completed shifts if needed
      } else if (userRole === 'employer' && departmentId) {
        // Employer/kommune ansatte - load applications to their shifts
        const apps = await getPendingApplications(departmentId);
        setPendingApplications(apps);
        
        // Load upcoming and completed shifts for this department
        const upcoming = await getUpcomingShifts(departmentId);
        setUpcomingShifts(upcoming);

        const history = await getCompletedShifts(departmentId);
        setCompletedShifts(history);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error loading stats:', err);
      setLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      switch (activeTab) {
        case 'open':
          const open = await getOpenShifts();
          setOpenShifts(open);
          break;
        case 'applications':
          // For workers, show their own applications
          // For departments, show applications to their shifts
          if (userRole === 'worker' && workerId) {
            const workerApps = await getWorkerApplications(workerId);
            setPendingApplications(workerApps);
          } else if (departmentId) {
            const apps = await getPendingApplications(departmentId);
            setPendingApplications(apps);
          } else {
            setPendingApplications([]);
          }
          break;
        case 'upcoming':
          if (departmentId) {
            const upcoming = await getUpcomingShifts(departmentId);
            setUpcomingShifts(upcoming);
          } else {
            setUpcomingShifts([]);
          }
          break;
        case 'history':
          if (departmentId) {
            const history = await getCompletedShifts(departmentId);
            setCompletedShifts(history);
          } else {
            setCompletedShifts([]);
          }
          break;
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (applicationId) => {
    try {
      await approveApplication(applicationId);
      alert('Søknad godkjent!');
      loadData(); // Reload data
    } catch (err) {
      alert('Kunne ikke godkjenne søknad: ' + err.message);
    }
  };

  const handleReject = async (applicationId) => {
    try {
      await rejectApplication(applicationId);
      alert('Søknad avslått');
      loadData(); // Reload data
    } catch (err) {
      alert('Kunne ikke avslå søknad: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('nb-NO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (startString, endString) => {
    const start = new Date(startString);
    const end = new Date(endString);
    const hours = (end - start) / (1000 * 60 * 60);
    
    return `${start.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })} (${hours} timer)`;
  };

  const renderOpenShifts = () => {
    return openShifts.map((shift) => (
      <div key={shift.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">{shift.profession_required}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {shift.departments?.municipality_name} - {shift.departments?.department_name}
            </p>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
            Åpen
          </span>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-700">
            <span className="mr-2">📅</span>
            <span>{formatDate(shift.start_time)}</span>
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <span className="mr-2">⏰</span>
            <span>{formatTime(shift.start_time, shift.end_time)}</span>
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <span className="mr-2">💰</span>
            <span className="font-semibold text-gray-800">{shift.hourly_wage} NOK/time</span>
          </div>
        </div>
        
        {shift.description && (
          <p className="text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-lg">
            {shift.description}
          </p>
        )}
        
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <span className="text-sm text-gray-600">
            {shift.shift_applications?.length || 0} søkere
          </span>
          <button 
            onClick={() => navigate(`/shifts/${shift.id}`)}
            className="px-4 py-2 text-primary border border-primary rounded-lg font-semibold text-sm hover:bg-primary hover:text-white transition-colors duration-200"
          >
            Se detaljer
          </button>
        </div>
      </div>
    ));
  };

  const renderPendingApplications = () => {
    // For workers, show their own applications with shift details
    if (userRole === 'worker') {
      return pendingApplications.map((app) => (
        <div key={app.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">{app.shifts?.profession_required}</h3>
              <p className="text-sm text-gray-600 mt-1">
                {app.shifts?.departments?.municipality_name} - {app.shifts?.departments?.department_name}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              app.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              app.status === 'approved' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {app.status === 'pending' ? 'Venter' : app.status === 'approved' ? 'Godkjent' : 'Avslått'}
            </span>
          </div>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center text-sm text-gray-700">
              <span className="mr-2">📅</span>
              <span>{formatDate(app.shifts?.start_time)}</span>
            </div>
            <div className="flex items-center text-sm text-gray-700">
              <span className="mr-2">⏰</span>
              <span>{formatTime(app.shifts?.start_time, app.shifts?.end_time)}</span>
            </div>
            <div className="flex items-center text-sm text-gray-700">
              <span className="mr-2">💰</span>
              <span className="font-semibold text-gray-800">{app.shifts?.hourly_wage} NOK/time</span>
            </div>
          </div>
          
          {app.message && (
            <p className="text-sm text-gray-600 italic mb-4 p-3 bg-gray-50 rounded-lg border-l-4 border-primary">
              "{app.message}"
            </p>
          )}
          
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <span className="text-sm text-gray-600">
              Søkt: {formatDate(app.created_at)}
            </span>
            <button
              onClick={() => navigate(`/shifts/${app.shifts?.id}`)}
              className="px-4 py-2 text-primary border border-primary rounded-lg font-semibold text-sm hover:bg-primary hover:text-white transition-colors duration-200"
            >
              Se vakt
            </button>
          </div>
        </div>
      ));
    }

    // For departments, show applications to their shifts
    return pendingApplications.map((app) => (
      <div key={app.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">{app.shifts?.profession_required}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Søker: {app.workers?.profiles?.full_name}
            </p>
          </div>
          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold">
            Venter
          </span>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-700">
            <span className="mr-2">📅</span>
            <span>{formatDate(app.shifts?.start_time)}</span>
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <span className="mr-2">⏰</span>
            <span>{formatTime(app.shifts?.start_time, app.shifts?.end_time)}</span>
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <span className="mr-2">⭐</span>
            <span>{app.workers?.average_rating?.toFixed(1) || 'N/A'} ({app.workers?.total_reviews || 0} vurderinger)</span>
          </div>
        </div>
        
        {app.message && (
          <p className="text-sm text-gray-600 italic mb-4 p-3 bg-gray-50 rounded-lg border-l-4 border-primary">
            "{app.message}"
          </p>
        )}
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 border-t border-gray-200 gap-3">
          <div className="text-sm text-gray-600">
            <div>Søkt: {formatDate(app.created_at)}</div>
            <div className="text-xs text-gray-500 mt-1">Ønsket lønn: {app.workers?.hourly_rate || 'N/A'} NOK/time</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleApprove(app.id)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition-colors duration-200"
            >
              Godkjenn
            </button>
            <button
              onClick={() => handleReject(app.id)}
              className="px-4 py-2 text-red-600 border border-red-600 rounded-lg font-semibold text-sm hover:bg-red-50 transition-colors duration-200"
            >
              Avslå
            </button>
          </div>
        </div>
      </div>
    ));
  };

  const renderUpcomingShifts = () => {
    return upcomingShifts.map((shift) => (
      <div key={shift.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">{shift.profession_required}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Tildelt: {shift.contracts?.workers?.profiles?.full_name || 'Ukjent'}
            </p>
          </div>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
            Tildelt
          </span>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-700">
            <span className="mr-2">📅</span>
            <span>{formatDate(shift.start_time)}</span>
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <span className="mr-2">⏰</span>
            <span>{formatTime(shift.start_time, shift.end_time)}</span>
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <span className="mr-2">💰</span>
            <span className="font-semibold text-gray-800">{shift.hourly_wage} NOK/time</span>
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <span className="text-sm text-gray-600 font-medium">
            @{shift.contracts?.workers?.profiles?.username || 'ukjent'}
          </span>
          <button
            onClick={() => navigate(`/shifts/${shift.id}`)}
            className="px-4 py-2 text-primary border border-primary rounded-lg font-semibold text-sm hover:bg-primary hover:text-white transition-colors duration-200"
          >
            Se detaljer
          </button>
        </div>
      </div>
    ));
  };

  const renderCompletedShifts = () => {
    return completedShifts.map((shift) => (
      <div key={shift.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold text-gray-800">{shift.profession_required}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Utført av: {shift.contracts?.workers?.profiles?.full_name || 'Ukjent'}
            </p>
          </div>
          <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
            Fullført
          </span>
        </div>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-700">
            <span className="mr-2">📅</span>
            <span>{formatDate(shift.start_time)}</span>
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <span className="mr-2">⏰</span>
            <span>{formatTime(shift.start_time, shift.end_time)}</span>
          </div>
          <div className="flex items-center text-sm text-gray-700">
            <span className="mr-2">💰</span>
            <span className="font-semibold text-gray-800">{shift.hourly_wage} NOK/time</span>
          </div>
        </div>
        
        {shift.reviews && shift.reviews.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-lg mb-2">
              {'⭐'.repeat(shift.reviews[0].rating)}
            </div>
            <p className="text-sm text-gray-600 italic">"{shift.reviews[0].comment}"</p>
          </div>
        )}
        
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <span className="text-sm text-gray-600 font-medium">
            @{shift.contracts?.workers?.profiles?.username || 'ukjent'}
          </span>
          <button
            onClick={() => navigate(`/shifts/${shift.id}`)}
            className="px-4 py-2 text-primary border border-primary rounded-lg font-semibold text-sm hover:bg-primary hover:text-white transition-colors duration-200"
          >
            Se detaljer
          </button>
        </div>
      </div>
    ));
  };

  const getCurrentTabData = () => {
    switch (activeTab) {
      case 'open':
        return openShifts;
      case 'applications':
        return pendingApplications;
      case 'upcoming':
        return upcomingShifts;
      case 'history':
        return completedShifts;
      default:
        return [];
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center py-16 bg-white rounded-xl">
          <div className="inline-block w-12 h-12 border-4 border-gray-200 border-t-primary rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Laster data...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-red-200">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-red-600 mb-6">Kunne ikke laste data: {error}</p>
          <button 
            onClick={loadData}
            className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors duration-200"
          >
            Prøv igjen
          </button>
        </div>
      );
    }

    const data = getCurrentTabData();

    if (data.length === 0) {
      return (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-gray-600 text-lg">
            {activeTab === 'open' && 'Ingen ledige vakter for øyeblikket'}
            {activeTab === 'applications' && 'Ingen ventende søknader'}
            {activeTab === 'upcoming' && 'Ingen kommende vakter'}
            {activeTab === 'history' && 'Ingen fullførte vakter'}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'open' && renderOpenShifts()}
        {activeTab === 'applications' && renderPendingApplications()}
        {activeTab === 'upcoming' && renderUpcomingShifts()}
        {activeTab === 'history' && renderCompletedShifts()}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Min Oversikt</h1>
          <p className="text-gray-600 mt-2">Administrer dine vakter og søknader</p>
        </div>
        <Link 
          to="/shifts/create" 
          className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-200 inline-block"
        >
          + Opprett ny vakt
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="text-4xl">📋</div>
          <div>
            <div className="text-3xl font-bold text-gray-800">{openShifts.length}</div>
            <div className="text-sm text-gray-600 mt-1">Ledige vakter</div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="text-4xl">⏳</div>
          <div>
            <div className="text-3xl font-bold text-gray-800">{pendingApplications.length}</div>
            <div className="text-sm text-gray-600 mt-1">Ventende søknader</div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="text-4xl">✅</div>
          <div>
            <div className="text-3xl font-bold text-gray-800">{upcomingShifts.length}</div>
            <div className="text-sm text-gray-600 mt-1">Kommende vakter</div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 flex items-center gap-4">
          <div className="text-4xl">📊</div>
          <div>
            <div className="text-3xl font-bold text-gray-800">{completedShifts.length}</div>
            <div className="text-sm text-gray-600 mt-1">Fullførte vakter</div>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="flex gap-2 mb-8 border-b-2 border-gray-200 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('open')}
          className={`px-6 py-3 font-medium text-sm whitespace-nowrap border-b-3 transition-colors duration-200 ${
            activeTab === 'open' 
              ? 'text-primary border-primary font-semibold' 
              : 'text-gray-600 border-transparent hover:text-gray-800'
          }`}
        >
          Ledige vakter
        </button>
        <button 
          onClick={() => setActiveTab('applications')}
          className={`px-6 py-3 font-medium text-sm whitespace-nowrap border-b-3 transition-colors duration-200 ${
            activeTab === 'applications' 
              ? 'text-primary border-primary font-semibold' 
              : 'text-gray-600 border-transparent hover:text-gray-800'
          }`}
        >
          Mine søknader ({pendingApplications.length})
        </button>
        <button 
          onClick={() => setActiveTab('upcoming')}
          className={`px-6 py-3 font-medium text-sm whitespace-nowrap border-b-3 transition-colors duration-200 ${
            activeTab === 'upcoming' 
              ? 'text-primary border-primary font-semibold' 
              : 'text-gray-600 border-transparent hover:text-gray-800'
          }`}
        >
          Kommende vakter
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-medium text-sm whitespace-nowrap border-b-3 transition-colors duration-200 ${
            activeTab === 'history' 
              ? 'text-primary border-primary font-semibold' 
              : 'text-gray-600 border-transparent hover:text-gray-800'
          }`}
        >
          Historikk
        </button>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}