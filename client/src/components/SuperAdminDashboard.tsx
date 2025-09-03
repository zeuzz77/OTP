import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from './LoadingSpinner';

interface User {
  id: number;
  username: string;
  role: 'superadmin' | 'user';
  active: boolean;
  created_at: string;
  updated_at: string;
}

const SuperAdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'user' as 'user' | 'superadmin'
  });
  const [editUserData, setEditUserData] = useState({
    username: '',
    role: 'user' as 'user' | 'superadmin',
    newPassword: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/auth/users');
      setUsers(response.data.users);
    } catch (error) {
      setMessage('Failed to fetch users');
      console.error('Failed to fetch users:', error);
    }
    setLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newUser.password.length < 6) {
      setMessage('Password must be at least 6 characters long');
      return;
    }

    try {
      await axios.post('/api/auth/users', newUser);
      setMessage('User created successfully!');
      setShowCreateUser(false);
      setNewUser({ username: '', password: '', role: 'user' });
      fetchUsers();
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to create user');
    }
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: boolean) => {
    try {
      await axios.put(`/api/auth/users/${userId}`, {
        active: !currentStatus
      });
      setMessage(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      fetchUsers();
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to update user status');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage('New password must be at least 6 characters long');
      return;
    }

    try {
      await axios.put('/api/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setMessage('Password changed successfully!');
      setShowChangePassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to change password');
    }
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`/api/auth/users/${userId}`);
      setMessage(`User "${username}" deleted successfully!`);
      fetchUsers();
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleEditUser = (u: User) => {
    setEditingUser(u);
    setEditUserData({
      username: u.username,
      role: u.role,
      newPassword: ''
    });
    setShowEditUser(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingUser) return;

    try {
      const updateData: any = {};
      
      if (editUserData.username !== editingUser.username) {
        updateData.username = editUserData.username;
      }
      
      if (editUserData.role !== editingUser.role) {
        updateData.role = editUserData.role;
      }

      // Update basic info if there are changes
      if (Object.keys(updateData).length > 0) {
        await axios.put(`/api/auth/users/${editingUser.id}`, updateData);
      }

      // Reset password if provided
      if (editUserData.newPassword.trim()) {
        if (editUserData.newPassword.length < 6) {
          setMessage('Password must be at least 6 characters long');
          return;
        }
        await axios.put(`/api/auth/users/${editingUser.id}/reset-password`, {
          newPassword: editUserData.newPassword
        });
      }

      setMessage('User updated successfully!');
      setShowEditUser(false);
      setEditingUser(null);
      setEditUserData({ username: '', role: 'user', newPassword: '' });
      fetchUsers();
    } catch (error: any) {
      setMessage(error.response?.data?.error || 'Failed to update user');
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'superadmin') {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const getStatusBadge = (active: boolean) => {
    if (active) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-whatsapp-secondary">
              Super Admin Dashboard
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.username}</span>
              <Link 
                to="/dashboard" 
                className="bg-whatsapp-primary hover:bg-whatsapp-secondary text-white px-4 py-2 rounded-md text-sm font-medium transition duration-200"
              >
                User Dashboard
              </Link>
              <button 
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition duration-200"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {message && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {message}
          </div>
        )}

        {/* User Management Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-whatsapp-secondary pb-2 border-b-2 border-whatsapp-primary">
              User Management
            </h2>
            <button 
              onClick={() => setShowCreateUser(!showCreateUser)}
              className="bg-whatsapp-primary hover:bg-whatsapp-secondary text-white px-4 py-2 rounded-md font-medium transition duration-200"
            >
              {showCreateUser ? 'Cancel' : 'Create New User'}
            </button>
          </div>

          {/* Create User Form */}
          {showCreateUser && (
            <form onSubmit={handleCreateUser} className="mb-6 bg-gray-50 p-4 rounded-md border">
              <h3 className="text-lg font-medium text-whatsapp-secondary mb-4">Create New User</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  required
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-whatsapp-primary focus:border-transparent"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  required
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-whatsapp-primary focus:border-transparent"
                />
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as 'user' | 'superadmin'})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-whatsapp-primary focus:border-transparent"
                >
                  <option value="user">User</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
              <button 
                type="submit"
                className="mt-4 bg-whatsapp-primary hover:bg-whatsapp-secondary text-white px-4 py-2 rounded-md font-medium transition duration-200"
              >
                Create User
              </button>
            </form>
          )}

          {/* Edit User Form */}
          {showEditUser && editingUser && (
            <form onSubmit={handleUpdateUser} className="mt-4 bg-blue-50 p-4 rounded-md border border-blue-200">
              <h3 className="text-lg font-medium text-blue-700 mb-4">Edit User: {editingUser.username}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Username"
                  value={editUserData.username}
                  onChange={(e) => setEditUserData({...editUserData, username: e.target.value})}
                  required
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <select
                  value={editUserData.role}
                  onChange={(e) => setEditUserData({...editUserData, role: e.target.value as 'user' | 'superadmin'})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="user">User</option>
                  <option value="superadmin">Super Admin</option>
                </select>
                <input
                  type="password"
                  placeholder="New Password (optional)"
                  value={editUserData.newPassword}
                  onChange={(e) => setEditUserData({...editUserData, newPassword: e.target.value})}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent md:col-span-2"
                />
              </div>
              <div className="flex space-x-2 mt-4">
                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition duration-200"
                >
                  Update User
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setShowEditUser(false);
                    setEditingUser(null);
                    setEditUserData({ username: '', role: 'user', newPassword: '' });
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md font-medium transition duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Users Table */}
          {loading ? (
            <LoadingSpinner message="Loading users..." size="medium" />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {u.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {u.username}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getRoleBadge(u.role)}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(u.active)}`}>
                          {u.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditUser(u)}
                            className="px-3 py-1 rounded text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white transition duration-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(u.id, u.active)}
                            className={`px-3 py-1 rounded text-xs font-medium transition duration-200 ${
                              u.active 
                                ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          >
                            {u.active ? 'Deactivate' : 'Activate'}
                          </button>
                          {/* Prevent deleting yourself */}
                          {u.id !== user?.id && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              className="px-3 py-1 rounded text-xs font-medium bg-red-600 hover:bg-red-700 text-white transition duration-200"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-600">No users found.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Settings Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-whatsapp-secondary mb-4 pb-2 border-b-2 border-whatsapp-primary">
            Admin Settings
          </h2>
          
          <button 
            onClick={() => setShowChangePassword(!showChangePassword)}
            className="bg-whatsapp-primary hover:bg-whatsapp-secondary text-white px-6 py-2 rounded-md font-medium transition duration-200"
          >
            Change Password
          </button>

          {showChangePassword && (
            <form onSubmit={handleChangePassword} className="mt-4 bg-gray-50 p-4 rounded-md">
              <h3 className="text-lg font-medium text-whatsapp-secondary mb-4">Change Password</h3>
              <div className="space-y-4">
                <input
                  type="password"
                  placeholder="Current Password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-whatsapp-primary focus:border-transparent"
                />
                <input
                  type="password"
                  placeholder="New Password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-whatsapp-primary focus:border-transparent"
                />
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-whatsapp-primary focus:border-transparent"
                />
                <div className="flex space-x-4">
                  <button 
                    type="submit"
                    className="bg-whatsapp-primary hover:bg-whatsapp-secondary text-white px-4 py-2 rounded-md font-medium transition duration-200"
                  >
                    Update Password
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowChangePassword(false)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium transition duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Statistics Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-whatsapp-secondary mb-2">Total Users</h3>
            <p className="text-3xl font-bold text-whatsapp-primary">{users.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-whatsapp-secondary mb-2">Super Admins</h3>
            <p className="text-3xl font-bold text-red-600">
              {users.filter(u => u.role === 'superadmin').length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-whatsapp-secondary mb-2">Active Users</h3>
            <p className="text-3xl font-bold text-green-600">
              {users.filter(u => u.active).length}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
