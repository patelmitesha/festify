import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Event, EventSummary } from '../types';
import api from '../services/api';
import Layout from '../components/Layout';

const EventReports: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [summary, setSummary] = useState<EventSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEventAndReports();
    }
  }, [eventId]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (eventId) {
      const interval = setInterval(() => {
        fetchEventAndReports(false);
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [eventId]);

  const fetchEventAndReports = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError('');

      // Fetch event details first
      const eventResponse = await api.get(`/events/${eventId}`);
      setEvent(eventResponse.data);

      // Fetch event summary/reports
      try {
        const reportsResponse = await api.get(`/reports/${eventId}/summary`);
        setSummary(reportsResponse.data);
        setLastUpdated(new Date());
      } catch (reportsErr: any) {
        // If reports endpoint doesn't exist, create a mock summary
        if (reportsErr.response?.status === 404) {
          setSummary({
            event: eventResponse.data,
            summary: {
              total_participants: 0,
              total_coupons_booked: 0,
              total_coupons_redeemed: 0,
              pending_coupons: 0,
              breakdown: []
            }
          });
          setLastUpdated(new Date());
        } else {
          throw reportsErr;
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch event or reports');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchEventAndReports(true);
  };

  const exportReport = async (format: 'pdf' | 'excel') => {
    if (!eventId) return;

    try {
      const response = await api.get(`/reports/${eventId}/export?format=${format}`, {
        responseType: 'blob'
      });

      // Create blob link to download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `event-${eventId}-report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err: any) {
      setError(`Failed to export ${format.toUpperCase()} report`);
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

  const summaryData = summary?.summary || {
    total_participants: 0,
    total_coupons_booked: 0,
    total_coupons_redeemed: 0,
    pending_coupons: 0,
    breakdown: []
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Event Reports</h1>
            <p className="text-gray-600 mt-1">
              {event?.name} - Analytics and detailed reports
            </p>
          </div>
          <div className="flex flex-col items-end space-y-2">
            <div className="flex space-x-3">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
              </button>
              <button
                onClick={() => exportReport('pdf')}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Export PDF
              </button>
              <button
                onClick={() => exportReport('excel')}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Export Excel
              </button>
            </div>
            {lastUpdated && (
              <div className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Event Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Event Details</h3>
              <div className="space-y-2 text-sm text-gray-900">
                <div><span className="font-medium">Name:</span> {event?.name}</div>
                <div><span className="font-medium">Venue:</span> {event?.venue || 'Not specified'}</div>
                <div><span className="font-medium">Start:</span> {event ? new Date(event.start_date).toLocaleString() : 'N/A'}</div>
                <div><span className="font-medium">End:</span> {event ? new Date(event.end_date).toLocaleString() : 'N/A'}</div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Stats</h3>
              <div className="space-y-2 text-sm text-gray-900">
                <div><span className="font-medium">Duration:</span> {event ? Math.ceil((new Date(event.end_date).getTime() - new Date(event.start_date).getTime()) / (1000 * 60 * 60 * 24)) : 0} days</div>
                <div><span className="font-medium">Created:</span> {event ? new Date(event.created_at).toLocaleDateString() : 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Summary Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{summaryData.total_participants}</div>
              <div className="text-sm text-gray-500 mt-1">Total Participants</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{summaryData.total_coupons_booked}</div>
              <div className="text-sm text-gray-500 mt-1">Coupons Booked</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{summaryData.total_coupons_redeemed}</div>
              <div className="text-sm text-gray-500 mt-1">Coupons Redeemed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{summaryData.pending_coupons}</div>
              <div className="text-sm text-gray-500 mt-1">Pending Coupons</div>
            </div>
          </div>
        </div>

        {/* Redemption Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Redemption Rate</h2>
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Redeemed</span>
              <span>{summaryData.total_coupons_booked > 0 ? Math.round((summaryData.total_coupons_redeemed / summaryData.total_coupons_booked) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${summaryData.total_coupons_booked > 0 ? (summaryData.total_coupons_redeemed / summaryData.total_coupons_booked) * 100 : 0}%`
                }}
              ></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Redeemed:</span>
              <span className="ml-2 font-medium">{summaryData.total_coupons_redeemed}</span>
            </div>
            <div>
              <span className="text-gray-600">Remaining:</span>
              <span className="ml-2 font-medium">{summaryData.total_coupons_booked - summaryData.total_coupons_redeemed}</span>
            </div>
          </div>
        </div>

        {/* Breakdown by Category */}
        {summaryData.breakdown.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Breakdown by Category</h2>
            <div className="space-y-4">
              {summaryData.breakdown.map((item: any, index: number) => (
                <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium text-gray-900">{item.category}</div>
                    <div className="text-sm text-gray-500">{item.count} coupons</div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(item.count / summaryData.total_coupons_booked) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Data Message */}
        {summaryData.total_participants === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-yellow-800 mb-2">No Data Available</h3>
              <p className="text-yellow-700 mb-4">
                This event doesn't have any participants or coupons yet. Add participants and generate coupons to see detailed reports.
              </p>
              <div className="space-x-3">
                <Link
                  to={`/events/${eventId}/participants`}
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Add Participants
                </Link>
                <Link
                  to={`/events/${eventId}/coupons`}
                  className="inline-block px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  Manage Coupons
                </Link>
              </div>
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

export default EventReports;