import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Coupon, Event, Participant } from '../types';
import api from '../services/api';
import Layout from '../components/Layout';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader } from '@zxing/library';

const CouponRedemption: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Unified Search
  const [searchValue, setSearchValue] = useState('');
  const [foundCoupon, setFoundCoupon] = useState<Coupon | null>(null);
  const [searchResults, setSearchResults] = useState<Participant[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Camera QR Scanning
  const [showCamera, setShowCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);

  const fetchEvent = useCallback(async () => {
    try {
      setIsLoading(true);
      const eventResponse = await api.get(`/events/${eventId}`);
      setEvent(eventResponse.data.event);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch event details');
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId, fetchEvent]);

  const searchByQRCode = useCallback(async (code: string) => {
    try {
      const response = await api.get(`/coupons/qr/${code}`);
      setFoundCoupon(response.data.coupon);
      setSuccess('Coupon found by QR code!');
      setError(''); // Clear any existing errors
      return true; // Success
    } catch (err: any) {
      setError(err.response?.data?.error || 'No coupon found with this QR code');
      setSuccess(''); // Clear success message on error
      return false; // Failed
    }
  }, []);

  const searchByPhone = useCallback(async (phone: string) => {
    try {
      const response = await api.get(`/events/${eventId}/participants/search?phone=${phone}`);
      setSearchResults(response.data);

      if (response.data.length === 0) {
        setError('No participants found with this phone number');
        setSuccess(''); // Clear success message
        return false; // No results found
      } else {
        setSuccess(`Found ${response.data.length} participant(s) by phone number!`);
        setError(''); // Clear any existing errors
        return true; // Success
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to search participants');
      setSuccess(''); // Clear success message on error
      return false; // Failed
    }
  }, [eventId]);

  // Smart search function that takes a value parameter
  const performSearchWithValue = useCallback(async (value: string) => {
    if (!value) {
      setError('Please enter a QR code or phone number');
      return;
    }

    // Reset previous results
    setFoundCoupon(null);
    setSearchResults([]);
    setIsSearching(true);

    try {
      // Check if it looks like a phone number (contains only digits, +, -, spaces, parentheses)
      const phonePattern = /^[\d\s+()-]+$/;
      const cleanedValue = value.replace(/[^\d]/g, '');

      // First try to search by QR code (this covers coupon QR codes)
      // If it fails, then try phone search if it looks like a phone number
      try {
        const response = await api.get(`/coupons/qr/${value}`);
        setFoundCoupon(response.data.coupon);
        setSuccess('Coupon found by QR code!');
        setError('');
      } catch (err: any) {
        // If QR code search fails and the value looks like a phone number, try phone search
        if (phonePattern.test(value) && cleanedValue.length >= 10) {
          try {
            const response = await api.get(`/events/${eventId}/participants/search?phone=${value}`);
            setSearchResults(response.data);

            if (response.data.length === 0) {
              setError('No participants found with this phone number');
              setSuccess('');
            } else {
              setSuccess(`Found ${response.data.length} participant(s) by phone number!`);
              setError('');
            }
          } catch (phoneErr: any) {
            setError('No coupon or participant found with this code/number');
            setSuccess('');
          }
        } else {
          setError(err.response?.data?.error || 'No coupon found with this QR code');
          setSuccess('');
        }
      }
    } finally {
      setIsSearching(false);
    }
  }, [eventId]);

  // Smart search function that detects QR code vs phone number
  const performSearch = useCallback(async () => {
    const currentValue = searchValue.trim();
    return performSearchWithValue(currentValue);
  }, [searchValue, performSearchWithValue]);

  const redeemCoupon = async (coupon: Coupon, count: number) => {
    try {
      setError('');
      setSuccess('');

      const response = await api.post(`/coupons/redeem/${coupon.qr_code_value}`, {
        redeemCount: count
      });

      setSuccess(`Coupon redeemed successfully! ${response.data.message}`);

      // Update the coupon in the state
      if (foundCoupon && foundCoupon.coupon_id === coupon.coupon_id) {
        setFoundCoupon(response.data.coupon);
      }

      // Update the coupon in search results
      setSearchResults(prev =>
        prev.map(participant => ({
          ...participant,
          Coupons: participant.Coupons?.map(c =>
            c.coupon_id === coupon.coupon_id ? response.data.coupon : c
          )
        }))
      );
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to redeem coupon');
    }
  };

  const clearSearch = () => {
    setSearchValue('');
    setFoundCoupon(null);
    setSearchResults([]);
    setError('');
    setSuccess('');
    // Also stop camera if it's running
    if (showCamera) {
      stopCameraScanning();
    }
  };

  // Initialize QR code reader
  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
    return () => {
      if (codeReader.current) {
        codeReader.current.reset();
      }
    };
  }, []);

  // Camera scanning functions
  const startCameraScanning = useCallback(async () => {
    try {
      // Clear any existing errors when starting camera
      setError('');
      setSuccess('');
      setShowCamera(true);
      setIsScanning(true);
    } catch (err) {
      setError('Failed to access camera. Please check permissions.');
    }
  }, []);

  const stopCameraScanning = useCallback(() => {
    setShowCamera(false);
    setIsScanning(false);
    if (codeReader.current) {
      codeReader.current.reset();
    }
  }, []);

  const captureAndScanImage = useCallback(async () => {
    if (webcamRef.current && codeReader.current) {
      try {
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc) {
          // Convert base64 to blob and then to image element for scanning
          const img = new Image();
          img.onload = async () => {
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                return;
              }

              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);

              // Convert canvas to data URL and create new image element for decoding
              const dataURL = canvas.toDataURL('image/jpeg');
              const scanImg = new Image();
              scanImg.onload = async () => {
                if (codeReader.current) {
                  try {
                    const result = await codeReader.current.decodeFromImageElement(scanImg);
                    if (result) {
                      const scannedCode = result.getText().trim();
                      if (scannedCode) {
                        // Clear error immediately when code is detected
                        setError('');
                        setSearchValue(scannedCode);
                        stopCameraScanning();
                        setSuccess('Code detected from QR scanner!');

                        // Automatically search using the unified search logic
                        setTimeout(() => {
                          // Use the scanned code directly by calling the API
                          const searchCode = async () => {
                            setFoundCoupon(null);
                            setSearchResults([]);
                            setIsSearching(true);

                            try {
                              const response = await api.get(`/coupons/qr/${scannedCode}`);
                              setFoundCoupon(response.data.coupon);
                              setSuccess('Coupon found by QR code!');
                              setError('');
                            } catch (err: any) {
                              // If QR search fails, try phone search
                              const phonePattern = /^[\d\s+()-]+$/;
                              const cleanedValue = scannedCode.replace(/[^\d]/g, '');

                              if (phonePattern.test(scannedCode) && cleanedValue.length >= 10) {
                                try {
                                  const response = await api.get(`/events/${eventId}/participants/search?phone=${scannedCode}`);
                                  setSearchResults(response.data);
                                  if (response.data.length === 0) {
                                    setError('No coupon or participant found with this code/number');
                                  } else {
                                    setSuccess(`Found ${response.data.length} participant(s) by phone number!`);
                                    setError('');
                                  }
                                } catch (phoneErr: any) {
                                  setError('No coupon or participant found with this code/number');
                                }
                              } else {
                                setError(err.response?.data?.error || 'No coupon found with this QR code');
                              }
                            } finally {
                              setIsSearching(false);
                            }
                          };
                          searchCode();
                        }, 100);
                      }
                    }
                  } catch (err) {
                    // Silently continue scanning - no error logging for better UX
                  }
                }
              };
              scanImg.src = dataURL;
            } catch (err) {
              // Silently continue scanning
            }
          };
          img.src = imageSrc;
        }
      } catch (err) {
        setError('Failed to capture image from camera');
      }
    }
  }, [stopCameraScanning, eventId]);

  // Auto-scan when camera is active - increased frequency for better UX
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanning && showCamera) {
      interval = setInterval(() => {
        captureAndScanImage();
      }, 500); // Scan every 500ms for faster detection
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isScanning, showCamera, captureAndScanImage]);

  // Auto-start camera when component mounts
  useEffect(() => {
    startCameraScanning();
    return () => {
      stopCameraScanning();
    };
  }, [startCameraScanning, stopCameraScanning]);

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
          <Link to="/dashboard" className="text-blue-600 hover:text-blue-500">
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
            <h1 className="text-3xl font-bold text-gray-900">Coupon Redemption</h1>
            <p className="text-gray-600 mt-1">
              {event?.name} - Search by QR code or phone number
            </p>
            <div className="mt-2 flex items-center space-x-2">
              <span className="text-sm font-medium text-blue-700">Current Date:</span>
              <span className="text-sm text-blue-900 bg-blue-50 px-2 py-1 rounded">
                {new Date().toLocaleDateString('en-GB', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* Unified Search */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Search Coupon</h2>

          <div className="space-y-4">
            <div>
              <label htmlFor="searchValue" className="block text-sm font-medium text-gray-700 mb-2">
                QR Code or Phone Number
              </label>
              <div className="space-y-3">
                <div className="flex space-x-3">
                  <input
                    type="text"
                    id="searchValue"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter QR code value or phone number"
                    onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                  />
                  <button
                    onClick={performSearch}
                    disabled={isSearching}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </button>
                  {searchValue && (
                    <button
                      onClick={clearSearch}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Camera Scanner Toggle */}
                <div className="flex justify-center">
                  {showCamera ? (
                    <button
                      onClick={stopCameraScanning}
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center space-x-2"
                    >
                      <span>⏹️</span>
                      <span>Stop Camera</span>
                    </button>
                  ) : (
                    <button
                      onClick={startCameraScanning}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
                    >
                      <span>📷</span>
                      <span>Start Camera</span>
                    </button>
                  )}
                </div>

                {/* Camera Preview */}
                {showCamera && (
                  <div className="flex flex-col items-center space-y-3">
                    <div className="relative border-2 border-green-500 rounded-lg overflow-hidden">
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        width={400}
                        height={300}
                        videoConstraints={{
                          width: 400,
                          height: 300,
                          facingMode: "environment" // Use back camera on mobile
                        }}
                        className="rounded-lg"
                      />
                      {isScanning && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="relative">
                            <div className="w-48 h-48 border-2 border-green-400 border-dashed animate-pulse"></div>
                            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                              Scanning...
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-gray-600">
                        {isScanning ? 'Scanning for QR codes automatically...' : 'Position QR code in the camera view'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Supports QR codes containing coupon codes or phone numbers
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Found Coupon by QR Code */}
            {foundCoupon && (
              <div className="mt-6 p-4 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Coupon Found</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm font-medium text-blue-700">Participant</div>
                    <div className="text-blue-900">{foundCoupon.Participant?.name || 'Unknown'}</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-sm font-medium text-green-700">Meal Option</div>
                    <div className="text-green-900">{foundCoupon.MealChoice?.meal_type || 'Not specified'}</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg">
                    <div className="text-sm font-medium text-purple-700">Rate & Price</div>
                    <div className="text-purple-900">
                      {foundCoupon.CouponRate?.rate_type || 'Unknown'} - ₹{foundCoupon.CouponRate?.price || 0}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4">
                  <div className="flex items-center space-x-4">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Overall Status: </span>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        foundCoupon.status === 'Booked' ? 'bg-green-100 text-green-800' :
                        foundCoupon.status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {foundCoupon.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Today: </span>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        (foundCoupon as any).today_redeemed ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {(foundCoupon as any).today_redeemed ? 'Redeemed' : 'Available'}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Usage:</strong> {foundCoupon.consumed_count} / {foundCoupon.total_count} used
                  </div>
                </div>

                <div className="flex justify-center">
                  {(foundCoupon as any).can_redeem_today ? (
                    <button
                      onClick={() => redeemCoupon(foundCoupon, 1)}
                      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                    >
                      Redeem for Today
                    </button>
                  ) : (
                    <div className="text-center">
                      <button
                        disabled
                        className="px-6 py-2 bg-gray-400 text-white rounded-md cursor-not-allowed font-medium"
                      >
                        {(foundCoupon as any).today_redeemed ? 'Already Redeemed Today' : 'Cannot Redeem'}
                      </button>
                      <p className="text-xs text-gray-500 mt-1">
                        {(foundCoupon as any).today_redeemed
                          ? 'This coupon has been used for today'
                          : (foundCoupon as any).is_within_event_dates === false
                            ? `Event runs from ${(foundCoupon as any).event_start_date} to ${(foundCoupon as any).event_end_date}`
                            : 'Check overall status above'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Search Results by Phone */}
            {searchResults.length > 0 && (
              <div className="mt-6 space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Search Results ({searchResults.length})</h3>

                {searchResults.map((participant) => (
                  <div key={participant.participant_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="mb-3">
                      <h4 className="font-medium text-gray-900">{participant.name}</h4>
                      <p className="text-sm text-gray-600">📞 {participant.contact_number}</p>
                    </div>

                    {participant.Coupons && participant.Coupons.length > 0 ? (
                      <div className="space-y-2">
                        <h5 className="text-sm font-medium text-gray-700">Coupons ({participant.Coupons.length})</h5>
                        {participant.Coupons.map((coupon) => (
                          <div key={coupon.coupon_id} className="p-3 bg-gray-50 rounded border">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="text-sm">
                                  <strong>{coupon.MealChoice?.meal_type}</strong> - {coupon.CouponRate?.rate_type} (₹{coupon.CouponRate?.price})
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  Status: <span className={`px-1 py-0.5 rounded text-xs ${
                                    coupon.status === 'Booked' ? 'bg-green-100 text-green-700' :
                                    coupon.status === 'Partial' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {coupon.status}
                                  </span>
                                  {' • '}
                                  Usage: {coupon.consumed_count}/{coupon.total_count}
                                </div>
                              </div>

                              <div className="flex items-center ml-4">
                                {(coupon as any).can_redeem_today ? (
                                  <button
                                    onClick={() => redeemCoupon(coupon, 1)}
                                    className="px-4 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium"
                                  >
                                    Redeem Today
                                  </button>
                                ) : (
                                  <div className="text-center">
                                    <button
                                      disabled
                                      className="px-4 py-1 text-sm bg-gray-400 text-white rounded cursor-not-allowed font-medium"
                                    >
                                      {(coupon as any).today_redeemed ? 'Used Today' : 'Cannot Redeem'}
                                    </button>
                                    {(coupon as any).is_within_event_dates === false && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        Event: {(coupon as any).event_start_date} to {(coupon as any).event_end_date}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">No coupons found for this participant</div>
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
    </Layout>
  );
};

export default CouponRedemption;