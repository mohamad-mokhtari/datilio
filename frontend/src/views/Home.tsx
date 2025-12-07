import { useState, useEffect } from 'react';
import Container from '@/components/shared/Container';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Progress from '@/components/ui/Progress';
import ApiService2 from '@/services/ApiService2';
import { 
  HiUser, 
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
  HiTrash
} from 'react-icons/hi';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { parseBackendError } from '@/utils/errorParser';

// Types based on the API response
interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  email_verified: boolean;
  role: string;
  created_at: string;
  last_login: string;
}

interface PlanInfo {
  has_active_plan: boolean;
  plan_name: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  features: {
    storage_limit_gb: number;
    ai_tokens_per_month: number;
    synthetic_rows_per_month: number;
    rules_limit: number;
    custom_lists_limit: number;
  };
}

interface UsageSummary {
  current_month: {
    custom_lists: number;
    file_storage_mb: number;
    rules_used: number;
    synthetic_rows: number;
  };
  limits: {
    file_storage_mb: number;
    rules_used: number;
    openai_tokens: number;
    synthetic_rows: number;
    custom_lists: number | null;
  };
  percentages: {
    file_storage_mb: number;
    rules_used: number;
    openai_tokens: number;
    synthetic_rows: number;
    custom_lists: number;
  };
}

interface FileStatistics {
  total_files: number;
  by_type: {
    csv: { count: number; total_size_mb: number };
    excel: { count: number; total_size_mb: number };
    json: { count: number; total_size_mb: number };
  };
}

interface RecentFile {
  id: string;
  name: string;
  type: string;
  size_mb: number;
  created_at: string;
  exists: boolean;
}

interface AIStatistics {
  total_interactions: number;
  by_model: {
    [key: string]: {
      count: number;
      total_tokens: number;
      avg_processing_time: number;
    };
  };
}

interface RecentQAInteraction {
  id: string;
  question: string;
  model: string;
  tokens_used: number;
  processing_time: number;
  feedback_score: number | null;
  created_at: string;
}

interface DashboardData {
  user_profile: UserProfile;
  plan_info: PlanInfo;
  usage_summary: UsageSummary;
  usage_breakdown: any;
  file_statistics: FileStatistics;
  recent_files: RecentFile[];
  ai_statistics: AIStatistics;
  recent_qa_interactions: RecentQAInteraction[];
  usage_trends: any;
  activity_summary: any;
  feedback_summary: any;
  recommendations: any[];
  system_status: any;
  generated_at: string;
}

interface QuickStats {
  total_files: number;
  total_qa_interactions: number;
  monthly_files: number;
  monthly_qa_interactions: number;
  usage_percentages: {
    file_storage_mb: number;
    rules_used: number;
    openai_tokens: number;
    synthetic_rows: number;
    custom_lists: number;
  };
  last_updated: string;
}

