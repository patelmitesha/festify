import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Layout from '../components/Layout';

interface Representative {
  user_id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
  RepresentativeAssignments: Array<{
    id: number;
    event_id: number;
    permissions: string[];
    Event: {
      event_id: number;
      name: string;
    };
  }>;
}

interface Event {
  event_id: number;
  name: string;
}

const UserManagement: React.FC = () => {
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    selectedEvents: [] as number[],
    permissions: ['add_participants', 'redeem_coupons'] as string[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [repsResponse, eventsResponse] = await Promise.all([
        api.get('/users/representatives'),
        api.get('/events')
      ]);
      setRepresentatives(repsResponse.data.representatives);
      setEvents(eventsResponse.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRepresentative = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users/representatives', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        eventIds: formData.selectedEvents,
        permissions: formData.permissions
      });

      setShowCreateForm(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        selectedEvents: [],
        permissions: ['add_participants', 'redeem_coupons']
      });
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create representative');
    }
  };

  const handleDeleteRepresentative = async (representativeId: number) => {
    if (!window.confirm('Are you sure you want to delete this representative?')) {
      return;
    }

    try {
      await api.delete(`/users/representatives/${representativeId}`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete representative');
    }
  };

  const handleEventSelection = (eventId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedEvents: prev.selectedEvents.includes(eventId)
        ? prev.selectedEvents.filter(id => id !== eventId)
        : [...prev.selectedEvents, eventId]
    }));
  };

  const handlePermissionChange = (permission: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-1">
              Create and manage event representatives
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Representative
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Create Representative Form */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Representative</h3>
                <form onSubmit={handleCreateRepresentative} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Events</label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {events.map(event => (
                        <label key={event.event_id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.selectedEvents.includes(event.event_id)}
                            onChange={() => handleEventSelection(event.event_id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">{event.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes('add_participants')}
                          onChange={() => handlePermissionChange('add_participants')}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Add Participants</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.permissions.includes('redeem_coupons')}
                          onChange={() => handlePermissionChange('redeem_coupons')}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Redeem Coupons</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Create Representative
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Representatives List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Representatives ({representatives.length})
            </h2>

            {representatives.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-500 text-lg mb-4">No representatives created yet</div>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="text-blue-600 hover:text-blue-500"
                >
                  Create your first representative
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {representatives.map((rep) => (
                  <div key={rep.user_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{rep.name}</h3>
                        <p className="text-sm text-gray-600">{rep.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Created: {new Date(rep.created_at).toLocaleDateString()}
                        </p>

                        {/* Assigned Events */}
                        <div className="mt-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-2">Assigned Events:</h4>
                          {rep.RepresentativeAssignments.length === 0 ? (
                            <p className="text-sm text-gray-500">No events assigned</p>
                          ) : (
                            <div className="space-y-2">
                              {rep.RepresentativeAssignments.map((assignment) => (
                                <div key={assignment.id} className="bg-gray-50 p-2 rounded">
                                  <div className="text-sm font-medium">{assignment.Event.name}</div>
                                  <div className="text-xs text-gray-600">
                                    Permissions: {assignment.permissions.join(', ')}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2 ml-4">
                        <button
                          onClick={() => handleDeleteRepresentative(rep.user_id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                        >
                          Delete
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
            to="/"
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default UserManagement;