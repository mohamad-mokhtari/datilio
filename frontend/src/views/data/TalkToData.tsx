/**
 * TalkToData Component
 * 
 * OpenAI Models Reference:
 * - Official Models Documentation: https://platform.openai.com/docs/models
 * - Model Pricing: https://platform.openai.com/pricing
 * - Latest Models (2024): GPT-4o, GPT-4o-mini, o1-preview, o1-mini, GPT-4.1 series
 * 
 * MVP Configuration: GPT-3.5-turbo and GPT-4o-mini are active for cost efficiency
 */

import React, { useState, useEffect, useRef } from 'react';
import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import ApiService2 from '@/services/ApiService2';
import Container from '@/components/shared/Container';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useAppSelector, useAppDispatch } from '@/store/hook';
import { DataFile, fetchUserFiles } from '@/store/slices/lists/listsSlice';
import { HiOutlinePaperAirplane } from 'react-icons/hi';
import { HiOutlineChatBubbleLeft, HiOutlineArrowUp } from 'react-icons/hi2';
import { HiOutlineDocumentText, HiOutlineCpuChip } from 'react-icons/hi2';
import toast from '@/components/ui/toast';
import Notification from '@/components/ui/Notification';
import { parseBackendError } from '@/utils/errorParser';

interface QAHistory {
  id: string;
  question: string;
  answer: string;
  created_at: string;
  feedback_score: number | null;
  feedback_comment: string | null;
}

/**
 * Detects if text contains RTL (Right-to-Left) characters
 * Supports Arabic, Hebrew, Persian/Farsi, Urdu, and other RTL scripts
 */
const isRTLText = (text: string): boolean => {
  // RTL Unicode ranges:
  // Arabic: \u0600-\u06FF
  // Hebrew: \u0590-\u05FF
  // Arabic Supplement: \u0750-\u077F
  // Arabic Extended-A: \u08A0-\u08FF
  // Arabic Presentation Forms: \uFB50-\uFDFF, \uFE70-\uFEFF
  const rtlRegex = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return rtlRegex.test(text);
}

const AVAILABLE_MODELS = [
  // Active for MVP
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and efficient', active: true },
  
  // Economy models - active for MVP
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Cost-effective GPT-4o variant', active: true },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Optimized for speed and efficiency', active: false },
  
  // Advanced models - deactivated for MVP
  { id: 'gpt-4', name: 'GPT-4', description: 'Most capable model', active: false },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Latest and most advanced', active: false },
  { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Enhanced coding capabilities', active: false },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Faster coding model', active: false },
  
  // Reasoning models - deactivated for MVP
  { id: 'o1-preview', name: 'o1-preview', description: 'Advanced reasoning model', active: false },
  { id: 'o1-mini', name: 'o1-mini', description: 'Cost-effective reasoning', active: false },
];

