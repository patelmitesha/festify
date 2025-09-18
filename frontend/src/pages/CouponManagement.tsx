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
      // Fetch event details first
      const eventResponse = await api.get(`/events/${eventId}`);
      setEvent(eventResponse.data);

      // Fetch coupons
      try {
        const couponsResponse = await api.get(`/events/${eventId}/coupons`);
        setCoupons(couponsResponse.data);
      } catch (couponsErr: any) {
        // If coupons endpoint doesn't exist, set empty array
        if (couponsErr.response?.status === 404) {
          setCoupons([]);
        } else {
          throw couponsErr;
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch event or coupons');
    } finally {
      setIsLoading(false);
    }
  };

  const generateCoupons = async () => {
    if (!eventId) return;

    try {
      const response = await api.post(`/events/${eventId}/coupons/generate`);
      setCoupons(response.data.coupons);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate coupons');
    }
  };

  const downloadCouponPDF = async (couponId: number) => {
    try {
      const response = await api.get(`/coupons/${couponId}/pdf`, {
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `coupon-${couponId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError('Failed to download coupon PDF');
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
            <h1 className="text-3xl font-bold text-gray-900">Coupons</h1>
            <p className="text-gray-600 mt-1">
              {event?.name} - Manage event coupons and QR codes
            </p>
          </div>
          <button
            onClick={generateCoupons}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Generate Coupons
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Event Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{coupons.length}</div>
              <div className="text-sm text-gray-500">Total Coupons</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {coupons.filter(c => c.status === 'Booked').length}
              </div>
              <div className="text-sm text-gray-500">Booked</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {coupons.filter(c => c.status === 'Partial').length}
              </div>
              <div className="text-sm text-gray-500">Partial</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {coupons.filter(c => c.status === 'Consumed').length}
              </div>
              <div className="text-sm text-gray-500">Consumed</div>
            </div>
          </div>
        </div>

        {/* Coupons List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Coupons ({coupons.length})
            </h2>

            {coupons.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 text-lg mb-4">No coupons generated yet</div>
                <p className="text-gray-600 mb-4">
                  Generate coupons for participants who have been added to this event
                </p>
                <button
                  onClick={generateCoupons}
                  className="text-blue-600 hover:text-blue-500 font-medium"
                >
                  Generate Coupons Now
                </button>
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
                            className={`px-2 py-1 text-xs rounded-full ${
                              coupon.status === 'Booked'
                                ? 'bg-green-100 text-green-800'
                                : coupon.status === 'Partial'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {coupon.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">QR Code:</span> {coupon.qr_code_value}
                          </div>
                          <div>
                            <span className="font-medium">Total Count:</span> {coupon.total_count}
                          </div>
                          <div>
                            <span className="font-medium">Consumed:</span> {coupon.consumed_count}
                          </div>
                          <div>
                            <span className="font-medium">Remaining:</span> {coupon.total_count - coupon.consumed_count}
                          </div>
                        </div>

                        <p className="text-xs text-gray-500 mt-2">
                          Created: {new Date(coupon.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex flex-col space-y-2 ml-4">
                        <button
                          onClick={() => downloadCouponPDF(coupon.coupon_id)}
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