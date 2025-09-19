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

  // QR Code Mode
  const [qrCode, setQrCode] = useState('');
  const [foundCoupon, setFoundCoupon] = useState<Coupon | null>(null);
  const [redeemCount, setRedeemCount] = useState(1);

  // Camera QR Scanning
  const [showCamera, setShowCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const codeReader = useRef<BrowserMultiFormatReader | null>(null);

  // Search Mode
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResults, setSearchResults] = useState<Participant[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Mode toggle
  const [activeMode, setActiveMode] = useState<'qr' | 'search'>('qr');

  useEffect(() => {
    if (eventId) {
      fetchEvent();
    }
  }, [eventId]);

  const fetchEvent = async () => {
    try {
      setIsLoading(true);
      const eventResponse = await api.get(`/events/${eventId}`);
      setEvent(eventResponse.data.event);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch event details');
    } finally {
      setIsLoading(false);
    }
  };

  const searchCouponByQR = async () => {
    if (!qrCode.trim()) {
      setError('Please enter a QR code');
      return;
    }
    await searchCouponByCode(qrCode.trim());
  };

  const searchCouponByCode = async (code: string) => {
    if (!code.trim()) {
      setError('Please enter a QR code');
      return;
    }

    try {
      setError('');
      setSuccess('');
      const response = await api.get(`/coupons/qr/${code.trim()}`);
      setFoundCoupon(response.data.coupon);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to find coupon');
      setFoundCoupon(null);
    }
  };

  const searchParticipantsByPhone = async () => {
    if (!searchPhone.trim()) {
      setError('Please enter a phone number');
      return;
    }

    try {
      setIsSearching(true);
      setError('');
      setSuccess('');
      const response = await api.get(`/events/${eventId}/participants/search?phone=${searchPhone.trim()}`);
      setSearchResults(response.data);

      if (response.data.length === 0) {
        setError('No participants found with this phone number');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to search participants');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const redeemCoupon = async (coupon: Coupon, count: number) => {
    try {
      setError('');
      setSuccess('');

      const response = await api.post(`/coupons/redeem/${coupon.qr_code_value}`, {
        redeemCount: count
      });

      setSuccess(`Coupon redeemed successfully! ${response.data.message}`);

      // Update the coupon in the state
      if (activeMode === 'qr' && foundCoupon && foundCoupon.coupon_id === coupon.coupon_id) {
        setFoundCoupon(response.data.coupon);
      } else if (activeMode === 'search') {
        // Update the coupon in search results
        setSearchResults(prev =>
          prev.map(participant => ({
            ...participant,
            Coupons: participant.Coupons?.map(c =>
              c.coupon_id === coupon.coupon_id ? response.data.coupon : c
            )
          }))
        );

        // Update selected coupon if it matches
        if (selectedCoupon && selectedCoupon.coupon_id === coupon.coupon_id) {
          setSelectedCoupon(response.data.coupon);
        }
      }

      // Reset redeem count
      setRedeemCount(1);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to redeem coupon');
    }
  };

  const clearSearch = () => {
    setSearchPhone('');
    setSearchResults([]);
    setSelectedCoupon(null);
    setError('');
    setSuccess('');
  };

  const clearQRSearch = () => {
    setQrCode('');
    setFoundCoupon(null);
    setError('');
    setSuccess('');
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
      setShowCamera(true);
      setIsScanning(true);
      setError('');
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
                      const scannedCode = result.getText();
                      setQrCode(scannedCode);
                      stopCameraScanning();
                      setSuccess('QR Code detected successfully!');
                      // Automatically search for the coupon
                      searchCouponByCode(scannedCode);
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
  }, []);

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

  // Auto-start camera when component mounts in QR mode
  useEffect(() => {
    if (activeMode === 'qr') {
      startCameraScanning();
    }
    return () => {
      stopCameraScanning();
    };
  }, [activeMode, startCameraScanning, stopCameraScanning]);

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
          <Link to="/" className="text-blue-600 hover:text-blue-500">
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
              {event?.name} - Redeem coupons by QR code or search
            </p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => {
                setActiveMode('qr');
                clearSearch();
                stopCameraScanning();
              }}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeMode === 'qr'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📱 QR Code
            </button>
            <button
              onClick={() => {
                setActiveMode('search');
                clearQRSearch();
                stopCameraScanning();
              }}
              className={`px-4 py-2 rounded-md transition-colors ${
                activeMode === 'search'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🔍 Search by Phone
            </button>
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

        {/* QR Code Mode */}
        {activeMode === 'qr' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">QR Code Redemption</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="qrCode" className="block text-sm font-medium text-gray-700 mb-2">
                  QR Code Value
                </label>
                <div className="space-y-3">
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      id="qrCode"
                      value={qrCode}
                      onChange={(e) => setQrCode(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter or scan QR code value"
                      onKeyPress={(e) => e.key === 'Enter' && searchCouponByQR()}
                    />
                    <button
                      onClick={searchCouponByQR}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Search
                    </button>
                    {qrCode && (
                      <button
                        onClick={clearQRSearch}
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
                      <div className="text-sm text-gray-500">
                        Camera will start automatically when page loads
                      </div>
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
                          QR codes will be detected automatically when in view
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Found Coupon */}
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
                    <div>
                      <span className="text-sm font-medium text-gray-700">Status: </span>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        foundCoupon.status === 'Booked' ? 'bg-green-100 text-green-800' :
                        foundCoupon.status === 'Partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {foundCoupon.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <strong>Usage:</strong> {foundCoupon.consumed_count} / {foundCoupon.total_count} used
                    </div>
                  </div>

                  {foundCoupon.status !== 'Consumed' && (
                    <div className="flex justify-center">
                      <button
                        onClick={() => redeemCoupon(foundCoupon, 1)}
                        className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
                      >
                        Redeem This Coupon
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Search Mode */}
        {activeMode === 'search' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Search by Phone Number</h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="searchPhone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="flex space-x-3">
                  <input
                    type="tel"
                    id="searchPhone"
                    value={searchPhone}
                    onChange={(e) => setSearchPhone(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter participant's phone number"
                    onKeyPress={(e) => e.key === 'Enter' && searchParticipantsByPhone()}
                  />
                  <button
                    onClick={searchParticipantsByPhone}
                    disabled={isSearching}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {isSearching ? 'Searching...' : 'Search'}
                  </button>
                  {searchPhone && (
                    <button
                      onClick={clearSearch}
                      className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Search Results */}
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

                                {coupon.status !== 'Consumed' && (
                                  <div className="flex items-center ml-4">
                                    <button
                                      onClick={() => redeemCoupon(coupon, 1)}
                                      className="px-4 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors font-medium"
                                    >
                                      Redeem
                                    </button>
                                  </div>
                                )}
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
        )}

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

export default CouponRedemption;