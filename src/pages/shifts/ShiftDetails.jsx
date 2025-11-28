import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../api/supabase';

export default function ShiftDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [applying, setApplying] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [showMessageModal, setShowMessageModal] = useState(false);

  useEffect(() => {
    loadShiftDetails();
  }, [id]);

  const loadShiftDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!supabase) {
        // Mock data for development
        setShift(getMockShiftDetails(id));
        setLoading(false);
        return;
      }

      const { data, error} = await supabase
        .from('shifts')
        .select(`
          *,
          departments!inner(
            id,
            municipality_name,
            department_name,
            cost_center_code,
            address,
            contact_phone
          ),
          shift_applications(
            id,
            status,
            worker_id
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setShift(data);
    } catch (err) {
      console.error('Error loading shift details:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      if (!supabase) {
        // Mock application
        alert('Søknad sendt! (Mock mode)');
        setApplying(false);
        return;
      }

      // Get current user from session
      const userEmail = sessionStorage.getItem('user_email');
      if (!userEmail) {
        throw new Error('Du må være logget inn for å søke på vakter');
      }

      // Get the worker ID from the profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('email', userEmail)
        .single();

      if (profileError) {
        throw new Error('Kunne ikke finne brukerprofil');
      }

      if (profileData.role !== 'worker') {
        throw new Error('Kun arbeidstakere kan søke på vakter');
      }

      const workerId = profileData.id;

      const { data, error } = await supabase
        .from('shift_applications')
        .insert([{
          shift_id: id,
          worker_id: workerId,
          status: 'pending',
          message: applicationMessage || 'Jeg er interessert i denne vakten',
        }])
        .select()
        .single();

      if (error) throw error;

      alert('Søknad sendt!');
      loadShiftDetails(); // Reload to show updated application status
    } catch (err) {
      console.error('Error applying for shift:', err);
      alert('Kunne ikke sende søknad: ' + err.message);
    } finally {
      setApplying(false);
    }
  };

  const handleSendMessage = () => {
    setShowMessageModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('nb-NO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('nb-NO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (startString, endString) => {
    const start = new Date(startString);
    const end = new Date(endString);
    const hours = (end - start) / (1000 * 60 * 60);
    return hours;
  };

  const calculateTotalPay = (hourlyWage, hours) => {
    return (hourlyWage * hours).toLocaleString('nb-NO');
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16 bg-white rounded-xl shadow-md border border-gray-200" role="status" aria-live="polite">
          <div className="inline-block w-12 h-12 border-4 border-gray-300 border-t-primary rounded-full animate-spin mb-4" aria-hidden="true"></div>
          <p className="text-gray-700">Laster vaktdetaljer...</p>
          <span className="sr-only">Laster inn vaktinformasjon, vennligst vent</span>
        </div>
      </div>
    );
  }

  if (error || !shift) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16 bg-white rounded-xl border-2 border-red-200" role="alert" aria-live="assertive">
          <div className="text-6xl mb-4" aria-hidden="true">⚠️</div>
          <p className="text-red-600 mb-6" id="error-message">Kunne ikke laste vaktdetaljer</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-describedby="error-message"
          >
            Tilbake til oversikt
          </button>
        </div>
      </div>
    );
  }

  const hours = calculateDuration(shift.start_time, shift.end_time);
  const totalPay = calculateTotalPay(shift.hourly_wage, hours);
  const hasApplied = shift.shift_applications && shift.shift_applications.length > 0;

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <nav aria-label="Tilbake navigasjon">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
          aria-label="Gå tilbake til vaktsoversikt"
        >
          <span className="mr-2" aria-hidden="true">←</span>
          Tilbake til oversikt
        </button>
      </nav>

      {/* Main Card */}
      <article className="bg-white rounded-xl shadow-lg border border-gray-300 overflow-hidden" aria-labelledby="shift-title">
        {/* Header with gradient */}
        <header className="bg-gradient-to-r from-primary to-secondary p-8 text-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 id="shift-title" className="text-3xl font-bold mb-2">{shift.profession_required}</h1>
              <p className="text-blue-100 text-lg">
                {shift.departments?.municipality_name}
              </p>
            </div>
            <span
              className="px-4 py-2 bg-white rounded-full text-sm font-semibold text-gray-800 shadow-md"
              role="status"
              aria-label={`Vaktstatus: ${shift.status === 'open' ? 'Åpen' : shift.status === 'assigned' ? 'Tildelt' : 'Fullført'}`}
            >
              {shift.status === 'open' ? 'Åpen' : shift.status === 'assigned' ? 'Tildelt' : 'Fullført'}
            </span>
          </div>
          
          {/* Key Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6" role="list" aria-label="Nøkkelinformasjon om vakten">
            <div className="bg-white rounded-lg p-4 shadow-md" role="listitem">
              <div className="text-gray-600 text-sm mb-1 font-medium" id="hourly-wage-label">Timelønn</div>
              <div className="text-2xl font-bold text-gray-900" aria-labelledby="hourly-wage-label">{shift.hourly_wage} NOK</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-md" role="listitem">
              <div className="text-gray-600 text-sm mb-1 font-medium" id="duration-label">Varighet</div>
              <div className="text-2xl font-bold text-gray-900" aria-labelledby="duration-label">{hours} timer</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-md" role="listitem">
              <div className="text-gray-600 text-sm mb-1 font-medium" id="total-pay-label">Total lønn</div>
              <div className="text-2xl font-bold text-gray-900" aria-labelledby="total-pay-label">{totalPay} NOK</div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-8">
          {/* Date and Time Section */}
          <section className="mb-8" aria-labelledby="time-heading">
            <h2 id="time-heading" className="text-xl font-semibold text-gray-800 mb-4">
              <span aria-hidden="true">📅 </span>Tid og dato
            </h2>
            <dl className="bg-gray-100 rounded-lg p-6 space-y-3 border border-gray-200">
              <div className="flex items-start">
                <dt className="text-gray-700 w-24 font-medium">Dato:</dt>
                <dd className="text-gray-900 font-semibold">{formatDate(shift.start_time)}</dd>
              </div>
              <div className="flex items-start">
                <dt className="text-gray-700 w-24 font-medium">Starttid:</dt>
                <dd className="text-gray-900">{formatTime(shift.start_time)}</dd>
              </div>
              <div className="flex items-start">
                <dt className="text-gray-700 w-24 font-medium">Sluttid:</dt>
                <dd className="text-gray-900">{formatTime(shift.end_time)}</dd>
              </div>
            </dl>
          </section>

          {/* Department Details */}
          <section className="mb-8" aria-labelledby="department-heading">
            <h2 id="department-heading" className="text-xl font-semibold text-gray-800 mb-4">
              <span aria-hidden="true">🏛️ </span>Avdelingsinformasjon
            </h2>
            <dl className="bg-gray-100 rounded-lg p-6 space-y-3 border border-gray-200">
              <div className="flex items-start">
                <dt className="text-gray-700 w-32 font-medium">Avdeling:</dt>
                <dd className="text-gray-900">{shift.departments?.department_name}</dd>
              </div>
              <div className="flex items-start">
                <dt className="text-gray-700 w-32 font-medium">Kommune:</dt>
                <dd className="text-gray-900">{shift.departments?.municipality_name}</dd>
              </div>
              {shift.departments?.cost_center_code && (
                <div className="flex items-start">
                  <dt className="text-gray-700 w-32 font-medium">Kostnadssted:</dt>
                  <dd className="text-gray-900">{shift.departments?.cost_center_code}</dd>
                </div>
              )}
              {shift.departments?.address && (
                <div className="flex items-start">
                  <dt className="text-gray-700 w-32 font-medium">Adresse:</dt>
                  <dd className="text-gray-900">{shift.departments?.address}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* Description */}
          {shift.description && (
            <section className="mb-8" aria-labelledby="description-heading">
              <h2 id="description-heading" className="text-xl font-semibold text-gray-800 mb-4">
                <span aria-hidden="true">📝 </span>Beskrivelse
              </h2>
              <div className="bg-gray-100 rounded-lg p-6 border border-gray-200">
                <p className="text-gray-800 leading-relaxed">{shift.description}</p>
              </div>
            </section>
          )}

          {/* Contact Information */}
          {shift.departments?.contact_phone && (
            <section className="mb-8" aria-labelledby="contact-heading">
              <h2 id="contact-heading" className="text-xl font-semibold text-gray-800 mb-4">
                <span aria-hidden="true">📞 </span>Kontaktinformasjon
              </h2>
              <dl className="bg-gray-100 rounded-lg p-6 space-y-3 border border-gray-200">
                <div className="flex items-start">
                  <dt className="text-gray-700 w-32 font-medium">Telefon:</dt>
                  <dd>
                    <a
                      href={`tel:${shift.departments?.contact_phone}`}
                      className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                      aria-label={`Ring ${shift.departments?.contact_phone}`}
                    >
                      {shift.departments?.contact_phone}
                    </a>
                  </dd>
                </div>
              </dl>
            </section>
          )}

          {/* Action Buttons */}
          {shift.status === 'open' && (
            <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200" role="group" aria-label="Vakthandlinger">
              {hasApplied ? (
                <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-4 text-center" role="status" aria-live="polite">
                  <span className="text-green-800 font-semibold">
                    <span aria-hidden="true">✓ </span>Du har søkt på denne vakten
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleApply}
                  disabled={applying}
                  className="flex-1 bg-gradient-to-r from-primary to-secondary text-white py-4 rounded-lg font-semibold text-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  aria-label="Søk på denne vakten"
                  aria-busy={applying}
                >
                  <span aria-hidden="true">{applying ? '' : '✓ '}</span>
                  {applying ? 'Sender søknad...' : 'Søk på vakt'}
                </button>
              )}
              
              <button
                onClick={handleSendMessage}
                className="flex-1 bg-gray-100 text-primary border-2 border-primary py-4 rounded-lg font-semibold text-lg hover:bg-primary hover:text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="Send melding til arbeidsgiver"
              >
                <span aria-hidden="true">💬 </span>Send melding
              </button>
            </div>
          )}
        </div>
      </article>

      {/* Message Modal */}
      {showMessageModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 id="modal-title" className="text-xl font-semibold text-gray-800 mb-4">
              Send melding til arbeidsgiver
            </h3>
            <label htmlFor="message-textarea" className="sr-only">
              Skriv din melding
            </label>
            <textarea
              id="message-textarea"
              className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-primary focus:border-transparent focus:outline-none"
              rows="4"
              placeholder="Skriv din melding her..."
              value={applicationMessage}
              onChange={(e) => setApplicationMessage(e.target.value)}
              aria-required="false"
            ></textarea>
            <div className="flex gap-3" role="group" aria-label="Meldingshandlinger">
              <button
                onClick={() => {
                  alert('Melding sendt! (Funksjonalitet kommer snart)');
                  setShowMessageModal(false);
                }}
                className="flex-1 bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="Send melding"
              >
                Send
              </button>
              <button
                onClick={() => setShowMessageModal(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
                aria-label="Avbryt og lukk dialog"
              >
                Avbryt
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Mock data function for development
function getMockShiftDetails(id) {
  return {
    id: id,
    profession_required: 'Sykepleier',
    start_time: '2024-12-15T22:00:00Z',
    end_time: '2024-12-16T06:00:00Z',
    hourly_wage: 450,
    description: 'Nattevakt på sykehjem. Vi søker en erfaren sykepleier til nattevakt på vår avdeling. Arbeidsoppgaver inkluderer medisinutdeling, stell av pasienter, og generell omsorg.',
    status: 'open',
    departments: {
      municipality_name: 'Gran kommune',
      department_name: 'Sykehjemmet avd. 2',
      cost_center_code: 'SH-002',
      address: 'Sykehjemveien 10, 2770 Gran',
      contact_person: 'Kari Nordmann',
      contact_email: 'kari.nordmann@gran.kommune.no',
      contact_phone: '+47 123 45 678',
    },
    shift_applications: [],
  };
}