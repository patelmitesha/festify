import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Coupon, Event } from '../types';
import api from '../services/api';
import Layout from '../components/Layout';

const CouponManagement: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (eventId) {
      fetchEventAndCoupons();
    }
  }, [eventId]);

  const fetchEventAndCoupons = async () => {
    try {
      setIsLoading(true);
      // Fetch event details with meal choices and coupon rates
      const eventResponse = await api.get(`/events/${eventId}`);
      setEvent(eventResponse.data.event);

      // Fetch coupons
      try {
        const couponsResponse = await api.get(`/coupons/events/${eventId}`);
        setCoupons(couponsResponse.data.coupons);
      } catch (couponsErr: any) {
        // If coupons endpoint doesn't exist, set empty array
        if (couponsErr.response?.status === 404) {
          setCoupons([]);
        } else {
          throw couponsErr;
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch event data');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCouponPDF = async (couponId: number, participantId: number) => {
    try {
      const response = await api.get(`/coupons/pdf/${couponId}`, {
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `festify-coupon-${couponId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError('Failed to download coupon PDF');
    }
  };

  // Note: Bulk PDF download not implemented in backend yet

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
            <h1 className="text-3xl font-bold text-gray-900">Event Coupons</h1>
            <p className="text-gray-600 mt-1">
              {event?.name} - View and manage generated coupons
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              to={`/events/${eventId}/participants`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Add Participants
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Event Configuration Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Configuration</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Meal Choices */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">🍽️ Available Meal Options</h3>
              {event?.MealChoices && event.MealChoices.length > 0 ? (
                <div className="space-y-2">
                  {event.MealChoices.map((meal) => (
                    <div key={meal.meal_id} className="flex items-center p-2 bg-gray-50 rounded">
                      <span className="text-gray-900">{meal.meal_type}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 italic">No meal options configured</div>
              )}
            </div>

            {/* Coupon Rates */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">💰 Pricing Structure</h3>
              {event?.CouponRates && event.CouponRates.length > 0 ? (
                <div className="space-y-2">
                  {event.CouponRates.map((rate) => (
                    <div key={rate.rate_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-gray-900">{rate.rate_type}</span>
                      <span className="font-medium text-green-600">₹{rate.price}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 italic">No pricing rates configured</div>
              )}
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>Note:</strong> Meal options and pricing are configured during event creation.
              To modify these, you can edit the event details or create a new event.
            </p>
          </div>
        </div>

        {/* Coupon Statistics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Coupon Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">{coupons.length}</div>
              <div className="text-sm text-blue-700 font-medium">Total Coupons</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {coupons.filter(c => c.status === 'Booked').length}
              </div>
              <div className="text-sm text-green-700 font-medium">Available</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-3xl font-bold text-yellow-600">
                {coupons.filter(c => c.status === 'Partial').length}
              </div>
              <div className="text-sm text-yellow-700 font-medium">Partially Used</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-3xl font-bold text-red-600">
                {coupons.filter(c => c.status === 'Consumed').length}
              </div>
              <div className="text-sm text-red-700 font-medium">Fully Used</div>
            </div>
          </div>
        </div>

        {/* Coupons List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Generated Coupons ({coupons.length})
            </h2>

            {coupons.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg mb-4">No coupons generated yet</div>
                <p className="text-gray-600 mb-6">
                  Coupons are automatically generated when participants are added to the event with their meal and rate selections.
                </p>
                <Link
                  to={`/events/${eventId}/participants`}
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Add Participants to Generate Coupons
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {coupons.map((coupon) => (
                  <div
                    key={coupon.coupon_id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            Coupon #{coupon.coupon_id}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-medium ${
                              coupon.status === 'Booked'
                                ? 'bg-green-100 text-green-800'
                                : coupon.status === 'Partial'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {coupon.status}
                          </span>
                        </div>

                        {/* Coupon Details */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="text-sm font-medium text-blue-700">Participant</div>
                            <div className="text-blue-900">{coupon.Participant?.name || 'Unknown'}</div>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg">
                            <div className="text-sm font-medium text-green-700">Meal Option</div>
                            <div className="text-green-900">{coupon.MealChoice?.meal_type || 'Not specified'}</div>
                          </div>
                          <div className="p-3 bg-purple-50 rounded-lg">
                            <div className="text-sm font-medium text-purple-700">Rate & Price</div>
                            <div className="text-purple-900">
                              {coupon.CouponRate?.rate_type || 'Unknown'} - ₹{coupon.CouponRate?.price || 0}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">QR Code:</span>
                            <div className="truncate text-xs mt-1 font-mono bg-gray-100 px-2 py-1 rounded">
                              {coupon.qr_code_value}
                            </div>
                          </div>
                          <div>
                            <span className="font-medium">Usage:</span>
                            <div className="text-xs mt-1">
                              <span className={`font-medium ${
                                coupon.consumed_count === 0 ? 'text-green-600' :
                                coupon.consumed_count === coupon.total_count ? 'text-red-600' :
                                'text-yellow-600'
                              }`}>
                                {coupon.consumed_count} / {coupon.total_count} used
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-gray-500 mt-2">
                          Created: {new Date(coupon.created_at).toLocaleDateString()} at {new Date(coupon.created_at).toLocaleTimeString()}
                        </p>
                      </div>

                      <div className="flex flex-col space-y-2 ml-4">
                        <button
                          onClick={() => downloadCouponPDF(coupon.coupon_id, coupon.participant_id)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                        >
                          Download PDF
                        </button>

                        <button
                          onClick={() => navigator.clipboard.writeText(coupon.qr_code_value)}
                          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                        >
                          Copy QR Code
                        </button>

                        {coupon.qr_code_link && (
                          <button
                            onClick={() => window.open(coupon.qr_code_link, '_blank')}
                            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                          >
                            View QR Link
                          </button>
                        )}
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

export default CouponManagement;