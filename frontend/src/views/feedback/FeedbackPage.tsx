import { useState, useEffect, useMemo } from 'react';
import Container from '@/components/shared/Container';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Table from '@/components/ui/Table';
import Dialog from '@/components/ui/Dialog';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import FeedbackService from '@/services/FeedbackService';
import type { Feedback, FeedbackFilters, FeedbackStatus, FeedbackType } from '@/@types/feedback';
import { HiOutlinePlus, HiOutlineEye, HiOutlineChat, HiOutlineX, HiOutlineCheck } from 'react-icons/hi';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { CreateFeedbackModal, FeedbackDetailModal } from '@/components/feedback';
import { formatDistanceToNow } from 'date-fns';

const { Tr, Th, Td, THead, TBody } = Table;

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
];

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'general', label: 'General' },
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'ui', label: 'UI' },
  { value: 'performance', label: 'Performance' },
  { value: 'other', label: 'Other' },
];

const FeedbackPage = () => {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Filters
  const [filters, setFilters] = useState<FeedbackFilters>({
    page: 1,
    page_size: 20,
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Memoized sorted feedbacks
  const sortedFeedbacks = useMemo(() => {
    return [...feedbacks].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      
      return sortOrder === 'desc' 
        ? dateB - dateA // Newest first
        : dateA - dateB; // Oldest first
    });
  }, [feedbacks, sortOrder]);

  const fetchFeedbacks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await FeedbackService.getFeedbackList(filters);
      setFeedbacks(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch feedbacks');
      toast.push(
        <Notification title="Error" type="danger">
          {error}
        </Notification>
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, [filters]);

  const handleCreateFeedback = async () => {
    await fetchFeedbacks();
    setIsCreateModalOpen(false);
  };

  const handleViewFeedback = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedFeedback(null);
    fetchFeedbacks(); // Refresh the list in case status changed
  };

  const handleFilterChange = (key: keyof FeedbackFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handleSearch = () => {
    handleFilterChange('search', searchTerm || undefined);
  };

  const getStatusBadge = (status: FeedbackStatus) => {
    const statusConfig = {
      open: {
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        icon: '●',
        label: 'Open'
      },
      closed: {
        className: 'bg-gray-50 text-gray-600 border border-gray-200',
        icon: '●',
        label: 'Closed'
      }
    };

    const config = statusConfig[status];
    return (
      <Badge className={`${config.className} flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium`}>
        <span className="text-xs">{config.icon}</span>
        {config.label}
      </Badge>
    );
  };

  const getTypeBadge = (type: FeedbackType) => {
    const typeConfig: Record<FeedbackType, { className: string; icon: string; label: string }> = {
      general: {
        className: 'bg-blue-50 text-blue-700 border border-blue-200',
        icon: '💬',
        label: 'General'
      },
      bug: {
        className: 'bg-red-50 text-red-700 border border-red-200',
        icon: '🐛',
        label: 'Bug'
      },
      feature: {
        className: 'bg-purple-50 text-purple-700 border border-purple-200',
        icon: '✨',
        label: 'Feature'
      },
      ui: {
        className: 'bg-amber-50 text-amber-700 border border-amber-200',
        icon: '🎨',
        label: 'UI/UX'
      },
      performance: {
        className: 'bg-orange-50 text-orange-700 border border-orange-200',
        icon: '⚡',
        label: 'Performance'
      },
      other: {
        className: 'bg-gray-50 text-gray-600 border border-gray-200',
        icon: '📝',
        label: 'Other'
      },
    };

    const config = typeConfig[type];
    return (
      <Badge className={`${config.className} flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium`}>
        <span className="text-xs">{config.icon}</span>
        {config.label}
      </Badge>
    );
  };

  return (
    <Container>
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Feedback</h3>
            <p className="text-gray-600">Manage user feedback and support requests</p>
          </div>
          <Button
            variant="solid"
            size="sm"
            icon={<HiOutlinePlus />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            New Feedback
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-col sm:flex-row gap-4 p-4">
            <div className="flex-1">
              <Input
                placeholder="Search feedback..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex gap-2">
              <Select
                placeholder="Status"
                value={statusOptions.find(opt => opt.value === filters.status) || null}
                onChange={(option) => handleFilterChange('status', option?.value || undefined)}
                options={statusOptions}
                className="min-w-32"
              />
              <Select
                placeholder="Type"
                value={typeOptions.find(opt => opt.value === filters.feedback_type) || null}
                onChange={(option) => handleFilterChange('feedback_type', option?.value || undefined)}
                options={typeOptions}
                className="min-w-32"
              />
              <Button variant="plain" onClick={handleSearch}>
                Search
              </Button>
            </div>
          </div>
        </Card>

        {/* Feedback List */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <Tr>
                  <Th>Title</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                  <Th>User</Th>
                  <Th>Messages</Th>
                  <Th>
                    <button 
                      onClick={toggleSortOrder}
                      className="flex items-center gap-1 hover:text-blue-600 transition-colors cursor-pointer"
                      title={`Sort by date (${sortOrder === 'desc' ? 'newest first' : 'oldest first'})`}
                    >
                      <span>Created</span>
                      {sortOrder === 'desc' ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </button>
                  </Th>
                  <Th>Actions</Th>
                </Tr>
              </THead>
              <TBody>
                {loading ? (
                  <Tr>
                    <Td colSpan={7} className="text-center py-8">
                      Loading...
                    </Td>
                  </Tr>
                ) : sortedFeedbacks.length === 0 ? (
                  <Tr>
                    <Td colSpan={7} className="text-center py-8 text-gray-500">
                      No feedback found
                    </Td>
                  </Tr>
                ) : (
                  sortedFeedbacks.map((feedback) => (
                    <Tr key={feedback.id}>
                      <Td>
                        <div>
                          <div className="font-medium text-gray-900 truncate max-w-xs">
                            {feedback.title}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {feedback.message}
                          </div>
                        </div>
                      </Td>
                      <Td>{getTypeBadge(feedback.feedback_type)}</Td>
                      <Td>{getStatusBadge(feedback.status)}</Td>
                      <Td className="text-sm text-gray-600">{feedback.user_email}</Td>
                      <Td>
                        <div className="flex items-center gap-1">
                          <HiOutlineChat className="w-4 h-4" />
                          <span className="text-sm">{feedback.message_count}</span>
                        </div>
                      </Td>
                      <Td className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(feedback.created_at), { addSuffix: true })}
                      </Td>
                      <Td>
                        <div className="flex gap-2">
                          <Button
                            variant="plain"
                            size="xs"
                            icon={<HiOutlineEye />}
                            onClick={() => handleViewFeedback(feedback)}
                          >
                            View
                          </Button>
                        </div>
                      </Td>
                    </Tr>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        </Card>

        {/* Modals */}
        <CreateFeedbackModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleCreateFeedback}
        />

        <FeedbackDetailModal
          feedback={selectedFeedback}
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
        />
      </div>
    </Container>
  );
};

export default FeedbackPage;
