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
  const [couponBookings, setCouponBookings] = useState<{rate_id: number, meal_id: number, quantity: number}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEventAndParticipants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const fetchEventAndParticipants = async () => {
    try {
      setIsLoading(true);
      // Fetch event details first
      const eventResponse = await api.get(`/events/${eventId}`);
      setEvent(eventResponse.data.event);

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

  const addCouponBooking = () => {
    if (event?.CouponRates?.length && event?.MealChoices?.length) {
      setCouponBookings(prev => [...prev, {
        rate_id: event.CouponRates![0].rate_id,
        meal_id: event.MealChoices![0].meal_id,
        quantity: 1
      }]);
    }
  };

  const removeCouponBooking = (index: number) => {
    setCouponBookings(prev => prev.filter((_, i) => i !== index));
  };

  const updateCouponBooking = (index: number, field: 'rate_id' | 'meal_id' | 'quantity', value: number) => {
    setCouponBookings(prev => {
      const updated = [...prev];
      updated[index][field] = value;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;

    if (couponBookings.length === 0) {
      setError('Please add at least one coupon booking');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post(`/events/${eventId}/participants`, {
        ...formData,
        coupon_bookings: couponBookings
      });

      // Handle successful response - API returns participant object directly
      if (response.data.participant) {
        setParticipants(prev => [...prev, response.data.participant]);
      } else {
        setParticipants(prev => [...prev, response.data]);
      }

      setFormData({ name: '', address: '', contact_number: '' });
      setCouponBookings([]);
      setShowAddForm(false);
      setError(''); // Clear any previous errors
    } catch (err: any) {
      const errorData = err.response?.data;
      setError(errorData?.error || 'Failed to add participant');
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
            <pre className="whitespace-pre-wrap text-sm">{error}</pre>
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

              {/* Coupon Bookings Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Coupon Bookings *
                </label>
                <div className="space-y-3">
                  {couponBookings.map((booking, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Food Option</label>
                        <select
                          value={booking.meal_id}
                          onChange={(e) => updateCouponBooking(index, 'meal_id', parseInt(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {event?.MealChoices?.map((meal) => (
                            <option key={meal.meal_id} value={meal.meal_id}>
                              {meal.meal_type}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">Rate Type</label>
                        <select
                          value={booking.rate_id}
                          onChange={(e) => updateCouponBooking(index, 'rate_id', parseInt(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {event?.CouponRates?.map((rate) => (
                            <option key={rate.rate_id} value={rate.rate_id}>
                              {rate.rate_type} - ₹{rate.price}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-20">
                        <label className="block text-xs text-gray-500 mb-1">Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={booking.quantity}
                          onChange={(e) => updateCouponBooking(index, 'quantity', parseInt(e.target.value))}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCouponBooking(index)}
                        className="px-2 py-1 text-red-600 hover:text-red-800 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addCouponBooking}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                    disabled={!event?.CouponRates?.length || !event?.MealChoices?.length}
                  >
                    + Add Coupon Booking
                  </button>
                  {(!event?.CouponRates?.length || !event?.MealChoices?.length) && (
                    <p className="text-sm text-gray-500">
                      Please ensure the event has both meal choices and coupon rates configured.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({ name: '', address: '', contact_number: '' });
                    setCouponBookings([]);
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

                        {/* Display Coupons */}
                        {participant.Coupons && participant.Coupons.length > 0 && (
                          <div className="mt-3">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              Coupons ({participant.Coupons.length})
                            </h4>
                            <div className="space-y-1">
                              {participant.Coupons.map((coupon) => (
                                <div key={coupon.coupon_id} className="text-xs bg-gray-50 rounded p-2">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">
                                      {coupon.MealChoice?.meal_type} - {coupon.CouponRate?.rate_type}
                                    </span>
                                    <span className={`px-1 py-0.5 rounded text-xs ${
                                      coupon.status === 'Booked' ? 'bg-green-100 text-green-700' :
                                      coupon.status === 'Consumed' ? 'bg-gray-100 text-gray-700' :
                                      'bg-yellow-100 text-yellow-700'
                                    }`}>
                                      {coupon.status}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-gray-500 mt-1">
                                    <span>₹{coupon.CouponRate?.price}</span>
                                    <span>{coupon.consumed_count}/{coupon.total_count} used</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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