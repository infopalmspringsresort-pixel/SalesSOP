import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Mail, 
  Download, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  User,
  Calendar
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface QuotationHistoryProps {
  enquiryId: string;
}

interface QuotationActivity {
  id: string;
  type: 'created' | 'sent' | 'viewed' | 'downloaded' | 'accepted' | 'rejected' | 'expired' | 'reminder_sent' | 'discount_approval_pending' | 'discount_approved' | 'discount_rejected';
  timestamp: string;
  user?: {
    name: string;
    email: string;
  };
  details?: {
    emailRecipient?: string;
    downloadCount?: number;
    viewCount?: number;
    reminderCount?: number;
    discountAmount?: number;
    discountReason?: string;
  };
  metadata?: Record<string, any>;
  quotation?: {
    discountApprovalStatus?: string;
    discountAmount?: number;
    discountReason?: string;
  };
}

export default function QuotationHistory({ enquiryId }: QuotationHistoryProps) {
  const { data: activities = [], isLoading } = useQuery<QuotationActivity[]>({
    queryKey: [`/api/quotations/activities/${enquiryId}`],
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <FileText className="w-4 h-4 text-blue-600" />;
      case 'sent':
        return <Mail className="w-4 h-4 text-green-600" />;
      case 'viewed':
        return <Eye className="w-4 h-4 text-purple-600" />;
      case 'downloaded':
        return <Download className="w-4 h-4 text-orange-600" />;
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'expired':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'reminder_sent':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'discount_approval_pending':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'discount_approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'discount_rejected':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActivityTitle = (type: string) => {
    switch (type) {
      case 'created':
        return 'Quotation Created';
      case 'sent':
        return 'Quotation Sent';
      case 'viewed':
        return 'Quotation Viewed';
      case 'downloaded':
        return 'PDF Downloaded';
      case 'accepted':
        return 'Quotation Accepted';
      case 'rejected':
        return 'Quotation Rejected';
      case 'expired':
        return 'Quotation Expired';
      case 'reminder_sent':
        return 'Reminder Sent';
      case 'discount_approval_pending':
        return 'Discount Approval Pending';
      case 'discount_approved':
        return 'Discount Approved';
      case 'discount_rejected':
        return 'Discount Rejected';
      default:
        return 'Activity';
    }
  };

  const getActivityDescription = (activity: QuotationActivity) => {
    switch (activity.type) {
      case 'created':
        const hasDiscount = activity.quotation?.discountAmount && activity.quotation.discountAmount > 0;
        const isPending = activity.quotation?.discountApprovalStatus === 'pending';
        let desc = `Quotation was created by ${activity.user?.name || 'System'}`;
        if (hasDiscount && isPending) {
          desc += ` with discount of ₹${activity.quotation.discountAmount.toLocaleString('en-IN')} (Pending Admin Approval)`;
        } else if (hasDiscount) {
          desc += ` with discount of ₹${activity.quotation.discountAmount.toLocaleString('en-IN')}`;
        }
        return desc;
      case 'sent':
        return `Quotation was sent to ${activity.details?.emailRecipient || 'customer'}`;
      case 'viewed':
        return `Customer viewed the quotation (${activity.details?.viewCount || 1} times)`;
      case 'downloaded':
        return `PDF was downloaded (${activity.details?.downloadCount || 1} times)`;
      case 'accepted':
        return 'Customer accepted the quotation';
      case 'rejected':
        return 'Customer rejected the quotation';
      case 'expired':
        return 'Quotation has expired';
      case 'reminder_sent':
        return `Reminder sent (${activity.details?.reminderCount || 1} times)`;
      case 'discount_approval_pending':
        return `Discount of ₹${activity.details?.discountAmount?.toLocaleString('en-IN') || '0'} is awaiting admin approval. Reason: ${activity.details?.discountReason || 'N/A'}`;
      case 'discount_approved':
        return `Admin approved discount of ₹${activity.details?.discountAmount?.toLocaleString('en-IN') || '0'}`;
      case 'discount_rejected':
        return `Admin rejected discount request of ₹${activity.details?.discountAmount?.toLocaleString('en-IN') || '0'}`;
      default:
        return 'Activity occurred';
    }
  };

  const getActivityBadgeVariant = (type: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    switch (type) {
      case 'created':
        return 'default';
      case 'sent':
        return 'secondary';
      case 'viewed':
        return 'outline';
      case 'downloaded':
        return 'outline';
      case 'accepted':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'expired':
        return 'secondary';
      case 'reminder_sent':
        return 'outline';
      case 'discount_approval_pending':
        return 'secondary';
      case 'discount_approved':
        return 'default';
      case 'discount_rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quotation History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-4 animate-spin" />
            <p>Loading quotation history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quotation History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>No quotation activities found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Quotation History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div key={activity.id}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm">
                      {getActivityTitle(activity.type)}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Badge variant={getActivityBadgeVariant(activity.type)} className="text-xs">
                        {activity.type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {getActivityDescription(activity)}
                  </p>
                  {activity.user && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span>{activity.user.name || activity.user.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(activity.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              {index < activities.length - 1 && <Separator className="mt-4" />}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

