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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
  Clock,
  X
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Cell, Pie } from "recharts";
import LazyWrapper from "@/components/LazyWrapper";

export default function Reports() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  // Initialize with current month (start to end)
  const getCurrentMonthRange = () => {
    const today = new Date();
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    // Set time to start/end of day for proper filtering
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return {
      from: start,
      to: end,
    };
  };

  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>(getCurrentMonthRange());
  const [activeTab, setActiveTab] = useState("enquiry-pipeline");
  const [cityFilter, setCityFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");

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
  // If no date range is set, don't send date filters (show all data)
  const queryParams = new URLSearchParams();
  if (dateRange.from) {
    queryParams.set('dateFrom', dateRange.from.toISOString());
  }
  if (dateRange.to) {
    queryParams.set('dateTo', dateRange.to.toISOString());
  }

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

  // Fetch all enquiries for client-side filtering
  const { data: allEnquiries = [], isLoading: enquiriesLoading } = useQuery<any[]>({
    queryKey: ["/api/enquiries"],
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
    if (enquiryLoading || enquiriesLoading) {
      return <div className="flex items-center justify-center h-64">Loading report...</div>;
    }

    // Filter enquiries based on selected filters
    const filteredEnquiries = (allEnquiries || []).filter((enquiry: any) => {
      if (cityFilter !== "all" && enquiry.city !== cityFilter) return false;
      if (sourceFilter !== "all" && enquiry.source !== sourceFilter) return false;
      if (eventTypeFilter !== "all" && enquiry.eventType !== eventTypeFilter) return false;
      return true;
    });

    // Calculate metrics from filtered enquiries
    const total = filteredEnquiries.length;
    const statusBreakdown: any = {};
    const sourceBreakdown: any = {};
    const lostReasons: any = {};
    
    filteredEnquiries.forEach((enquiry: any) => {
      // Status breakdown
      statusBreakdown[enquiry.status] = (statusBreakdown[enquiry.status] || 0) + 1;
      
      // Source breakdown
      if (enquiry.source) {
        sourceBreakdown[enquiry.source] = (sourceBreakdown[enquiry.source] || 0) + 1;
      }
      
      // Lost reasons
      if (enquiry.status === 'lost' && enquiry.lostReason) {
        lostReasons[enquiry.lostReason] = (lostReasons[enquiry.lostReason] || 0) + 1;
      }
    });
    
    // Calculate conversion rate
    const convertedCount = (statusBreakdown.converted || 0) + (statusBreakdown.booked || 0);
    const conversionRate = total > 0 ? Math.round((convertedCount / total) * 100) : 0;

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
              <div className="text-2xl font-bold">{convertedCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {(statusBreakdown.converted || 0)} converted + {(statusBreakdown.booked || 0)} booked
              </p>
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
        <header className="bg-card border-b border-border px-4 lg:px-6 py-3 lg:py-4 shadow-sm">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-xl lg:text-2xl font-bold text-foreground">Reports & Analytics</h1>
              <p className="text-sm text-muted-foreground hidden lg:block">Comprehensive business insights and performance metrics</p>
            </div>
          </div>
        </header>

        <div className="p-4 lg:p-6 pb-20 lg:pb-6">
          {/* Filters - Compact Layout */}
          <Card className="mb-4">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col lg:flex-row lg:items-end gap-3">
                {/* Date Range with Clear Button */}
                <div className="flex-1">
                  <Label className="text-sm font-medium mb-1.5 block">Date Range</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <DatePickerWithRange
                        date={dateRange}
                        onDateChange={(date) => {
                          // Handle date range selection from calendar
                          // Calendar works with two clicks: first sets 'from', second sets 'to'
                          if (date) {
                            // Update from date if provided
                            const newFrom = date.from || dateRange.from;
                            // Update to date if provided, otherwise keep current to or use from
                            const newTo = date.to || (date.from ? date.from : dateRange.to);
                            setDateRange({
                              from: newFrom,
                              to: newTo
                            });
                          }
                          // Note: We don't reset on undefined to allow proper calendar interaction
                        }}
                      />
                    </div>
                    {(dateRange.from || dateRange.to) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDateRange({
                            from: undefined,
                            to: undefined
                          });
                        }}
                        className="h-10 px-3 shrink-0"
                      >
                        <X className="w-4 h-4 mr-1.5" />
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Show additional filters only for Enquiry & Follow-up tab */}
                {activeTab === "enquiry-pipeline" && (
                  <>
                    <div className="flex-1">
                      <Label className="text-sm font-medium mb-1.5 block">City</Label>
                      <Select value={cityFilter} onValueChange={setCityFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Cities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Cities</SelectItem>
                          {Array.from(new Set(allEnquiries.map((e: any) => e.city).filter(Boolean))).map((city: string) => (
                            <SelectItem key={city} value={city}>{city}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1">
                      <Label className="text-sm font-medium mb-1.5 block">Source</Label>
                      <Select value={sourceFilter} onValueChange={setSourceFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Sources" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sources</SelectItem>
                          <SelectItem value="Walk-in">Walk-in</SelectItem>
                          <SelectItem value="Phone Call">Phone Call</SelectItem>
                          <SelectItem value="Website / Online Form">Website / Online Form</SelectItem>
                          <SelectItem value="WhatsApp / Social Media">WhatsApp / Social Media</SelectItem>
                          <SelectItem value="Travel Agent / Broker">Travel Agent / Broker</SelectItem>
                          <SelectItem value="Corporate">Corporate</SelectItem>
                          <SelectItem value="Event Planner">Event Planner</SelectItem>
                          <SelectItem value="Referral (Past Client / Staff)">Referral (Past Client / Staff)</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex-1">
                      <Label className="text-sm font-medium mb-1.5 block">Event Type</Label>
                      <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Event Types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Event Types</SelectItem>
                          <SelectItem value="wedding">Wedding</SelectItem>
                          <SelectItem value="corporate">Corporate</SelectItem>
                          <SelectItem value="birthday">Birthday</SelectItem>
                          <SelectItem value="anniversary">Anniversary</SelectItem>
                          <SelectItem value="social">Social</SelectItem>
                          <SelectItem value="conference">Conference</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Report Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="enquiry-pipeline" className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Enquiry & Follow-up</span>
                <span className="sm:hidden">Enquiry</span>
              </TabsTrigger>
              <TabsTrigger value="booking-analytics" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="hidden sm:inline">Booking Analytics</span>
                <span className="sm:hidden">Booking</span>
              </TabsTrigger>
              <TabsTrigger value="team-performance" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
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
