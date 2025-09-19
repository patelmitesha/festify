import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

interface CouponData {
  coupon_id: number;
  qr_code_value: string;
  qr_code_image: string;
  status: string;
  consumed_count: number;
  total_count: number;
  created_at: string;
  Event: {
    name: string;
    venue: string;
    start_date: string;
    end_date: string;
  };
  Participant: {
    name: string;
    address: string;
    contact_number: string;
  };
  CouponRate: {
    rate_type: string;
    price: string;
  };
  MealChoice: {
    meal_type: string;
  };
}

const CouponView: React.FC = () => {
  const { qrCode } = useParams<{ qrCode: string }>();
  const [coupon, setCoupon] = useState<CouponData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (qrCode) {
      fetchCouponData();
    }
  }, [qrCode]);

  const fetchCouponData = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/coupons/data/${qrCode}`);
      setCoupon(response.data.coupon);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch coupon data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
        <div className="text-white text-xl">Loading coupon...</div>
      </div>
    );
  }

  if (error || !coupon) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-400 via-pink-500 to-red-500">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
          <div className="text-red-600 text-xl font-bold mb-4">Coupon Not Found</div>
          <p className="text-gray-600 mb-6">
            {error || 'The QR code you scanned is invalid or the coupon has been removed.'}
          </p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Booked':
        return 'bg-green-500';
      case 'Partial':
        return 'bg-yellow-500';
      case 'Consumed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'Booked':
        return 'Available';
      case 'Partial':
        return 'Partially Used';
      case 'Consumed':
        return 'Fully Used';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 py-8 px-4">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white px-6 py-8 text-center">
            <h1 className="text-2xl font-bold mb-2">FESTIFY COUPON</h1>
            <p className="opacity-90">{coupon.Event.name}</p>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Coupon Info */}
            <div className="bg-gray-50 rounded-lg p-5 border-l-4 border-indigo-600">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Participant:</span>
                  <span className="text-gray-900">{coupon.Participant.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Meal Type:</span>
                  <span className="text-gray-900">{coupon.MealChoice.meal_type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Rate Type:</span>
                  <span className="text-gray-900">{coupon.CouponRate.rate_type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Price:</span>
                  <span className="text-gray-900 font-bold">₹{coupon.CouponRate.price}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Status:</span>
                  <span className={`px-3 py-1 rounded-full text-white text-sm font-semibold ${getStatusColor(coupon.status)}`}>
                    {getStatusText(coupon.status)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Usage:</span>
                  <span className="text-gray-900">{coupon.consumed_count}/{coupon.total_count}</span>
                </div>
              </div>
            </div>

            {/* Event Details */}
            <div className="bg-gray-50 rounded-lg p-5 border-l-4 border-indigo-600">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Venue:</span>
                  <span className="text-gray-900">{coupon.Event.venue}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Date:</span>
                  <span className="text-gray-900">
                    {new Date(coupon.Event.start_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <p className="font-bold text-gray-800 mb-4">QR Code</p>
              <div className="bg-white rounded-lg p-4 inline-block shadow-md">
                <img
                  src={coupon.qr_code_image}
                  alt="QR Code"
                  className="w-48 h-48 mx-auto"
                />
              </div>
              <div className="mt-4 p-2 bg-gray-100 rounded text-xs font-mono text-gray-600 break-all">
                Code: {coupon.qr_code_value}
              </div>
              <p className="text-sm text-gray-600 mt-3">
                Present this coupon for meal redemption
              </p>
            </div>

          </div>

          {/* Footer */}
          <div className="text-center py-4 text-xs text-gray-500 border-t">
            Powered by Festify © {new Date().getFullYear()}
          </div>
        </div>
      </div>
  );
};

export default CouponView;