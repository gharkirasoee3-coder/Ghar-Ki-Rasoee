import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ENV } from '../../config/env.config';
import { useAuth } from '../../context/AuthContext';
import { 
  ShoppingBag, 
  Calendar, 
  XCircle,
  Clock,
  Utensils
} from 'lucide-react';

interface ActivityMetadata {
  orderId?: string;
  plan?: string;
  date?: string;
  totalItems?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface Activity {
  activityId: string;
  userId: string;
  type: 'order' | 'subscription' | 'skip' | 'customization' | 'cancel';
  action: string;
  description: string;
  metadata: ActivityMetadata;
  createdAt: string;
}

const ActivityTimeline: React.FC = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        if (!user) return;
        const token = await user.getIdToken();
        const res = await axios.get(`${ENV.API_URL}/activities`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setActivities(res.data.data || []);
      } catch (error) {
        console.error("Failed to fetch activities", error);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [user]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <ShoppingBag className="text-blue-600" size={20} />;
      case 'subscription':
        return <Calendar className="text-green-600" size={20} />;
      case 'skip':
        return <XCircle className="text-yellow-600" size={20} />;
      case 'customization':
        return <Utensils className="text-purple-600" size={20} />;
      case 'cancel':
        return <XCircle className="text-red-600" size={20} />;
      default:
        return <Clock className="text-gray-600" size={20} />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'order':
        return 'border-blue-200 bg-blue-50';
      case 'subscription':
        return 'border-green-200 bg-green-50';
      case 'skip':
        return 'border-yellow-200 bg-yellow-50';
      case 'customization':
        return 'border-purple-200 bg-purple-50';
      case 'cancel':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-text-secondary">Loading activity history...</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-20 bg-gray-50 rounded-card">
        <Clock className="mx-auto text-gray-300 mb-4" size={48} />
        <h3 className="text-lg font-semibold text-text-primary mb-2">No Activity Yet</h3>
        <p className="text-text-secondary">Your activity history will appear here as you use the platform.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity.activityId}
          className={`border-l-4 ${getActivityColor(activity.type)} p-5 rounded-r-lg shadow-sm hover:shadow-md transition`}
        >
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-text-primary capitalize">
                    {activity.type} • {activity.action}
                  </h4>
                  <p className="text-sm text-text-secondary mt-1">{activity.description}</p>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                  {new Date(activity.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              {/* Metadata Display */}
              {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                <div className="mt-3 text-xs text-gray-600 bg-white/50 rounded p-2">
                  {activity.metadata.orderId && (
                    <p>Order ID: {activity.metadata.orderId.substring(0, 8)}...</p>
                  )}
                  {activity.metadata.plan && (
                    <p>Plan: {activity.metadata.plan}</p>
                  )}
                  {activity.metadata.date && (
                    <p>Date: {new Date(activity.metadata.date).toLocaleDateString()}</p>
                  )}
                  {activity.metadata.totalItems && (
                    <p>Items: {activity.metadata.totalItems}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityTimeline;
