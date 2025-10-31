import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Users, UserPlus, Shield, Settings, Activity, Key, Eye, EyeOff, FileText, Calendar, AlertTriangle, BarChart3, Download, Database } from "lucide-react";
import Sidebar from "@/components/sidebar";
import { exportCustomersToExcel, CustomerData } from "@/utils/excelExporter";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { addDays, format, subDays } from "date-fns";
import { DiscountSettingsTab } from "./discount-settings-tab";

const userFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  roleId: z.string().min(1, "Role is required"),
  status: z.enum(["active", "inactive"]).default("active"),
});

type UserFormData = z.infer<typeof userFormSchema>;

export function SettingsPage() {
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [passwordResetDialog, setPasswordResetDialog] = useState({ open: false, userId: "", userName: "" });
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("users");
  const [showCreateUserPassword, setShowCreateUserPassword] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [exportEventType, setExportEventType] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  
  // Check if current user is admin
  const isCurrentUserAdmin = Boolean(currentUser && 
    typeof currentUser === 'object' && 
    'role' in currentUser && 
    currentUser.role && 
    typeof currentUser.role === 'object' && 
    'name' in currentUser.role && 
    currentUser.role.name === 'admin');

  // Queries
  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });


  const { data: roles = [], isLoading: rolesLoading } = useQuery<any[]>({
    queryKey: ["/api/roles"],
  });

  const { data: auditLogs = [], isLoading: auditLoading } = useQuery<any[]>({
    queryKey: ["/api/audit"],
  });

  const { data: enquiries = [] } = useQuery<any[]>({
    queryKey: ["/api/enquiries"],
  });

  // Form setup
  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      roleId: "",
      status: "active",
    },
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || "Failed to create user";
        throw new Error(errorMessage);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User created successfully" });
      setIsUserDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      // Show specific error message from backend
      toast({ 
        title: "Failed to create user", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update user", variant: "destructive" });
    },
  });

  const assignRoleMutation = useMutation({
    mutationFn: async ({ userId, roleId }: { userId: string; roleId: string }) => {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId }),
      });
      if (!response.ok) throw new Error("Failed to assign role");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Role assigned successfully" });
    },
    onError: () => {
      toast({ title: "Failed to assign role", variant: "destructive" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const response = await fetch(`/api/auth/admin-reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, newPassword }),
      });
      if (!response.ok) throw new Error("Failed to reset password");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Password reset successfully" });
      setPasswordResetDialog({ open: false, userId: "", userName: "" });
      setNewPassword("");
    },
    onError: () => {
      toast({ title: "Failed to reset password", variant: "destructive" });
    },
  });

  const onSubmit = (data: UserFormData) => {
    createUserMutation.mutate(data);
  };

  const handleExportCustomers = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (exportDateRange.from && exportDateRange.to) {
        params.append('dateFrom', exportDateRange.from.toISOString());
        params.append('dateTo', exportDateRange.to.toISOString());
      }
      if (exportEventType && exportEventType !== 'all') {
        params.append('eventType', exportEventType);
      }

      const response = await fetch(`/api/export/customers?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch customer data');
      
      const result = await response.json();
      if (result.success && result.data) {
        if (result.data.length > 0) {
          // Generate filename with date range
          let filename = 'customers-export';
          if (result.dateRange) {
            const fromDate = format(new Date(result.dateRange.from), 'yyyy-MM-dd');
            const toDate = format(new Date(result.dateRange.to), 'yyyy-MM-dd');
            filename += `_${fromDate}_to_${toDate}`;
          } else {
            filename += `_all-data_${format(new Date(), 'yyyy-MM-dd')}`;
          }
          if (exportEventType && exportEventType !== 'all') {
            filename += `_${exportEventType}`;
          }
          filename += '.xlsx';

          exportCustomersToExcel(result.data, filename, {
            dateRange: result.dateRange,
            eventType: exportEventType !== 'all' ? exportEventType : undefined,
            totalRecords: result.count
          });
          toast({
            title: "Export Successful",
            description: `Exported ${result.count} customer records to Excel`,
          });
        } else {
          toast({
            title: "No Data Found",
            description: "No customer data found for the selected filters. Try selecting different filters or remove filters to export all data.",
            variant: "destructive",
          });
        }
      } else {
        throw new Error(`API Error: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export customer data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getRoleBadgeVariant = (roleName: string) => {
    switch (roleName) {
      case "admin": return "destructive";
      case "manager": return "default";
      case "salesperson": return "secondary";
      case "accounts": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-auto h-screen touch-pan-y">
        <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 pb-20 lg:pb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between w-full">
              <div className="w-12 lg:w-0"></div>
              <div className="flex flex-col items-center flex-1">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                    <Settings className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                  </div>
                  <h1 className="text-xl lg:text-2xl xl:text-3xl font-bold text-foreground">
                    Settings & Administration
                  </h1>
                </div>
                <p className="text-xs lg:text-sm xl:text-base text-muted-foreground mt-1 text-center">
                  Manage users, roles, and system configuration
                </p>
              </div>
            </div>
          </div>

      {/* Tab Navigation - Only show admin tabs to admin users */}
      {isCurrentUserAdmin ? (
        <div className="flex flex-wrap gap-1 bg-muted p-1 rounded-lg w-full lg:w-fit">
          <Button
            variant={activeTab === "users" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("users")}
            data-testid="tab-users"
            className="flex-1 lg:flex-none min-h-[44px] touch-manipulation"
          >
            <Users className="h-4 w-4 mr-1 lg:mr-2" />
            <span className="hidden sm:inline">User Management</span>
            <span className="sm:hidden">Users</span>
          </Button>
          <Button
            variant={activeTab === "audit" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("audit")}
            data-testid="tab-audit"
            className="flex-1 lg:flex-none min-h-[44px] touch-manipulation"
          >
            <Activity className="h-4 w-4 mr-1 lg:mr-2" />
            <span className="hidden sm:inline">Audit Trail</span>
            <span className="sm:hidden">Audit</span>
          </Button>
          <Button
            variant={activeTab === "export" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("export")}
            data-testid="tab-export"
            className="flex-1 lg:flex-none min-h-[44px] touch-manipulation"
          >
            <Database className="h-4 w-4 mr-1 lg:mr-2" />
            <span className="hidden sm:inline">Data Export</span>
            <span className="sm:hidden">Export</span>
          </Button>
          <Button
            variant={activeTab === "discount" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("discount")}
            data-testid="tab-discount"
            className="flex-1 lg:flex-none min-h-[44px] touch-manipulation"
          >
            <Settings className="h-4 w-4 mr-1 lg:mr-2" />
            <span className="hidden sm:inline">Discount Settings</span>
            <span className="sm:hidden">Discount</span>
          </Button>
        </div>
      ) : (
        <div className="text-center py-12">
          <Shield className="h-16 w-16 mx-auto mb-6 opacity-30" />
          <h2 className="text-2xl font-semibold mb-3">Administrator Access Required</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            You need administrator privileges to access system settings, user management, and audit trails.
            Please contact your system administrator if you need access to these features.
          </p>
        </div>
      )}

      {/* Admin Only Content */}
      {isCurrentUserAdmin && (
        <>
          {/* User Management Tab */}
          {activeTab === "users" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  {isCurrentUserAdmin 
                    ? "Manage system users and their roles" 
                    : "Admin access required to manage users"
                  }
                </CardDescription>
              </div>
              {isCurrentUserAdmin && (
                <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-user">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-first-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl>
                                <Input {...field} data-testid="input-last-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} data-testid="input-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type={showCreateUserPassword ? "text" : "password"} 
                                  {...field} 
                                  data-testid="input-password" 
                                  placeholder="Minimum 6 characters"
                                  className="pr-12"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowCreateUserPassword(!showCreateUserPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
                                  data-testid="toggle-create-user-password-visibility"
                                  aria-label={showCreateUserPassword ? "Hide password" : "Show password"}
                                >
                                  {showCreateUserPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="roleId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Role</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-role">
                                  <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {(roles || []).filter((role: any) => role.name !== 'admin').map((role: any) => (
                                  <SelectItem key={role.id} value={role.id}>
                                    {role.displayName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsUserDialogOpen(false)}
                          data-testid="button-cancel"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={createUserMutation.isPending}
                          data-testid="button-create-user"
                        >
                          {createUserMutation.isPending ? "Creating..." : "Create User"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!isCurrentUserAdmin ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Admin Access Required</p>
                <p>Only administrators can manage users, roles, and system settings.</p>
              </div>
            ) : usersLoading ? (
              <div>Loading users...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(users || []).map((user: any) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell data-testid={`text-name-${user.id}`}>
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell data-testid={`text-email-${user.id}`}>
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={getRoleBadgeVariant(user.role?.name || "")}
                          data-testid={`badge-role-${user.id}`}
                        >
                          {user.role?.displayName || (user.email === 'md.palmspringsresort@gmail.com' ? 'Admin' : 'No Role')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={user.status === "active" ? "default" : "secondary"}
                          data-testid={`badge-status-${user.id}`}
                        >
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {(user.role?.name === 'admin' || user.email === 'md.palmspringsresort@gmail.com') ? (
                            <Badge variant="destructive" data-testid={`badge-protected-admin-${user.id}`}>
                              Super Admin (Protected)
                            </Badge>
                          ) : (
                            <Select
                              onValueChange={(roleId) => assignRoleMutation.mutate({ userId: user.id, roleId })}
                              defaultValue={user.role?.id || ""}
                            >
                              <SelectTrigger className="w-[150px]" data-testid={`select-user-role-${user.id}`}>
                                <SelectValue placeholder="Assign role" />
                              </SelectTrigger>
                              <SelectContent>
                                {(roles || []).filter((role: any) => role.name !== 'admin').map((role: any) => (
                                  <SelectItem key={role.id} value={role.id}>
                                    {role.displayName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {(user.role?.name === 'admin' || user.email === 'md.palmspringsresort@gmail.com') ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              data-testid={`button-protected-admin-${user.id}`}
                            >
                              Protected
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateUserStatusMutation.mutate({
                                  userId: user.id,
                                  status: user.status === "active" ? "inactive" : "active"
                                })}
                                data-testid={`button-toggle-status-${user.id}`}
                              >
                                {user.status === "active" ? "Deactivate" : "Activate"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPasswordResetDialog({ 
                                  open: true, 
                                  userId: user.id, 
                                  userName: `${user.firstName} ${user.lastName}` 
                                })}
                                data-testid={`button-reset-password-${user.id}`}
                              >
                                <Key className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}


      {/* Audit Trail Tab */}
      {activeTab === "audit" && (
        <Card>
            <CardHeader>
              <CardTitle>System Audit Trail</CardTitle>
              <CardDescription>Track all system activities and access logs</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Module</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(auditLogs || []).map((log: any) => (
                      <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                        <TableCell data-testid={`text-timestamp-${log.id}`}>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {new Date(log.createdAt).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(log.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-user-${log.id}`}>
                          <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${
                              log.userRole === 'admin' ? 'bg-red-500' : 
                              log.userRole === 'manager' ? 'bg-blue-500' : 'bg-green-500'
                            }`} />
                            <span className="font-medium">{log.userRole}</span>
                          </div>
                          <div className="text-sm text-muted-foreground truncate max-w-20">
                            {log.userId}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              log.action === "access_denied" ? "destructive" : 
                              log.action === "login" ? "default" :
                              log.action === "created" ? "secondary" :
                              "outline"
                            }
                            data-testid={`badge-action-${log.id}`}
                          >
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-module-${log.id}`}>
                          <div className="flex items-center space-x-1">
                            {log.module === 'auth' && <Users className="w-3 h-3" />}
                            {log.module === 'enquiries' && <FileText className="w-3 h-3" />}
                            {log.module === 'bookings' && <Calendar className="w-3 h-3" />}
                            {log.module === 'reports' && <BarChart3 className="w-3 h-3" />}
                            <span className="capitalize">{log.module}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
      )}

      {/* Data Export Tab */}
      {activeTab === "export" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Customer Data Export
            </CardTitle>
            <CardDescription>
              Export customer information to Excel format with optional date and event type filtering
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="date-range" className="text-sm font-medium">
                  Date Range (Optional)
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Leave empty to export all customer data
                </p>
                <DatePickerWithRange
                  date={exportDateRange}
                  onDateChange={setExportDateRange}
                />
              </div>
              
              <div>
                <Label htmlFor="event-type" className="text-sm font-medium">
                  Event Type (Optional)
                </Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Filter by specific event type
                </p>
                <Select value={exportEventType} onValueChange={setExportEventType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Event Types</SelectItem>
                    {Array.from(new Set(enquiries.map((enquiry: any) => enquiry.eventType).filter(Boolean))).map((eventType: string) => (
                      <SelectItem key={eventType} value={eventType}>
                        {eventType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setExportDateRange({ from: undefined, to: undefined });
                    setExportEventType("all");
                  }}
                  disabled={isExporting}
                  className="flex-1"
                >
                  Clear Filters
                </Button>
                <Button
                  onClick={handleExportCustomers}
                  disabled={isExporting}
                  className="flex-1"
                  data-testid="button-export-customers"
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export Customer Data
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Export Details</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Customer Name:</strong> Client name from enquiries</li>
                <li>• <strong>Location:</strong> City information</li>
                <li>• <strong>Phone:</strong> Contact number</li>
                <li>• <strong>Email:</strong> Email address</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                The exported Excel file will be automatically downloaded to your device.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Discount Settings Tab */}
      {activeTab === "discount" && <DiscountSettingsTab />}
        </>
      )}
        </div>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={passwordResetDialog.open} onOpenChange={(open) => 
        setPasswordResetDialog({ open, userId: "", userName: "" })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password for {passwordResetDialog.userName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pr-12"
                  data-testid="input-new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
                  data-testid="toggle-new-password-visibility"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPasswordResetDialog({ open: false, userId: "", userName: "" });
                  setNewPassword("");
                  setShowNewPassword(false);
                }}
                data-testid="button-cancel-password-reset"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!newPassword) {
                    toast({
                      title: "Password required",
                      description: "Please enter a new password",
                      variant: "destructive",
                    });
                    return;
                  }
                  if (newPassword.length < 6) {
                    toast({
                      title: "Password too short",
                      description: "Password must be at least 6 characters long",
                      variant: "destructive",
                    });
                    return;
                  }
                  resetPasswordMutation.mutate({ 
                    userId: passwordResetDialog.userId, 
                    newPassword 
                  });
                }}
                disabled={resetPasswordMutation.isPending}
                data-testid="button-confirm-password-reset"
              >
                {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}