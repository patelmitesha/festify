import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Event } from '../types';
import api from '../services/api';
import Layout from '../components/Layout';

const EventDetails: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    venue: '',
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await api.get(`/events/${eventId}`);
      const eventData = response.data.event;
      setEvent(eventData);

      // Initialize edit form data
      setEditFormData({
        name: eventData.name || '',
        description: eventData.description || '',
        venue: eventData.venue || '',
        start_date: formatDateForInput(eventData.start_date),
        end_date: formatDateForInput(eventData.end_date)
      });
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Event not found');
      } else {
        setError(err.response?.data?.error || 'Failed to fetch event details');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!event) return;

    const confirmed = window.confirm('Are you sure you want to delete this event? This action cannot be undone.');
    if (!confirmed) return;

    try {
      await api.delete(`/events/${event.event_id}`);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete event');
    }
  };

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Adjust for timezone offset to show local time
    const offsetMs = date.getTimezoneOffset() * 60 * 1000;
    const localDate = new Date(date.getTime() - offsetMs);
    return localDate.toISOString().slice(0, 16);
  };

  const handleEditEvent = () => {
    // Ensure form is pre-filled with current event data
    if (event) {
      const formData = {
        name: event.name || '',
        description: event.description || '',
        venue: event.venue || '',
        start_date: formatDateForInput(event.start_date),
        end_date: formatDateForInput(event.end_date)
      };

      console.log('Setting edit form data:', formData);
      setEditFormData(formData);
    }
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setError('');
    setUpdateSuccess(false);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    setIsUpdating(true);
    setError('');
    setUpdateSuccess(false);

    try {
      const response = await api.put(`/events/${event.event_id}`, editFormData);
      const updatedEvent = response.data.event;
      setEvent(updatedEvent);

      // Update the form data with the latest event data
      setEditFormData({
        name: updatedEvent.name || '',
        description: updatedEvent.description || '',
        venue: updatedEvent.venue || '',
        start_date: formatDateForInput(updatedEvent.start_date),
        end_date: formatDateForInput(updatedEvent.end_date)
      });

      setUpdateSuccess(true);

      // Show success toast and close modal after a short delay
      setShowSuccessToast(true);

      // Force refresh the event data to ensure UI shows latest data
      if (eventId) {
        fetchEvent();
      }

      setTimeout(() => {
        setIsEditModalOpen(false);
        setUpdateSuccess(false);
      }, 2000);

      // Hide toast after 5 seconds
      setTimeout(() => {
        setShowSuccessToast(false);
      }, 5000);

    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update event');
    } finally {
      setIsUpdating(false);
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

  if (error) {
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

  if (!event) {
    return (
      <Layout>
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">Event not found</div>
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
            <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
            {event.description && (
              <p className="text-gray-600 mt-2">{event.description}</p>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleEditEvent}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Edit Event
            </button>
            <Link
              to={`/events/${event.event_id}/participants`}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Manage Participants
            </Link>
            <button
              onClick={handleDeleteEvent}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Delete Event
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Venue</h3>
              <p className="text-gray-900">{event.venue || 'Not specified'}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Event ID</h3>
              <p className="text-gray-900">#{event.event_id}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Start Date & Time</h3>
              <p className="text-gray-900">
                {new Date(event.start_date).toLocaleString()}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">End Date & Time</h3>
              <p className="text-gray-900">
                {new Date(event.end_date).toLocaleString()}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Created</h3>
              <p className="text-gray-900">
                {new Date(event.created_at).toLocaleString()}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Last Updated</h3>
              <p className="text-gray-900">
                {new Date(event.updated_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to={`/events/${event.event_id}/participants`}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all"
            >
              <div className="text-lg font-medium text-gray-900 mb-2">👥 Participants</div>
              <div className="text-gray-600 text-sm">Add and manage event participants</div>
            </Link>

            <Link
              to={`/events/${event.event_id}/coupons`}
              className="p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:shadow-md transition-all"
            >
              <div className="text-lg font-medium text-gray-900 mb-2">🎫 Coupons</div>
              <div className="text-gray-600 text-sm">Generate and manage event coupons</div>
            </Link>

            <Link
              to={`/events/${event.event_id}/redeem`}
              className="p-4 border border-gray-200 rounded-lg hover:border-orange-500 hover:shadow-md transition-all"
            >
              <div className="text-lg font-medium text-gray-900 mb-2">🎯 Redeem Coupons</div>
              <div className="text-gray-600 text-sm">Scan QR codes or search participants to redeem coupons</div>
            </Link>

            <Link
              to={`/events/${event.event_id}/reports`}
              className="p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:shadow-md transition-all"
            >
              <div className="text-lg font-medium text-gray-900 mb-2">📊 Reports</div>
              <div className="text-gray-600 text-sm">View event analytics and reports</div>
            </Link>
          </div>
        </div>

        <div className="flex justify-between">
          <Link
            to="/"
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back to Dashboard
          </Link>

          <div className="text-sm text-gray-500">
            Event created on {new Date(event.created_at).toLocaleDateString()}
          </div>
        </div>

        {/* Edit Event Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
              <form onSubmit={handleUpdateEvent}>
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Edit Event Details</h3>
                </div>

                <div className="p-6 space-y-4">
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  {updateSuccess && (
                    <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
                      ✅ Event updated successfully! The page will refresh with the latest data.
                    </div>
                  )}

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Event Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={editFormData.name}
                      onChange={handleEditFormChange}
                      required
                      disabled={updateSuccess}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Enter event name"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={editFormData.description}
                      onChange={handleEditFormChange}
                      rows={3}
                      disabled={updateSuccess}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Enter event description"
                    />
                  </div>

                  <div>
                    <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-2">
                      Venue
                    </label>
                    <input
                      type="text"
                      id="venue"
                      name="venue"
                      value={editFormData.venue}
                      onChange={handleEditFormChange}
                      disabled={updateSuccess}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Enter venue"
                    />
                  </div>

                  <div>
                    <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      id="start_date"
                      name="start_date"
                      value={editFormData.start_date}
                      onChange={handleEditFormChange}
                      required
                      disabled={updateSuccess}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                      End Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      id="end_date"
                      name="end_date"
                      value={editFormData.end_date}
                      onChange={handleEditFormChange}
                      required
                      disabled={updateSuccess}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    disabled={isUpdating}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateSuccess ? 'Close' : 'Cancel'}
                  </button>
                  {!updateSuccess && (
                    <button
                      type="submit"
                      disabled={isUpdating}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUpdating ? 'Updating...' : 'Update Event'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {showSuccessToast && (
          <div className="fixed top-4 right-4 z-50 transform transition-all duration-300 ease-in-out">
            <div className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3">
              <span className="text-xl">✅</span>
              <div>
                <div className="font-semibold">Event Updated Successfully!</div>
                <div className="text-sm text-green-100">The event details have been saved and are now visible on this page.</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default EventDetails;