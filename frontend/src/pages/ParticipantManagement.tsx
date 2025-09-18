import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Participant, Event } from '../types';
import api from '../services/api';
import Layout from '../components/Layout';

const ParticipantManagement: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact_number: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEventAndParticipants();
    }
  }, [eventId]);

  const fetchEventAndParticipants = async () => {
    try {
      setIsLoading(true);
      // Fetch event details first
      const eventResponse = await api.get(`/events/${eventId}`);
      setEvent(eventResponse.data);

      // Fetch participants (this endpoint may not exist yet)
      try {
        const participantsResponse = await api.get(`/events/${eventId}/participants`);
        setParticipants(participantsResponse.data);
      } catch (participantsErr: any) {
        // If participants endpoint doesn't exist, set empty array
        if (participantsErr.response?.status === 404) {
          setParticipants([]);
        } else {
          throw participantsErr;
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch event or participants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;

    setIsSubmitting(true);
    try {
      const response = await api.post(`/events/${eventId}/participants`, formData);
      setParticipants(prev => [...prev, response.data]);
      setFormData({ name: '', address: '', contact_number: '' });
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add participant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteParticipant = async (participantId: number) => {
    if (!window.confirm('Are you sure you want to remove this participant?')) {
      return;
    }

    try {
      await api.delete(`/events/${eventId}/participants/${participantId}`);
      setParticipants(prev => prev.filter(p => p.participant_id !== participantId));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete participant');
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (error && !event) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="text-red-600 text-lg mb-4">{error}</div>
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-500"
          >
            Back to Dashboard
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Participants</h1>
            <p className="text-gray-600 mt-1">
              {event?.name} - Manage event participants
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Participant
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Add Participant Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Participant</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter participant's full name"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter address (optional)"
                />
              </div>

              <div>
                <label htmlFor="contact_number" className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Number
                </label>
                <input
                  type="tel"
                  id="contact_number"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter contact number (optional)"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({ name: '', address: '', contact_number: '' });
                    setError('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add Participant'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Participants List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Participants ({participants.length})
            </h2>

            {participants.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 text-lg mb-4">No participants yet</div>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="text-blue-600 hover:text-blue-500"
                >
                  Add your first participant
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {participants.map((participant) => (
                  <div
                    key={participant.participant_id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {participant.name}
                        </h3>
                        {participant.address && (
                          <p className="text-gray-600 mt-1">📍 {participant.address}</p>
                        )}
                        {participant.contact_number && (
                          <p className="text-gray-600 mt-1">📞 {participant.contact_number}</p>
                        )}
                        <p className="text-sm text-gray-500 mt-2">
                          Participant ID: #{participant.participant_id}
                        </p>
                      </div>

                      <div className="flex space-x-2 ml-4">
                        <button
                          onClick={() => handleDeleteParticipant(participant.participant_id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between">
          <Link
            to={`/events/${eventId}`}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back to Event Details
          </Link>

          <Link
            to="/"
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default ParticipantManagement;