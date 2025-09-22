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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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
    setIsDeleting(true);

    try {
      await api.delete(`/events/${event.event_id}`);
      setShowDeleteModal(false);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete event');
      setIsDeleting(false);
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
            to="/dashboard"
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
            to="/dashboard"
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
              to={`/events/create?edit=${event.event_id}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors inline-block"
            >
              Edit Event
            </Link>
            <Link
              to={`/events/${event.event_id}/participants`}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Manage Participants
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
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

        {/* Food Options Section */}
        {event.MealChoices && event.MealChoices.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">🍽️ Food Options</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {event.MealChoices.map((meal: any, index: number) => (
                <div
                  key={index}
                  className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-center"
                >
                  <span className="text-green-800 font-medium">{meal.meal_type}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coupon Pricing Section */}
        {event.CouponRates && event.CouponRates.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">💰 Coupon Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {event.CouponRates.map((rate: any, index: number) => (
                <div
                  key={index}
                  className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex justify-between items-center"
                >
                  <div>
                    <h3 className="font-medium text-blue-900">{rate.rate_type}</h3>
                    <p className="text-sm text-blue-700">Per coupon</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-blue-800">₹{rate.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
            to="/dashboard"
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back to Dashboard
          </Link>

          <div className="text-sm text-gray-500">
            Event created on {new Date(event.created_at).toLocaleDateString()}
          </div>
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-2xl">⚠️</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Event</h3>
                  <p className="text-sm text-gray-600">This action cannot be undone</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 mb-3">
                  Are you sure you want to delete <strong>"{event?.name}"</strong>?
                </p>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800 font-medium mb-2">This will permanently delete:</p>
                  <ul className="text-red-700 text-sm space-y-1">
                    <li>• All participant details and records</li>
                    <li>• All generated coupons and QR codes</li>
                    <li>• All redemption history</li>
                    <li>• All participation requests</li>
                    <li>• All event representatives</li>
                    <li>• All meal choices and pricing information</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEvent}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete Event'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default EventDetails;