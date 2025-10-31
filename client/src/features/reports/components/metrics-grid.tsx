import { Card, CardContent } from "@/components/ui/card";
import { Mail, Calendar, XCircle, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { memo } from "react";
type DashboardMetrics = {
  activeEnquiries: number;
  bookedBookings: number;
  lostEnquiries: number;
  conversionRate: number;
};

const MetricsGrid = memo(function MetricsGrid() {
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
    enabled: true, // Ensure query is enabled
    refetchInterval: 30000, // Refetch every 30 seconds for better performance
    refetchOnWindowFocus: false, // Disable to prevent unnecessary refetches
    staleTime: 5 * 60 * 1000, // 5 minutes - data is fresh for 5 minutes
    refetchOnMount: false, // Use cached data if available
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(1)}%`;
  };

  // Dynamic descriptions based on actual data
  const getStatusText = (value: number, type: string) => {
    if (value === 0) {
      switch (type) {
        case 'enquiries': return "No active enquiries";
        case 'bookings': return "No confirmed bookings";
        case 'lost': return "No lost enquiries";
        case 'conversion': return "No conversion data";
        default: return "No data";
      }
    }
    
    switch (type) {
      case 'enquiries': return value === 1 ? "1 active enquiry" : `${value} active enquiries`;
      case 'bookings': return value === 1 ? "1 confirmed booking" : `${value} confirmed bookings`;
      case 'lost': return value === 1 ? "1 lost enquiry" : `${value} lost enquiries`;
      case 'conversion': return "Enquiry to booking ratio";
      default: return "Live data";
    }
  };

  const getTrend = (value: number, type: string) => {
    if (value === 0) return "neutral";
    switch (type) {
      case 'enquiries': 
      case 'bookings': 
      case 'conversion': 
        return "up";
      case 'lost': 
        return "down";
      default: 
        return "neutral";
    }
  };

  const getChangeColor = (type: string) => {
    switch (type) {
      case 'enquiries': return "text-blue-600";
      case 'bookings': return "text-green-600";
      case 'lost': return "text-red-600";
      case 'conversion': return "text-teal-600";
      default: return "text-gray-600";
    }
  };

  // Only show data when it's actually loaded from database
  if (!metrics && !isLoading) {
    return <div>Unable to load metrics</div>;
  }

  const metricCards = [
    {
      title: "Active Enquiries",
      value: metrics?.activeEnquiries || 0,
      change: getStatusText(metrics?.activeEnquiries || 0, 'enquiries'),
      changeColor: getChangeColor('enquiries'),
      trend: getTrend(metrics?.activeEnquiries || 0, 'enquiries'),
      icon: Mail,
      gradient: "from-blue-500 to-blue-600",
      testId: "metric-enquiries"
    },
    {
      title: "Booked Bookings",
      value: metrics?.bookedBookings || 0,
      change: getStatusText(metrics?.bookedBookings || 0, 'bookings'),
      changeColor: getChangeColor('bookings'),
      trend: getTrend(metrics?.bookedBookings || 0, 'bookings'),
      icon: Calendar,
      gradient: "from-green-500 to-green-600",
      testId: "metric-bookings"
    },
    {
      title: "Lost Enquiries",
      value: metrics?.lostEnquiries || 0,
      change: getStatusText(metrics?.lostEnquiries || 0, 'lost'),
      changeColor: getChangeColor('lost'),
      trend: getTrend(metrics?.lostEnquiries || 0, 'lost'),
      icon: XCircle,
      gradient: "from-red-500 to-red-600",
      testId: "metric-lost"
    },
    {
      title: "Conversion Rate",
      value: formatPercentage(metrics?.conversionRate || 0),
      change: getStatusText(metrics?.conversionRate || 0, 'conversion'),
      changeColor: getChangeColor('conversion'),
      trend: getTrend(metrics?.conversionRate || 0, 'conversion'),
      icon: TrendingUp,
      gradient: "from-teal-500 to-teal-600",
      testId: "metric-conversion"
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-3 lg:h-4 bg-muted rounded w-20 lg:w-24"></div>
                  <div className="h-6 lg:h-8 bg-muted rounded w-12 lg:w-16"></div>
                  <div className="h-2 lg:h-3 bg-muted rounded w-16 lg:w-20"></div>
                </div>
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-muted rounded-full"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6 lg:mb-8">
      {metricCards.map((metric) => (
        <Card key={metric.title} className="shadow-sm border hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{metric.title}</p>
                <div className={`w-7 h-7 bg-gradient-to-br ${metric.gradient} rounded-md flex items-center justify-center`}>
                  <metric.icon className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <p 
                  className="text-xl font-bold text-foreground"
                  data-testid={metric.testId}
                >
                  {metric.value}
                </p>
                <div className="flex items-center space-x-1">
                  {metric.trend === 'up' && <ArrowUpRight className="w-3 h-3 text-green-600" />}
                  {metric.trend === 'down' && <ArrowDownRight className="w-3 h-3 text-red-600" />}
                  <p className={`text-xs font-medium ${metric.changeColor}`}>
                    {metric.change}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
});

export default MetricsGrid;
