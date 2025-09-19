import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Event } from '../types';
import api from '../services/api';
import Layout from '../components/Layout';

const Dashboard: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await api.get('/events');
      // Expect response.data to be a direct array of events
      if (Array.isArray(response.data)) {
        setEvents(response.data);
      } else {
        // Handle case where API returns an error object
        const errorMessage = response.data?.error;
        if (errorMessage === 'Access token required') {
          setError('Please log in to view your events');
        } else {
          setError(errorMessage || 'Invalid response format');
        }
        setEvents([]);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error;
      if (errorMessage === 'Access token required' || err.response?.status === 401) {
        setError('Please log in to view your events');
      } else {
        setError(errorMessage || 'Failed to fetch events');
      }
      setEvents([]);
    } finally {
      setIsLoading(false);
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">My Events</h1>
          <Link
            to="/events/create"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create New Event
          </Link>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
            {error.includes('log in') && (
              <div className="mt-2">
                <Link to="/login" className="text-blue-600 hover:text-blue-500 underline">
                  Go to Login
                </Link>
              </div>
            )}
          </div>
        )}

        {events.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-4">No events found</div>
            <Link
              to="/events/create"
              className="text-blue-600 hover:text-blue-500"
            >
              Create your first event
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div key={event.event_id} className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {event.name}
                </h3>
                {event.description && (
                  <p className="text-gray-600 mb-3">{event.description}</p>
                )}
                <div className="space-y-2 text-sm text-gray-500 mb-4">
                  {event.venue && <div>📍 {event.venue}</div>}
                  <div>🗓 {new Date(event.start_date).toLocaleDateString()}</div>
                  <div>⏰ {new Date(event.end_date).toLocaleDateString()}</div>
                </div>

                {/* Event Statistics */}
                {event.stats && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">👥 Participants:</span>
                      <span className="font-medium text-gray-900">{event.stats.totalParticipants}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">🎫 Total Coupons:</span>
                      <span className="font-medium text-gray-900">{event.stats.totalCoupons}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">✅ Redeemed:</span>
                      <span className="font-medium text-green-600">
                        {event.stats.redeemedCoupons} / {event.stats.totalCoupons}
                        {event.stats.totalCoupons > 0 && (
                          <span className="text-xs ml-1">
                            ({Math.round((event.stats.redeemedCoupons / event.stats.totalCoupons) * 100)}%)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">💰 Total Amount:</span>
                      <span className="font-medium text-gray-900">₹{event.stats.totalAmount}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">💸 Redeemed Amount:</span>
                      <span className="font-medium text-green-600">₹{event.stats.redeemedAmount}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-center">
                  <Link
                    to={`/events/${event.event_id}`}
                    className="w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;