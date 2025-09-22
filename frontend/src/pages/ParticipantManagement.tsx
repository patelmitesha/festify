import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Participant, Event } from '../types';
import api from '../services/api';
import Layout from '../components/Layout';

interface ParticipationRequest {
  request_id: number;
  event_id: number;
  name: string;
  address?: string;
  contact_number?: string;
  email?: string;
  message?: string;
  coupon_bookings?: string; // JSON string containing coupon booking details
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const ParticipantManagement: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [participationRequests, setParticipationRequests] = useState<ParticipationRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact_number: '',
    email: ''
  });
  const [couponBookings, setCouponBookings] = useState<{rate_id: number, meal_id: number, quantity: number}[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCouponForm, setShowCouponForm] = useState<{[key: number]: boolean}>({});
  const [couponFormData, setCouponFormData] = useState<{[key: number]: {rate_id: number, meal_id: number, quantity: number}}>({});
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionRequestId, setRejectionRequestId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    if (eventId) {
      fetchEventAndParticipants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Filter participants based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredParticipants(participants);
    } else {
      const filtered = participants.filter(participant =>
        participant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        participant.contact_number?.includes(searchTerm) ||
        participant.address?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredParticipants(filtered);
    }
  }, [participants, searchTerm]);

  const fetchEventAndParticipants = async () => {
    try {
      setIsLoading(true);
      // Fetch event details first
      const eventResponse = await api.get(`/events/${eventId}`);
      setEvent(eventResponse.data.event);

      // Fetch participants
      try {
        const participantsResponse = await api.get(`/events/${eventId}/participants`);
        setParticipants(participantsResponse.data);
        setFilteredParticipants(participantsResponse.data);
      } catch (participantsErr: any) {
        // If participants endpoint doesn't exist, set empty array
        if (participantsErr.response?.status === 404) {
          setParticipants([]);
          setFilteredParticipants([]);
        } else {
          throw participantsErr;
        }
      }

      // Fetch pending participation requests
      try {
        const requestsResponse = await api.get(`/events/${eventId}/participation-requests?status=pending`);
        setParticipationRequests(requestsResponse.data);
      } catch (requestsErr: any) {
        // If endpoint doesn't exist or no requests, set empty array
        console.log('No participation requests or endpoint not available');
        setParticipationRequests([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch event or participants');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    // Validate contact number to only allow digits and limit to 10 digits
    if (name === 'contact_number') {
      const digitsOnly = value.replace(/\D/g, ''); // Remove all non-digits
      if (digitsOnly.length <= 10) {
        setFormData(prev => ({
          ...prev,
          [name]: digitsOnly
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
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

    if (!formData.contact_number || formData.contact_number.length !== 10) {
      setError('Please enter a valid 10-digit contact number');
      return;
    }

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

      setFormData({ name: '', address: '', contact_number: '', email: '' });
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

  const downloadParticipantMobilePDF = async (participantId: number, participantName: string) => {
    try {
      const response = await api.get(`/events/${eventId}/participants/${participantId}/mobile-pdf`, {
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `participant-${participantName.replace(/\s+/g, '-')}-mobile-qr.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Failed to download participant mobile PDF');
    }
  };

  const toggleCouponForm = (participantId: number) => {
    setShowCouponForm(prev => ({
      ...prev,
      [participantId]: !prev[participantId]
    }));

    // Initialize form data if opening for the first time
    if (!showCouponForm[participantId] && !couponFormData[participantId]) {
      setCouponFormData(prev => ({
        ...prev,
        [participantId]: {
          rate_id: event?.CouponRates?.[0]?.rate_id || 0,
          meal_id: event?.MealChoices?.[0]?.meal_id || 0,
          quantity: 1
        }
      }));
    }
  };

  const updateCouponFormData = (participantId: number, field: 'rate_id' | 'meal_id' | 'quantity', value: number) => {
    setCouponFormData(prev => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        [field]: value
      }
    }));
  };

  const handleAddCoupon = async (participantId: number) => {
    if (!eventId || !couponFormData[participantId]) return;

    try {
      const response = await api.post(`/events/${eventId}/participants/${participantId}/coupons`, couponFormData[participantId]);

      // Update the participant in the list
      setParticipants(prev => prev.map(p =>
        p.participant_id === participantId ? response.data.participant : p
      ));

      // Close the form and reset data
      setShowCouponForm(prev => ({ ...prev, [participantId]: false }));
      setCouponFormData(prev => ({ ...prev, [participantId]: {
        rate_id: event?.CouponRates?.[0]?.rate_id || 0,
        meal_id: event?.MealChoices?.[0]?.meal_id || 0,
        quantity: 1
      }}));

      setError(''); // Clear any previous errors
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add coupon');
    }
  };

  const handleApproveRequest = async (requestId: number) => {
    try {
      const response = await api.post(`/events/${eventId}/participation-requests/${requestId}/approve`);

      // Remove from requests list
      setParticipationRequests(prev => prev.filter(req => req.request_id !== requestId));

      // Add to participants list if participant was created
      if (response.data.participant) {
        setParticipants(prev => [...prev, response.data.participant]);
      }

      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to approve participation request');
    }
  };

  const handleRejectRequest = async (requestId: number, reason?: string) => {
    try {
      await api.post(`/events/${eventId}/participation-requests/${requestId}/reject`, { reason });

      // Remove from requests list
      setParticipationRequests(prev => prev.filter(req => req.request_id !== requestId));

      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reject participation request');
    }
  };

  const openRejectModal = (requestId: number) => {
    setRejectionRequestId(requestId);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const closeRejectModal = () => {
    setShowRejectModal(false);
    setRejectionRequestId(null);
    setRejectionReason('');
  };

  const confirmReject = async () => {
    if (rejectionRequestId) {
      await handleRejectRequest(rejectionRequestId, rejectionReason || undefined);
      closeRejectModal();
    }
  };

  // Helper function to parse and display coupon bookings
  const parseCouponBookings = (couponBookingsString?: string) => {
    if (!couponBookingsString || !event) return [];

    try {
      const bookings = JSON.parse(couponBookingsString);
      return bookings.map((booking: any) => {
        const rate = event.CouponRates?.find(r => r.rate_id === booking.rate_id);
        const meal = event.MealChoices?.find(m => m.meal_id === booking.meal_id);
        return {
          ...booking,
          rate_type: rate?.rate_type || 'Unknown',
          price: rate?.price || '0',
          meal_type: meal?.meal_type || 'Unknown'
        };
      });
    } catch (error) {
      console.error('Error parsing coupon bookings:', error);
      return [];
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
            <h1 className="text-3xl font-bold text-gray-900">Participants</h1>
            <p className="text-gray-600 mt-1">
              {event?.name} - Manage event participants
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              to={`/events/${eventId}/coupons`}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              View Coupons
            </Link>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Participant
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            <pre className="whitespace-pre-wrap text-sm">{error}</pre>
          </div>
        )}

        {/* Participation Requests */}
        {participationRequests.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-yellow-800 mb-4">
              Pending Participation Requests ({participationRequests.length})
            </h2>
            <div className="space-y-4">
              {participationRequests.map((request) => (
                <div
                  key={request.request_id}
                  className="bg-white border border-yellow-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {request.name}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                        {request.email && (
                          <div>
                            <span className="font-medium">Email:</span> {request.email}
                          </div>
                        )}
                        {request.contact_number && (
                          <div>
                            <span className="font-medium">Phone:</span> {request.contact_number}
                          </div>
                        )}
                        {request.address && (
                          <div className="md:col-span-2">
                            <span className="font-medium">Address:</span> {request.address}
                          </div>
                        )}
                        {request.message && (
                          <div className="md:col-span-2">
                            <span className="font-medium">Message:</span> {request.message}
                          </div>
                        )}
                        <div className="md:col-span-2">
                          <span className="font-medium">Requested:</span>{' '}
                          {new Date(request.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>

                        {/* Coupon Bookings Section */}
                        {request.coupon_bookings && (() => {
                          const bookings = parseCouponBookings(request.coupon_bookings);
                          if (bookings.length === 0) return null;

                          const totalAmount = bookings.reduce((sum: number, booking: any) => sum + (parseFloat(booking.price) * booking.quantity), 0);

                          return (
                            <div className="md:col-span-2">
                              <span className="font-medium">Requested Coupons:</span>
                              <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="space-y-2">
                                  {bookings.map((booking: any, index: number) => (
                                    <div key={index} className="flex justify-between items-center text-sm">
                                      <div className="flex-1">
                                        <span className="font-medium">{booking.quantity}x</span>{' '}
                                        <span className="text-gray-700">{booking.meal_type}</span>{' '}
                                        <span className="text-gray-600">({booking.rate_type})</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="font-medium">₹{booking.price}</span>
                                        <span className="text-gray-500"> each</span>
                                        <div className="text-xs text-gray-600">
                                          Total: ₹{(parseFloat(booking.price) * booking.quantity).toLocaleString()}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div className="mt-3 pt-2 border-t border-blue-300 flex justify-between items-center">
                                  <span className="font-semibold text-blue-900">Total Amount:</span>
                                  <span className="font-bold text-blue-900 text-lg">₹{totalAmount.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => handleApproveRequest(request.request_id)}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => openRejectModal(request.request_id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address (optional)"
                />
              </div>

              <div>
                <label htmlFor="contact_number" className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Number *
                </label>
                <input
                  type="tel"
                  id="contact_number"
                  name="contact_number"
                  value={formData.contact_number}
                  onChange={handleInputChange}
                  pattern="[0-9]{10}"
                  maxLength={10}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter 10-digit contact number"
                />
                {formData.contact_number && formData.contact_number.length !== 10 && (
                  <p className="text-sm text-red-600 mt-1">Contact number must be exactly 10 digits</p>
                )}
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
                    setFormData({ name: '', address: '', contact_number: '', email: '' });
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Participants ({filteredParticipants.length}{participants.length !== filteredParticipants.length ? ` of ${participants.length}` : ''})
              </h2>
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search by name, phone, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {participants.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 text-lg mb-4">No participants yet</div>
                <p className="text-gray-600 mb-4">
                  Add participants to automatically generate event coupons
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="block mx-auto px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                  >
                    Add Your First Participant
                  </button>
                  <Link
                    to={`/events/${eventId}/coupons`}
                    className="block text-green-600 hover:text-green-500 text-sm"
                  >
                    View generated coupons →
                  </Link>
                </div>
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 text-lg mb-4">No participants found</div>
                <p className="text-gray-600 mb-4">
                  Try adjusting your search criteria
                </p>
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredParticipants.map((participant) => (
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

                        {/* Display Coupon Summary */}
                        {participant.Coupons && participant.Coupons.length > 0 && (
                          <div className="mt-3">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                              Coupon Summary
                            </h4>
                            {(() => {
                              const bookedCount = participant.Coupons.filter(c => c.status === 'Booked').length;
                              const partialCount = participant.Coupons.filter(c => c.status === 'Partial').length;
                              const consumedCount = participant.Coupons.filter(c => c.status === 'Consumed').length;
                              const totalCount = participant.Coupons.length;
                              const totalValue = participant.Coupons.reduce((sum, c) => sum + (Number(c.CouponRate?.price) || 0), 0);

                              return (
                                <div className="bg-gray-50 rounded p-3 text-xs space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium">Total Coupons:</span>
                                    <span className="font-semibold">{totalCount}</span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="bg-green-100 text-green-700 rounded p-2">
                                      <div className="font-semibold">{bookedCount}</div>
                                      <div>Available</div>
                                    </div>
                                    <div className="bg-yellow-100 text-yellow-700 rounded p-2">
                                      <div className="font-semibold">{partialCount}</div>
                                      <div>Partial</div>
                                    </div>
                                    <div className="bg-gray-100 text-gray-700 rounded p-2">
                                      <div className="font-semibold">{consumedCount}</div>
                                      <div>Used</div>
                                    </div>
                                  </div>
                                  <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                                    <span className="font-medium">Total Value:</span>
                                    <span className="font-semibold text-green-600">₹{totalValue}</span>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col space-y-2 ml-4">
                        <button
                          onClick={() => toggleCouponForm(participant.participant_id)}
                          className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
                        >
                          {showCouponForm[participant.participant_id] ? 'Cancel' : 'Add Coupon'}
                        </button>
                        <Link
                          to={`/events/${eventId}/coupons?participant=${participant.participant_id}`}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-center"
                        >
                          View Coupons
                        </Link>
                        <button
                          onClick={() => downloadParticipantMobilePDF(participant.participant_id, participant.name)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          Download PDF
                        </button>
                        <button
                          onClick={() => handleDeleteParticipant(participant.participant_id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Individual Coupon Form */}
                    {showCouponForm[participant.participant_id] && (
                      <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <h4 className="text-sm font-medium text-purple-900 mb-3">Add Coupon for {participant.name}</h4>

                        {(!event?.CouponRates?.length || !event?.MealChoices?.length) ? (
                          <p className="text-sm text-gray-500">
                            Please ensure the event has both meal choices and coupon rates configured.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Meal Option</label>
                              <select
                                value={couponFormData[participant.participant_id]?.meal_id || ''}
                                onChange={(e) => updateCouponFormData(participant.participant_id, 'meal_id', parseInt(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                              >
                                {event.MealChoices.map((meal) => (
                                  <option key={meal.meal_id} value={meal.meal_id}>
                                    {meal.meal_type}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Rate Type</label>
                              <select
                                value={couponFormData[participant.participant_id]?.rate_id || ''}
                                onChange={(e) => updateCouponFormData(participant.participant_id, 'rate_id', parseInt(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                              >
                                {event.CouponRates.map((rate) => (
                                  <option key={rate.rate_id} value={rate.rate_id}>
                                    {rate.rate_type} - ₹{rate.price}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs text-gray-600 mb-1">Quantity</label>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={couponFormData[participant.participant_id]?.quantity || 1}
                                onChange={(e) => updateCouponFormData(participant.participant_id, 'quantity', parseInt(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                              />
                            </div>

                            <div className="flex items-end">
                              <button
                                onClick={() => handleAddCoupon(participant.participant_id)}
                                className="w-full px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 transition-colors"
                              >
                                Add Coupon
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
            to="/dashboard"
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-2xl">❌</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Reject Participation Request</h3>
                  <p className="text-sm text-gray-600">Please provide a reason for rejection</p>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Rejection
                </label>
                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  placeholder="Enter the reason for rejecting this participation request (optional)..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  This reason will be visible to event organizers and may be communicated to the participant.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeRejectModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmReject}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Reject Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ParticipantManagement;