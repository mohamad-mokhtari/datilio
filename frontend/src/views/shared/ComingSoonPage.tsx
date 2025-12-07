import React from 'react';
import { Card } from '@/components/ui';
import { Sparkles, Clock, Rocket } from 'lucide-react';

interface ComingSoonPageProps {
  featureName?: string;
  description?: string;
}

const ComingSoonPage: React.FC<ComingSoonPageProps> = ({ 
  featureName = 'This Feature',
  description = 'We are working hard to bring you this amazing feature. Stay tuned!'
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <Card className="max-w-2xl w-full p-8 md:p-12 text-center">
        <div className="flex flex-col items-center space-y-6">
          {/* Icon */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-2xl opacity-50 animate-pulse"></div>
            <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-full">
              <Sparkles className="w-16 h-16 text-white" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3">
              Coming Soon
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold text-gray-700 dark:text-gray-300 mb-4">
              {featureName}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              {description}
            </p>
          </div>

          {/* Features List */}
          <div className="w-full mt-8 space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Rocket className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Exciting Features Ahead
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  We're building something amazing that will enhance your workflow and productivity.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Stay Updated
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This feature will be available in the next update. We'll notify you as soon as it's ready!
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ComingSoonPage;