const TalkToData: React.FC = () => {
  const dispatch = useAppDispatch();
  const [selectedFile, setSelectedFile] = useState<DataFile | null>(null);
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS.find(m => m.active) || AVAILABLE_MODELS[0]);
  const [question, setQuestion] = useState('');
  const [qaHistory, setQAHistory] = useState<QAHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use Redux state for files
  const { 
    userFiles,
    loading: loadingFiles, 
    error 
  } = useAppSelector((state) => state.lists.lists);

  // Fetch files on component mount
  useEffect(() => {
    dispatch(fetchUserFiles());
  }, [dispatch]);

  // Show error notification when file loading fails
  useEffect(() => {
    if (error) {
      toast.push(
        <Notification title="Error Loading Files" type="danger">
          {error}
        </Notification>
      );
    }
  }, [error]);

  // Fetch QA history when file is selected
  useEffect(() => {
    if (selectedFile) {
      setQAHistory([]); // Clear existing history
      setPage(0); // Reset page
      fetchQAHistory(); // Fetch new history
    }
  }, [selectedFile]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [qaHistory]);

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      setPage(prev => prev + 1);
      fetchQAHistory();
    }
  };

  const fetchQAHistory = async () => {
    if (!selectedFile) return;
    
    try {
      setLoading(true);
      const response = await ApiService2.get<{
        total: number;
        skip: number;
        limit: number;
        items: QAHistory[];
      }>(`/llm/qa-history?skip=${page * 2}&limit=2&file_id=${selectedFile.file_id}`);

      if (response.ok) {
        // Sort items by created_at in ascending order (oldest first)
        const sortedItems = response.data.items.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        // Store current scroll position and height
        const chatContainer = chatContainerRef.current;
        const oldScrollHeight = chatContainer?.scrollHeight || 0;
        const oldScrollTop = chatContainer?.scrollTop || 0;
        
        // Filter out any duplicates before adding new items
        setQAHistory(prev => {
          const existingIds = new Set(prev.map(item => item.id));
          const newItems = sortedItems.filter(item => !existingIds.has(item.id));
          // Only add new items if we have any
          return newItems.length > 0 ? [...newItems, ...prev] : prev;
        });
        
        // Maintain exact scroll position after state update
        requestAnimationFrame(() => {
          if (chatContainer) {
            const newScrollHeight = chatContainer.scrollHeight;
            const heightDifference = newScrollHeight - oldScrollHeight;
            chatContainer.scrollTop = oldScrollTop + heightDifference;
          }
        });

        // Only set hasMore if we got new items
        setHasMore(sortedItems.length === 2);
      } else {
        throw new Error(`Failed to fetch QA history: ${response.status} - ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('Error fetching QA history:', error);
      
      // Parse error using the utility function
      const parsedError = parseBackendError(error);
      
      toast.push(
        <Notification title={parsedError.title} type="danger">
          {parsedError.message}
        </Notification>
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !selectedFile) return;

    setLoading(true);
    try {
      const response = await ApiService2.post<{
        answer: string;
        qa_id: string;
      }>('/llm/ask-file', {
        file_id: selectedFile.file_id,
        question: question,
        model: selectedModel.id
      });

      if (response.ok) {
        setQAHistory(prev => [...prev, {
          id: response.data.qa_id,
          question: question,
          answer: response.data.answer,
          created_at: new Date().toISOString(),
          feedback_score: null,
          feedback_comment: null
        }]);

        setQuestion('');
        if (inputRef.current) {
          inputRef.current.style.height = 'auto';
        }
        
        // Show success notification
        toast.push(
          <Notification title="Question Submitted" type="success">
            Your question has been processed successfully.
          </Notification>
        );
      } else {
        throw new Error(`Failed to submit question: ${response.status} - ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('Error asking question:', error);
      
      // Parse error using the utility function
      const parsedError = parseBackendError(error);
      
      toast.push(
        <Notification title={parsedError.title} type="danger">
          {parsedError.message}
        </Notification>
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (qaId: string, score: number) => {
    try {
      const response = await ApiService2.put(`/llm/qa/${qaId}/feedback`, {
        feedback_score: score,
        feedback_comment: qaHistory.find(qa => qa.id === qaId)?.feedback_comment || ''
      });

      if (response.ok) {
        setQAHistory(prev =>
          prev.map(qa =>
            qa.id === qaId ? { ...qa, feedback_score: score } : qa
          )
        );
        
        // Show success notification
        toast.push(
          <Notification title="Feedback Submitted" type="success">
            Thank you for your feedback!
          </Notification>
        );
      } else {
        throw new Error(`Failed to submit feedback: ${response.status} - ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      
      // Parse error using the utility function
      const parsedError = parseBackendError(error);
      
      toast.push(
        <Notification title={parsedError.title} type="danger">
          {parsedError.message}
        </Notification>
      );
    }
  };

  const handleCommentSubmit = async (qaId: string) => {
    try {
      const response = await ApiService2.put(`/llm/qa/${qaId}/feedback`, {
        feedback_score: qaHistory.find(qa => qa.id === qaId)?.feedback_score || 0,
        feedback_comment: commentText
      });

      if (response.ok) {
        setQAHistory(prev =>
          prev.map(qa =>
            qa.id === qaId ? { ...qa, feedback_comment: commentText } : qa
          )
        );
        setEditingCommentId(null);
        setCommentText('');
        
        // Show success notification
        toast.push(
          <Notification title="Comment Saved" type="success">
            Your comment has been saved successfully.
          </Notification>
        );
      } else {
        throw new Error(`Failed to submit comment: ${response.status} - ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('Error submitting comment:', error);
      
      // Parse error using the utility function
      const parsedError = parseBackendError(error);
      
      toast.push(
        <Notification title={parsedError.title} type="danger">
          {parsedError.message}
        </Notification>
      );
    }
  };

  const startEditingComment = (qaId: string, currentComment: string | null) => {
    setEditingCommentId(qaId);
    setCommentText(currentComment || '');
    // Focus the comment input after it's rendered
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 0);
  };

  const handleTextareaResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
    setQuestion(textarea.value);
  };

  // Initial load effect
  useEffect(() => {
    if (selectedFile && qaHistory.length === 0) {
      fetchQAHistory();
    }
  }, [selectedFile]);

  return (
    <Container>
      <Card>
        <div className="flex flex-col h-[calc(100vh-200px)]">
          {/* Selection Area */}
          <div className="p-4 border-b bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* File Selection */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select File
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <HiOutlineDocumentText className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={selectedFile?.file_id || ''}
                    onChange={(e) => {
                      const file = userFiles.find(f => f.file_id === e.target.value);
                      setSelectedFile(file || null);
                      setQAHistory([]);
                      setPage(0);
                    }}
                    className="block w-full pl-10 pr-3 py-2 text-base border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    disabled={loadingFiles}
                  >
                    <option value="">{loadingFiles ? 'Loading files...' : 'Choose a file...'}</option>
                    {userFiles.map((file) => (
                      <option key={file.file_id} value={file.file_id}>
                        {file.file_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Model Selection */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Model
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <HiOutlineCpuChip className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    value={selectedModel.id}
                    onChange={(e) => {
                      const model = AVAILABLE_MODELS.find(m => m.id === e.target.value);
                      if (model) setSelectedModel(model);
                    }}
                    className="block w-full pl-10 pr-3 py-2 text-base border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    {AVAILABLE_MODELS.filter(model => model.active).map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} - {model.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            {/* Error Display */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Error Loading Files
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chat Container */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {/* Load More Button - Fixed at the top */}
            {hasMore && (
              <div className="sticky top-0 z-10 bg-white py-2 -mt-2 -mx-4 px-4 border-b">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  ) : (
                    <HiOutlineArrowUp className="h-4 w-4" />
                  )}
                  <span>{loading ? 'Loading...' : 'Load More'}</span>
                </button>
              </div>
            )}

            {/* Messages */}
            <div className="space-y-4">
              {qaHistory.map((qa) => {
                const isRTL = isRTLText(qa.question);
                const directionClass = isRTL ? 'rtl' : 'ltr';
                const alignmentClass = isRTL ? 'text-right' : 'text-left';
                const flexDirection = isRTL ? 'flex-row-reverse' : 'flex-row';
                const spacingClass = isRTL ? 'space-x-reverse' : '';
                
                return (
                  <div key={qa.id} className="space-y-4">
                    {/* Question */}
                    <div className={`flex items-start space-x-4 ${flexDirection} ${spacingClass}`}>
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium">Q</span>
                      </div>
                      <div className="flex-1">
                        <p className={`text-gray-900 ${alignmentClass}`} dir={directionClass}>
                          {qa.question}
                        </p>
                      </div>
                    </div>

                    {/* Answer */}
                    <div className={`flex items-start space-x-4 ${flexDirection} ${spacingClass}`}>
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-indigo-600">A</span>
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className={`text-gray-900 whitespace-pre-wrap font-medium ${alignmentClass}`} dir={directionClass}>
                            {qa.answer}
                          </p>
                        <div className={`mt-2 flex items-center space-x-1 ${isRTL ? 'flex-row-reverse space-x-reverse' : ''}`}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => handleFeedback(qa.id, star)}
                              className="focus:outline-none"
                            >
                              {qa.feedback_score && star <= qa.feedback_score ? (
                                <StarIcon className="h-5 w-5 text-yellow-400" />
                              ) : (
                                <StarOutlineIcon className="h-5 w-5 text-gray-300" />
                              )}
                            </button>
                          ))}
                          <button
                            onClick={() => startEditingComment(qa.id, qa.feedback_comment)}
                            className={`${isRTL ? 'mr-2' : 'ml-2'} text-gray-400 hover:text-gray-600 focus:outline-none`}
                          >
                            <HiOutlineChatBubbleLeft className="h-5 w-5" />
                          </button>
                        </div>
                        {editingCommentId === qa.id ? (
                          <div className="mt-2">
                            <textarea
                              ref={commentInputRef}
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              placeholder={isRTL ? "افزودن نظر..." : "Add a comment..."}
                              className={`w-full p-2 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none ${alignmentClass}`}
                              dir={directionClass}
                              rows={2}
                            />
                            <div className={`mt-1 flex ${isRTL ? 'justify-start space-x-reverse' : 'justify-end'} space-x-2`}>
                              <button
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setCommentText('');
                                }}
                                className="text-sm text-gray-500 hover:text-gray-700"
                              >
                                {isRTL ? 'لغو' : 'Cancel'}
                              </button>
                              <button
                                onClick={() => handleCommentSubmit(qa.id)}
                                className="text-sm text-indigo-600 hover:text-indigo-700"
                              >
                                {isRTL ? 'ذخیره' : 'Save'}
                              </button>
                            </div>
                          </div>
                        ) : qa.feedback_comment ? (
                          <p className={`mt-2 text-sm text-gray-500 italic ${alignmentClass}`} dir={directionClass}>
                            "{qa.feedback_comment}"
                          </p>
                        ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Invisible element for auto-scrolling */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t">
            <form onSubmit={handleSubmit} className="flex items-end space-x-2">
              <textarea
                ref={inputRef}
                value={question}
                onChange={handleTextareaResize}
                placeholder="Ask a question about your data..."
                className="flex-1 p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none min-h-[44px] max-h-[200px]"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                disabled={loading}
              />
              <Button
                type="submit"
                disabled={loading || !selectedFile || !question.trim()}
                icon={loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <HiOutlinePaperAirplane />
                )}
                variant="solid"
                className="h-[44px] min-w-[44px]"
              >
                {loading ? 'Sending...' : ''}
              </Button>
            </form>
          </div>
        </div>
      </Card>
    </Container>
  );
};

export default TalkToData; 