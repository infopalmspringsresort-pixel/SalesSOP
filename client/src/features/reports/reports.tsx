import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Users, 
  IndianRupee,
  FileText,
  BarChart3,
  PieChart,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, subDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Cell, Pie } from "recharts";
import LazyWrapper from "@/components/LazyWrapper";

export default function Reports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [activeTab, setActiveTab] = useState("enquiry-pipeline");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Build query parameters for date filters only
  const queryParams = new URLSearchParams({
    ...(dateRange.from && { dateFrom: dateRange.from.toISOString() }),
    ...(dateRange.to && { dateTo: dateRange.to.toISOString() }),
  });

  // Report data queries - Always fetch all data when authenticated
  const { data: enquiryPipelineReport, isLoading: enquiryLoading } = useQuery({
    queryKey: [`/api/reports/enquiry-pipeline?${queryParams.toString()}`],
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });

  const { data: followUpReport, isLoading: followUpLoading } = useQuery({
    queryKey: [`/api/reports/follow-up-performance?${queryParams.toString()}`],
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });

  const { data: bookingReport, isLoading: bookingLoading } = useQuery({
    queryKey: [`/api/reports/booking-analytics?${queryParams.toString()}`],
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });

  const { data: teamReport, isLoading: teamLoading } = useQuery({
    queryKey: [`/api/reports/team-performance?${queryParams.toString()}`],
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });

  // Chart colors
  const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      new: 'bg-blue-100 text-blue-800',
      ongoing: 'bg-yellow-100 text-yellow-800',
      converted: 'bg-green-100 text-green-800',
      lost: 'bg-red-100 text-red-800',
      booked: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const renderEnquiryPipelineReport = () => {
    if (enquiryLoading) {
      return <div className="flex items-center justify-center h-64">Loading report...</div>;
    }

    if (!enquiryPipelineReport) {
      return <div className="text-center text-gray-500 mt-8">No data available for selected filters</div>;
    }

    const total = (enquiryPipelineReport as any).total || 0;
    const statusBreakdown = (enquiryPipelineReport as any).statusBreakdown || {};
    const sourceBreakdown = (enquiryPipelineReport as any).sourceBreakdown || {};
    const lostReasons = (enquiryPipelineReport as any).lostReasons || {};
    const conversionRate = (enquiryPipelineReport as any).conversionRate || 0;

    // Follow-up data (from followUpReport)
    const totalFollowUps = followUpReport ? ((followUpReport as any).totalFollowUps || 0) : 0;
    const completedFollowUps = followUpReport ? ((followUpReport as any).completedFollowUps || 0) : 0;
    const overdueFollowUps = followUpReport ? ((followUpReport as any).overdueFollowUps || 0) : 0;
    const completionRate = followUpReport ? ((followUpReport as any).completionRate || 0) : 0;

    // Prepare charts data
    const statusChartData = Object.entries(statusBreakdown || {}).map(([status, count]) => ({
      status: status.replace('_', ' ').toUpperCase(),
      count,
    }));

    const sourceChartData = Object.entries(sourceBreakdown || {}).map(([source, count]) => ({
      source: source.replace('_', ' ').toUpperCase(),
      count,
    }));

    const lostReasonsData = Object.entries(lostReasons || {}).map(([reason, count]) => ({
      reason,
      count,
    }));

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Enquiries</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{conversionRate}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Converted</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusBreakdown.converted || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lost</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusBreakdown.lost || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Follow-up Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Follow-ups</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFollowUps}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedFollowUps}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overdueFollowUps}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Status Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Lost Reasons Analysis */}
        {lostReasonsData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Lost Reasons Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lostReasonsData.map((item: any, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.reason}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-red-500 rounded-full" 
                          style={{ width: `${((item.count as number) / Math.max(...lostReasonsData.map((d: any) => d.count as number))) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{item.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderFollowUpReport = () => {
    if (followUpLoading) {
      return <div className="flex items-center justify-center h-64">Loading report...</div>;
    }

    if (!followUpReport) {
      return <div className="text-center text-gray-500 mt-8">No data available for selected filters</div>;
    }

    // Handle the actual data structure from the API
    const totalFollowUps = (followUpReport as any).totalFollowUps || 0;
    const completedFollowUps = (followUpReport as any).completedFollowUps || 0;
    const overdueFollowUps = (followUpReport as any).overdueFollowUps || 0;
    const completionRate = (followUpReport as any).completionRate || 0;
    const avgResponseTime = (followUpReport as any).avgResponseTime || 0;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Follow-ups</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalFollowUps}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedFollowUps}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overdueFollowUps}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>

      </div>
    );
  };

  const renderBookingReport = () => {
    if (bookingLoading) {
      return <div className="flex items-center justify-center h-64">Loading report...</div>;
    }

    if (!bookingReport) {
      return <div className="text-center text-gray-500 mt-8">No data available for selected filters</div>;
    }

    // Debug logging
    const totalBookings = (bookingReport as any).totalBookings || 0;
    const totalRevenue = (bookingReport as any).totalRevenue || 0;
    const avgBookingValue = (bookingReport as any).avgBookingValue || 0;
    const avgDuration = (bookingReport as any).avgDuration || 0;
    const statusBreakdown = (bookingReport as any).statusBreakdown || {};
    const eventTypeBreakdown = (bookingReport as any).eventTypeBreakdown || {};

    try {
      return (
        <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBookings}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgDuration.toFixed(1)} days</div>
            </CardContent>
          </Card>
        </div>

        {/* Duration Analysis */}
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{totalBookings}</div>
                  <div className="text-sm text-gray-600">Total Bookings</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{avgDuration.toFixed(1)}</div>
                  <div className="text-sm text-gray-600">Avg Duration (days)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Event Type Breakdown */}
        {Object.keys(eventTypeBreakdown).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Event Type Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(eventTypeBreakdown).map(([eventType, count]) => (
                  <div key={eventType} className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{eventType.replace('_', ' ')}</span>
                    <Badge variant="outline">{count as number}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
    } catch (error) {
      return (
        <div className="text-center text-red-500 mt-8">
          Error rendering booking report: {error.message}
        </div>
      );
    }
  };

  const renderTeamReport = () => {
    if (teamLoading) {
      return <div className="flex items-center justify-center h-64">Loading report...</div>;
    }

    if (!teamReport) {
      return <div className="text-center text-gray-500 mt-8">No data available for selected filters</div>;
    }

    const teamPerformance = (teamReport as any).teamPerformance || [];
    const summary = (teamReport as any).summary || { totalUsers: 0, totalEnquiries: 0, averageConversionRate: 0 };

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamPerformance.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Enquiries Handled</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamPerformance.reduce((sum, member) => sum + member.totalEnquiries, 0)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Individual Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Individual Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {teamPerformance.map((member: any, index: number) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className="font-medium">{member.salespersonName}</h4>
                      <p className="text-sm text-gray-600">ID: {member.salespersonId}</p>
                    </div>
                    <Badge variant="outline">{member.conversionRate.toFixed(1)}% conversion</Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-gray-600">Total:</span>
                      <span className="ml-2 font-medium">{member.totalEnquiries}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Converted:</span>
                      <span className="ml-2 font-medium text-green-600">{member.convertedEnquiries}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Lost:</span>
                      <span className="ml-2 font-medium text-red-600">{typeof member.lostEnquiries === 'number' ? Math.round(member.lostEnquiries) : member.lostEnquiries}</span>
                    </div>
                  </div>

                  {/* Visual Progress Bar with Color Coding */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Conversion Rate</span>
                      <span className="text-sm font-bold text-blue-600">{member.conversionRate.toFixed(1)}%</span>
                    </div>
                    <div className="relative w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
                        style={{ width: `${Math.min(member.conversionRate, 100)}%` }}
                      >
                        {member.conversionRate > 5 && `${member.conversionRate.toFixed(1)}%`}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="w-64 bg-card border-r animate-pulse"></div>
        <div className="flex-1 p-6 animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-6"></div>
          <div className="grid grid-cols-4 gap-6">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto h-screen touch-pan-y">
        <header className="bg-gradient-to-r from-white to-gray-50 border-b border-border px-4 lg:px-6 py-4 lg:py-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between w-full">
              <div className="w-12 lg:w-0"></div>
              <div className="flex flex-col items-center flex-1">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                  </div>
                  <h2 className="text-xl lg:text-2xl xl:text-3xl font-bold text-foreground">
                    Reports & Analytics
                  </h2>
                </div>
                <p className="text-xs lg:text-sm xl:text-base text-muted-foreground mt-1 text-center">
                  Comprehensive business insights and performance metrics
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-6 pb-20 lg:pb-6">
          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="w-4 h-4 mr-2" />
                Report Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Date Range</label>
                  <DatePickerWithRange
                    date={dateRange}
                    onDateChange={(date) => {
                      if (date && date.from && date.to) {
                        setDateRange({ from: date.from, to: date.to });
                      }
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 gap-1">
              <TabsTrigger value="enquiry-pipeline" className="flex items-center text-xs lg:text-sm min-h-[44px] touch-manipulation">
                <BarChart3 className="w-4 h-4 mr-1 lg:mr-2" />
                <span className="hidden sm:inline">Enquiry & Follow-up</span>
                <span className="sm:hidden">Enquiry</span>
              </TabsTrigger>
              <TabsTrigger value="booking-analytics" className="flex items-center text-xs lg:text-sm min-h-[44px] touch-manipulation">
                <Calendar className="w-4 h-4 mr-1 lg:mr-2" />
                <span className="hidden sm:inline">Booking Analytics</span>
                <span className="sm:hidden">Booking</span>
              </TabsTrigger>
              <TabsTrigger value="team-performance" className="flex items-center text-xs lg:text-sm min-h-[44px] touch-manipulation">
                <Users className="w-4 h-4 mr-1 lg:mr-2" />
                <span className="hidden sm:inline">Team Performance</span>
                <span className="sm:hidden">Team</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="enquiry-pipeline">
              <LazyWrapper>
                {renderEnquiryPipelineReport()}
              </LazyWrapper>
            </TabsContent>

            <TabsContent value="booking-analytics">
              <LazyWrapper>
                {renderBookingReport()}
              </LazyWrapper>
            </TabsContent>

            <TabsContent value="team-performance">
              <LazyWrapper>
                {renderTeamReport()}
              </LazyWrapper>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