const Home = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch main dashboard data
      const dashboardResponse = await ApiService2.get<DashboardData>('/dashboard/dashboard');
      setDashboardData(dashboardResponse.data);

      // Fetch quick stats
      const quickStatsResponse = await ApiService2.get<QuickStats>('/dashboard/dashboard/quick-stats');
      setQuickStats(quickStatsResponse.data);

    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      const parsedError = parseBackendError(error);
      setError(parsedError.message);
      
      toast.push(
        <Notification title={parsedError.title} type="danger">
          {parsedError.message}
        </Notification>
      );
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (sizeInMB: number) => {
    if (sizeInMB < 1) {
      return `${(sizeInMB * 1024).toFixed(1)} KB`;
    }
    return `${sizeInMB.toFixed(2)} MB`;
  };

  const formatPercentage = (percentage: number) => {
    if (percentage >= 1) {
      // For percentages >= 1%, show 1 decimal place
      return percentage.toFixed(1);
    } else if (percentage >= 0.01) {
      // For percentages >= 0.01%, show 2 decimal places
      return percentage.toFixed(2);
    } else if (percentage > 0) {
      // For very small percentages, show "< 0.01%"
      return '< 0.01';
    }
    // For zero
    return '0';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getUsageBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </Container>
    );
  }

  if (error || !dashboardData || !quickStats) {
    return (
      <Container>
        <div className="text-center py-12">
          <HiExclamationCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Dashboard</h3>
          <p className="text-gray-600 mb-4">{error || 'Unable to load dashboard data'}</p>
          <Button onClick={fetchDashboardData} variant="solid">
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
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Welcome back, {dashboardData.user_profile?.username || 'User'}!</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-sm text-gray-500">
              Last updated: {dashboardData.generated_at ? formatDate(dashboardData.generated_at) : 'Unknown'}
            </div>
            {/* <Button 
              size="sm" 
              variant="default" 
              onClick={fetchDashboardData}
              loading={loading}
            >
              <HiCog className="w-4 h-4 mr-1" />
              Refresh
            </Button> */}
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Files</p>
                <p className="text-2xl font-bold text-gray-900">{quickStats.total_files}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <HiArrowUp className="w-3 h-3 mr-1" />
                  {quickStats.monthly_files} this month
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <HiDocumentText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">AI Interactions</p>
                <p className="text-2xl font-bold text-gray-900">{quickStats.total_qa_interactions}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <HiArrowUp className="w-3 h-3 mr-1" />
                  {quickStats.monthly_qa_interactions} this month
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <HiLightningBolt className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Storage Used</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatFileSize(dashboardData.usage_summary?.current_month?.file_storage_mb || 0)}
                </p>
                <p className={`text-xs flex items-center mt-1 whitespace-nowrap ${getUsageColor(dashboardData.usage_summary?.percentages?.file_storage_mb || 0)}`}>
                  {formatPercentage(dashboardData.usage_summary?.percentages?.file_storage_mb || 0)}% of limit
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <HiDatabase className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Plan Status</p>
                <p className="text-lg font-bold text-gray-900">{dashboardData.plan_info?.plan_name || 'Unknown'}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {dashboardData.plan_info?.has_active_plan ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <HiStar className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Usage Overview */}
        <Card header="Usage Overview" headerBorder>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Current Usage</h3>
              
              {/* Storage Usage */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">File Storage</span>
                  <span className="text-sm text-gray-500">
                    {formatFileSize(dashboardData.usage_summary?.current_month?.file_storage_mb || 0)} / {formatFileSize(dashboardData.usage_summary?.limits?.file_storage_mb || 0)}
                  </span>
                </div>
                <Progress 
                  percent={dashboardData.usage_summary?.percentages?.file_storage_mb || 0}
                  customInfo={`${formatPercentage(dashboardData.usage_summary?.percentages?.file_storage_mb || 0)}%`}
                  color={(dashboardData.usage_summary?.percentages?.file_storage_mb || 0) > 90 ? 'red' : (dashboardData.usage_summary?.percentages?.file_storage_mb || 0) > 70 ? 'yellow' : 'green'}
                />
              </div>

              {/* AI Tokens */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">AI Tokens</span>
                  <span className="text-sm text-gray-500">
                    {(dashboardData.activity_summary?.current_month?.tokens_used || 0).toLocaleString()} / {(dashboardData.usage_summary?.limits?.openai_tokens || 0).toLocaleString()}
                  </span>
                </div>
                <Progress 
                  percent={dashboardData.usage_summary?.percentages?.openai_tokens || 0}
                  customInfo={`${formatPercentage(dashboardData.usage_summary?.percentages?.openai_tokens || 0)}%`}
                  color={(dashboardData.usage_summary?.percentages?.openai_tokens || 0) > 90 ? 'red' : (dashboardData.usage_summary?.percentages?.openai_tokens || 0) > 70 ? 'yellow' : 'green'}
                />
              </div>

              {/* Rules Used */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Rules Used</span>
                  <span className="text-sm text-gray-500">
                    {dashboardData.usage_summary?.current_month?.rules_used || 0} / {dashboardData.usage_summary?.limits?.rules_used || 0}
                  </span>
                </div>
                <Progress 
                  percent={dashboardData.usage_summary?.percentages?.rules_used || 0}
                  customInfo={`${formatPercentage(dashboardData.usage_summary?.percentages?.rules_used || 0)}%`}
                  color={(dashboardData.usage_summary?.percentages?.rules_used || 0) > 90 ? 'red' : (dashboardData.usage_summary?.percentages?.rules_used || 0) > 70 ? 'yellow' : 'green'}
                />
              </div>

              {/* Synthetic Rows */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Synthetic Rows</span>
                  <span className="text-sm text-gray-500">
                    {(dashboardData.usage_summary?.current_month?.synthetic_rows || 0).toLocaleString()} / {(dashboardData.usage_summary?.limits?.synthetic_rows || 0).toLocaleString()}
                  </span>
                </div>
                <Progress 
                  percent={dashboardData.usage_summary?.percentages?.synthetic_rows || 0}
                  customInfo={`${formatPercentage(dashboardData.usage_summary?.percentages?.synthetic_rows || 0)}%`}
                  color={(dashboardData.usage_summary?.percentages?.synthetic_rows || 0) > 90 ? 'red' : (dashboardData.usage_summary?.percentages?.synthetic_rows || 0) > 70 ? 'yellow' : 'green'}
                />
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Plan Features</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <HiDatabase className="w-5 h-5 text-blue-600 mr-3" />
                    <span className="text-sm font-medium">Storage Limit</span>
                  </div>
                  <span className="text-sm font-semibold">{dashboardData.plan_info?.features?.storage_limit_gb || 0} GB</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <HiLightningBolt className="w-5 h-5 text-purple-600 mr-3" />
                    <span className="text-sm font-medium">AI Tokens/Month</span>
                  </div>
                  <span className="text-sm font-semibold">{(dashboardData.plan_info?.features?.ai_tokens_per_month || 0).toLocaleString()}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <HiChartBar className="w-5 h-5 text-green-600 mr-3" />
                    <span className="text-sm font-medium">Synthetic Rows/Month</span>
                  </div>
                  <span className="text-sm font-semibold">{(dashboardData.plan_info?.features?.synthetic_rows_per_month || 0).toLocaleString()}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <HiCog className="w-5 h-5 text-yellow-600 mr-3" />
                    <span className="text-sm font-medium">Rules Limit</span>
                  </div>
                  <span className="text-sm font-semibold">{dashboardData.plan_info?.features?.rules_limit || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* File Statistics and Recent Files */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card header="File Statistics" headerBorder>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{dashboardData.file_statistics?.total_files || 0}</p>
                <p className="text-sm text-gray-600">Total Files</p>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-sm font-medium">CSV Files</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{dashboardData.file_statistics.by_type?.csv?.count || 0}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(dashboardData.file_statistics.by_type?.csv?.total_size_mb || 0)}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm font-medium">Excel Files</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{dashboardData.file_statistics.by_type?.excel?.count || 0}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(dashboardData.file_statistics.by_type?.excel?.total_size_mb || 0)}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                    <span className="text-sm font-medium">JSON Files</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{dashboardData.file_statistics.by_type?.json?.count || 0}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(dashboardData.file_statistics.by_type?.json?.total_size_mb || 0)}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card header="Recent Files" headerBorder>
            <div className="space-y-3">
              {(dashboardData.recent_files || []).slice(0, 5).map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 ${
                      file.type === 'csv' ? 'bg-blue-100' : 
                      file.type === 'excel' ? 'bg-green-100' : 'bg-purple-100'
                    }`}>
                      <HiDocumentText className={`w-4 h-4 ${
                        file.type === 'csv' ? 'text-blue-600' : 
                        file.type === 'excel' ? 'text-green-600' : 'text-purple-600'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatDate(file.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{formatFileSize(file.size_mb)}</p>
                    <div className="flex items-center">
                      {file.exists ? (
                        <HiCheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <HiExclamationCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* AI Statistics and Recent Interactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card header="AI Statistics" headerBorder>
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-gray-900">{dashboardData.ai_statistics?.total_interactions || 0}</p>
                <p className="text-sm text-gray-600">Total Interactions</p>
              </div>
              
              <div className="space-y-3">
                {Object.entries(dashboardData.ai_statistics?.by_model || {}).map(([model, stats]) => (
                  <div key={model} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-900">{model}</span>
                      <span className="text-sm text-gray-500">{(stats.count || 0)} interactions</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                      <div>
                        <p>Tokens: {(stats.total_tokens || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p>Avg Time: {(stats.avg_processing_time || 0).toFixed(1)}s</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card header="Recent AI Interactions" headerBorder>
            <div className="space-y-3">
              {(dashboardData.recent_qa_interactions || []).slice(0, 5).map((interaction) => (
                <div key={interaction.id} className="p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 flex-1 mr-2">
                      {interaction.question}
                    </p>
                    <div className="flex items-center">
                      {interaction.feedback_score !== null ? (
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <HiStar 
                              key={i} 
                              className={`w-3 h-3 ${
                                i < interaction.feedback_score! ? 'text-yellow-400' : 'text-gray-300'
                              }`} 
                            />
                          ))}
                        </div>
                      ) : (
                        <HiInformationCircle className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{interaction.model}</span>
                    <span>{(interaction.tokens_used || 0).toLocaleString()} tokens</span>
                    <span>{formatDate(interaction.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Activity Summary */}
        <Card header="Activity Summary" headerBorder>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <HiLightningBolt className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{dashboardData.activity_summary?.current_month?.qa_interactions || 0}</p>
              <p className="text-sm text-gray-600">AI Interactions</p>
              <div className="flex items-center justify-center mt-2">
                {(dashboardData.activity_summary?.growth_percentages?.qa_interactions || 0) > 0 ? (
                  <HiTrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <HiTrendingDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-xs ${
                  (dashboardData.activity_summary?.growth_percentages?.qa_interactions || 0) > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {dashboardData.activity_summary?.growth_percentages?.qa_interactions || 0}%
                </span>
              </div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <HiDocumentText className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{dashboardData.activity_summary?.current_month?.files_uploaded || 0}</p>
              <p className="text-sm text-gray-600">Files Uploaded</p>
              <div className="flex items-center justify-center mt-2">
                {(dashboardData.activity_summary?.growth_percentages?.files_uploaded || 0) > 0 ? (
                  <HiTrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <HiTrendingDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-xs ${
                  (dashboardData.activity_summary?.growth_percentages?.files_uploaded || 0) > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {dashboardData.activity_summary?.growth_percentages?.files_uploaded || 0}%
                </span>
              </div>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <HiChartBar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{(dashboardData.activity_summary?.current_month?.tokens_used || 0).toLocaleString()}</p>
              <p className="text-sm text-gray-600">Tokens Used</p>
              <div className="flex items-center justify-center mt-2">
                {(dashboardData.activity_summary?.growth_percentages?.tokens_used || 0) > 0 ? (
                  <HiTrendingUp className="w-4 h-4 text-green-500 mr-1" />
                ) : (
                  <HiTrendingDown className="w-4 h-4 text-red-500 mr-1" />
                )}
                <span className={`text-xs ${
                  (dashboardData.activity_summary?.growth_percentages?.tokens_used || 0) > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {dashboardData.activity_summary?.growth_percentages?.tokens_used || 0}%
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* System Status */}
        <Card header="System Status" headerBorder>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                dashboardData.system_status?.database_connected ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              <div>
                <p className="text-sm font-medium text-gray-900">Database Connection</p>
                <p className="text-xs text-gray-500">
                  {dashboardData.system_status?.database_connected ? 'Connected' : 'Disconnected'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">API Version {dashboardData.system_status?.api_version || 'Unknown'}</p>
              <p className="text-xs text-gray-500">
                Last updated: {dashboardData.system_status?.last_updated ? formatDate(dashboardData.system_status.last_updated) : 'Unknown'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </Container>
  );
};

export default Home;
