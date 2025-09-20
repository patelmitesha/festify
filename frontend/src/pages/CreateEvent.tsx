import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Layout from '../components/Layout';

const CreateEvent: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    venue: '',
    start_date: '',
    end_date: ''
  });
  const [mealChoices, setMealChoices] = useState<string[]>(['']);
  const [couponRates, setCouponRates] = useState<{rate_type: string, price: string}[]>([
    { rate_type: 'Member', price: '' },
    { rate_type: 'Guest', price: '' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMealChoiceChange = (index: number, value: string) => {
    const updatedMealChoices = [...mealChoices];
    updatedMealChoices[index] = value;
    setMealChoices(updatedMealChoices);
  };

  const addMealChoice = () => {
    setMealChoices([...mealChoices, '']);
  };

  const removeMealChoice = (index: number) => {
    if (mealChoices.length > 1) {
      setMealChoices(mealChoices.filter((_, i) => i !== index));
    }
  };

  const handleCouponRateChange = (index: number, field: 'rate_type' | 'price', value: string) => {
    const updatedRates = [...couponRates];
    updatedRates[index][field] = value;
    setCouponRates(updatedRates);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Prepare meal choices (filter out empty ones)
      const validMealChoices = mealChoices
        .filter(meal => meal.trim() !== '')
        .map(meal_type => ({ meal_type: meal_type.trim() }));

      // Prepare coupon rates (filter out ones with empty prices)
      const validCouponRates = couponRates
        .filter(rate => rate.price.trim() !== '')
        .map(rate => ({
          rate_type: rate.rate_type,
          price: parseFloat(rate.price)
        }));

      const eventData = {
        ...formData,
        meal_choices: validMealChoices,
        coupon_rates: validCouponRates
      };

      const response = await api.post('/events', eventData);
      console.log('Event created:', response.data);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create event');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Create New Event</h1>
            <p className="text-gray-600 mt-1">Fill in the details for your new event</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Event Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter event name"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter event description (optional)"
              />
            </div>

            <div>
              <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-2">
                Venue *
              </label>
              <input
                type="text"
                id="venue"
                name="venue"
                value={formData.venue}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter venue location"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                  End Date & Time *
                </label>
                <input
                  type="datetime-local"
                  id="end_date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Food Options Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Food Options
              </label>
              <div className="space-y-2">
                {mealChoices.map((meal, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={meal}
                      onChange={(e) => handleMealChoiceChange(index, e.target.value)}
                      placeholder={`Food option ${index + 1} (e.g., Lunch, Dinner, Snacks)`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    {mealChoices.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMealChoice(index)}
                        className="px-2 py-2 text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addMealChoice}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  + Add another food option
                </button>
              </div>
            </div>

            {/* Coupon Pricing Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Coupon Pricing
              </label>
              <div className="space-y-3">
                {couponRates.map((rate, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="w-24">
                      <input
                        type="text"
                        value={rate.rate_type}
                        onChange={(e) => handleCouponRateChange(index, 'rate_type', e.target.value)}
                        placeholder="Type"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-500">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={rate.price}
                          onChange={(e) => handleCouponRateChange(index, 'price', e.target.value)}
                          placeholder="0.00"
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <p className="text-sm text-gray-500">
                  Set different pricing for different participant types (e.g., Member, Guest)
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CreateEvent;