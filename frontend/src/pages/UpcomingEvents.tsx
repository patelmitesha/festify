import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

interface Event {
  event_id: number;
  name: string;
  description: string;
  venue: string;
  start_date: string;
  end_date: string;
  CouponRates?: {
    rate_type: string;
    price: string;
  }[];
  MealChoices?: {
    meal_type: string;
  }[];
}

const UpcomingEvents: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchUpcomingEvents();
  }, []);

  const fetchUpcomingEvents = async () => {
    try {
      const response = await api.get('/events/public');
      setEvents(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEventStatus = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (now >= start && now <= end) {
      return { status: 'ongoing', label: 'Happening Now', color: 'bg-green-500' };
    } else if (now < start) {
      return { status: 'upcoming', label: 'Upcoming', color: 'bg-blue-500' };
    } else {
      return { status: 'ended', label: 'Ended', color: 'bg-gray-500' };
    }
  };

  const handleParticipate = (eventId: number) => {
    navigate(`/request-participation/${eventId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading upcoming events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                🎪
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Festify
              </span>
            </div>
            <Link
              to="/"
              className="px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Current & Upcoming Events
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover exciting events happening now and coming soon. Request to participate in the ones that interest you.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-8 text-center">
            {error}
          </div>
        )}

        {events.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-6">
              📅
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No Current or Upcoming Events</h3>
            <p className="text-gray-600 mb-8">
              There are no current or upcoming events available for participation at the moment.
            </p>
            <Link
              to="/"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 font-medium"
            >
              Back to Home
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => {
              const eventStatus = getEventStatus(event.start_date, event.end_date);
              return (
                <div
                  key={event.event_id}
                  className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden"
                >
                  <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4 relative">
                    <h3 className="text-xl font-bold text-white truncate pr-20">{event.name}</h3>
                    <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium text-white ${eventStatus.color}`}>
                      {eventStatus.label}
                    </span>
                  </div>

                  <div className="p-6">
                  <div className="mb-4">
                    <p className="text-gray-600 text-sm mb-2 line-clamp-3">
                      {event.description || 'No description available'}
                    </p>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="w-5 h-5 mr-3">📍</span>
                      <span className="truncate">{event.venue || 'Venue TBA'}</span>
                    </div>

                    <div className="flex items-center text-sm text-gray-600">
                      <span className="w-5 h-5 mr-3">📅</span>
                      <div className="flex-1">
                        <div className="font-medium">Starts: {formatDate(event.start_date)}</div>
                        <div>Ends: {formatDate(event.end_date)}</div>
                      </div>
                    </div>

                    {event.CouponRates && event.CouponRates.length > 0 && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="w-5 h-5 mr-3">💰</span>
                        <div className="flex-1">
                          <div className="font-medium">Pricing:</div>
                          {event.CouponRates.slice(0, 2).map((rate, index) => (
                            <div key={index} className="text-xs">
                              {rate.rate_type}: ₹{rate.price}
                            </div>
                          ))}
                          {event.CouponRates.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{event.CouponRates.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {event.MealChoices && event.MealChoices.length > 0 && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="w-5 h-5 mr-3">🍽️</span>
                        <div className="flex-1">
                          <div className="font-medium">Meals Available:</div>
                          <div className="text-xs">
                            {event.MealChoices.slice(0, 3).map(meal => meal.meal_type).join(', ')}
                            {event.MealChoices.length > 3 && '...'}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                    <button
                      onClick={() => handleParticipate(event.event_id)}
                      className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-300 font-medium"
                    >
                      Request to Participate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingEvents;