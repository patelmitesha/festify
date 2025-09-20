import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
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

const RequestParticipation: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>(eventId || '');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contact_number: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (eventId) {
      fetchEventDetails(eventId);
    }
  }, [eventId]);

  const fetchEventDetails = async (id: string) => {
    try {
      setLoading(true);
      const response = await api.get('/events/public');
      const events = response.data;
      const event = events.find((e: Event) => e.event_id.toString() === id);

      if (event) {
        setSelectedEvent(event);
      } else {
        setError('Event not found');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch event details');
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedEventId) {
      setError('Please enter an event ID');
      return;
    }

    if (!formData.name.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await api.post(`/events/${selectedEventId}/participation-requests`, formData);
      setSuccess(true);
      setFormData({
        name: '',
        address: '',
        contact_number: '',
        email: '',
        message: ''
      });
      setSelectedEventId('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit participation request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-3xl mx-auto mb-6">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Request Submitted Successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              Your participation request has been sent to the event organizer. You'll be notified once they review your request.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setSuccess(false)}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-300 font-medium"
              >
                Submit Another Request
              </button>
              <Link
                to={eventId ? "/upcoming-events" : "/"}
                className="block w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                {eventId ? "Back to Events" : "Back to Home"}
              </Link>
            </div>
          </div>
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
              to={eventId ? "/upcoming-events" : "/"}
              className="px-4 py-2 text-gray-700 hover:text-blue-600 transition-colors font-medium"
            >
              ← Back to {eventId ? "Events" : "Home"}
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-600 px-8 py-6">
            <h1 className="text-3xl font-bold text-white">Request to Participate</h1>
            <p className="text-orange-100 mt-2">
              {selectedEvent ? `Join "${selectedEvent.name}"` : 'Join an exciting event by submitting your participation request'}
            </p>
          </div>

          {/* Event Details Section */}
          {loading && (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600">Loading event details...</p>
            </div>
          )}

          {selectedEvent && (
            <div className="bg-gray-50 px-8 py-6 border-b">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{selectedEvent.name}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <h3 className="font-medium text-gray-700 mb-2">Description</h3>
                    <p className="text-gray-600 text-sm">
                      {selectedEvent.description || 'No description available'}
                    </p>
                  </div>

                  <div className="mb-4">
                    <h3 className="font-medium text-gray-700 mb-2">Venue</h3>
                    <p className="text-gray-600 text-sm">
                      {selectedEvent.venue || 'Venue TBA'}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="mb-4">
                    <h3 className="font-medium text-gray-700 mb-2">Event Schedule</h3>
                    <div className="text-sm text-gray-600">
                      <div className="mb-1">
                        <span className="font-medium">Starts:</span> {formatDate(selectedEvent.start_date)}
                      </div>
                      <div>
                        <span className="font-medium">Ends:</span> {formatDate(selectedEvent.end_date)}
                      </div>
                    </div>
                  </div>

                  {selectedEvent.CouponRates && selectedEvent.CouponRates.length > 0 && (
                    <div className="mb-4">
                      <h3 className="font-medium text-gray-700 mb-2">Pricing</h3>
                      <div className="text-sm text-gray-600">
                        {selectedEvent.CouponRates.map((rate, index) => (
                          <div key={index} className="mb-1">
                            {rate.rate_type}: ₹{rate.price}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedEvent.MealChoices && selectedEvent.MealChoices.length > 0 && (
                    <div>
                      <h3 className="font-medium text-gray-700 mb-2">Available Meals</h3>
                      <div className="text-sm text-gray-600">
                        {selectedEvent.MealChoices.map((meal, index) => (
                          <div key={index} className="mb-1">
                            • {meal.meal_type}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {!eventId && (
              <div>
                <label htmlFor="eventId" className="block text-sm font-medium text-gray-700 mb-2">
                  Event ID *
                </label>
                <input
                  type="text"
                  id="eventId"
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Enter the event ID (e.g., 123)"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Ask the event organizer for the event ID
                </p>
              </div>
            )}

            {eventId && selectedEvent && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <span className="text-blue-600 mr-2">ℹ️</span>
                  <span className="text-blue-800 font-medium">
                    You are requesting to participate in: {selectedEvent.name}
                  </span>
                </div>
              </div>
            )}

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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter your full name"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter your email address"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter your phone number"
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter your address"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Message (Optional)
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                placeholder="Tell the organizer why you'd like to participate..."
              />
            </div>

            <div className="flex space-x-4">
              <Link
                to={eventId ? "/upcoming-events" : "/"}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-center"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg hover:from-orange-600 hover:to-red-700 transition-all duration-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RequestParticipation;