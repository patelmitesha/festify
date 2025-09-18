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

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      const response = await api.get(`/events/${eventId}`);
      setEvent(response.data.event);
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
      </div>
    </Layout>
  );
};

export default EventDetails;