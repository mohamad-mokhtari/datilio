import { useState, useEffect } from 'react';
import Container from '@/components/shared/Container';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import AdminService from '@/services/AdminService';
import { 
  HiUsers, 
  HiCog, 
  HiChartBar, 
  HiDocumentText, 
  HiDatabase, 
  HiLightningBolt,
  HiTrendingUp,
  HiTrendingDown,
  HiClock,
  HiStar,
  HiCheckCircle,
  HiExclamationCircle,
  HiInformationCircle,
  HiArrowUp,
  HiArrowDown,
  HiEye,
  HiDownload,
  HiTrash,
  HiShieldCheck,
  HiUserGroup
} from 'react-icons/hi';
import { toast } from 'react-hot-toast';

import type { AdminStats } from '@/@types/admin'

const Home = () => {
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch admin statistics
      const response = await AdminService.getUsers({ page: 1, page_size: 1000 });
      const users = Array.isArray(response.data) ? response.data : response.data.users || [];
      
      // Calculate stats from user data
      const stats: AdminStats = {
        total_users: users.length,
        active_users: users.filter(user => !user.disabled).length,
        admin_users: users.filter(user => user.role === 'admin').length,
        disabled_users: users.filter(user => user.disabled).length,
        verified_users: users.filter(user => user.email_verified).length,
        unverified_users: users.filter(user => !user.email_verified).length,
        new_users_this_month: users.filter(user => {
          const userDate = new Date(user.id); // Using ID as timestamp approximation
          const now = new Date();
          return userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear();
        }).length,
        total_logins_today: 0 // This would need to be fetched from a separate endpoint
      };
      
      setAdminStats(stats);

    } catch (error: any) {
      console.error('Failed to fetch admin stats:', error);
      setError('Failed to load admin dashboard');
      toast.error('Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading admin dashboard...</p>
          </div>
        </div>
      </Container>
    );
  }

  if (error || !adminStats) {
    return (
      <Container>
        <div className="text-center py-12">
          <HiExclamationCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Admin Dashboard</h3>
          <p className="text-gray-600 mb-4">{error || 'Unable to load admin dashboard data'}</p>
          <Button onClick={fetchAdminStats} variant="solid">
            Try Again
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Welcome to the admin panel. Manage users and system settings.</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              size="sm" 
              variant="default" 
              onClick={fetchAdminStats}
              loading={loading}
            >
              <HiCog className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Admin Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.total_users}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <HiArrowUp className="w-3 h-3 mr-1" />
                  {adminStats.new_users_this_month} new this month
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <HiUsers className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.active_users}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <HiCheckCircle className="w-3 h-3 mr-1" />
                  {adminStats.disabled_users} disabled
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <HiUserGroup className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Admin Users</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.admin_users}</p>
                <p className="text-xs text-purple-600 flex items-center mt-1">
                  <HiShieldCheck className="w-3 h-3 mr-1" />
                  {adminStats.total_users - adminStats.admin_users} regular users
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <HiShieldCheck className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Email Verified</p>
                <p className="text-2xl font-bold text-gray-900">{adminStats.verified_users}</p>
                <p className="text-xs text-yellow-600 flex items-center mt-1">
                  <HiExclamationCircle className="w-3 h-3 mr-1" />
                  {adminStats.unverified_users} unverified
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <HiCheckCircle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card header="Quick Actions" headerBorder>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
              <HiUsers className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Users</h3>
              <p className="text-sm text-gray-600 mb-4">View, edit, and manage all system users</p>
              <Button variant="solid" size="sm" className="bg-blue-600 hover:bg-blue-700">
                Go to User Management
              </Button>
              </div>

            <div className="text-center p-6 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
              <HiShieldCheck className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">System Settings</h3>
              <p className="text-sm text-gray-600 mb-4">Configure system-wide settings and permissions</p>
              <Button variant="solid" size="sm" className="bg-green-600 hover:bg-green-700" disabled>
                Coming Soon
              </Button>
            </div>

            <div className="text-center p-6 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer">
              <HiChartBar className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics</h3>
              <p className="text-sm text-gray-600 mb-4">View system usage and performance metrics</p>
              <Button variant="solid" size="sm" className="bg-purple-600 hover:bg-purple-700" disabled>
                Coming Soon
              </Button>
            </div>
          </div>
        </Card>

        {/* System Overview */}
        <Card header="System Overview" headerBorder>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">User Distribution</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-sm font-medium">Active Users</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{adminStats.active_users}</p>
                    <p className="text-xs text-gray-500">
                      {((adminStats.active_users / adminStats.total_users) * 100).toFixed(1)}% of total
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                    <span className="text-sm font-medium">Disabled Users</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{adminStats.disabled_users}</p>
                    <p className="text-xs text-gray-500">
                      {((adminStats.disabled_users / adminStats.total_users) * 100).toFixed(1)}% of total
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                    <span className="text-sm font-medium">Admin Users</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{adminStats.admin_users}</p>
                    <p className="text-xs text-gray-500">
                      {((adminStats.admin_users / adminStats.total_users) * 100).toFixed(1)}% of total
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Email Verification Status</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <HiCheckCircle className="w-5 h-5 text-green-600 mr-3" />
                    <span className="text-sm font-medium">Verified Emails</span>
                  </div>
                  <span className="text-sm font-semibold">{adminStats.verified_users}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center">
                    <HiExclamationCircle className="w-5 h-5 text-yellow-600 mr-3" />
                    <span className="text-sm font-medium">Unverified Emails</span>
                  </div>
                  <span className="text-sm font-semibold">{adminStats.unverified_users}</span>
                </div>
              </div>
              
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Verification Rate</h4>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${((adminStats.verified_users / adminStats.total_users) * 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {((adminStats.verified_users / adminStats.total_users) * 100).toFixed(1)}% verified
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card header="Recent Activity" headerBorder>
          <div className="text-center py-8">
            <HiClock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Activity Log</h3>
            <p className="text-sm text-gray-600 mb-4">Recent admin activities and system events</p>
            <Button variant="outline" size="sm" disabled>
              View Full Activity Log
            </Button>
          </div>
        </Card>
      </div>
    </Container>
  );
};

export default Home;
