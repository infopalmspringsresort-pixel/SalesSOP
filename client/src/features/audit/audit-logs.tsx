import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Search, Download, Filter, Eye, Calendar, User, Shield, Activity } from 'lucide-react';
import { formatDate } from '@/utils/dateFormat';

interface AuditLog {
  id: string;
  userId?: string;
  userRole: string;
  action: string;
  module: string;
  createdAt: string;
}

interface AuditFilters {
  action?: string;
  module?: string;
  userRole?: string;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
}

export function AuditLogs() {
  const [filters, setFilters] = useState<AuditFilters>({});
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: auditLogs = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/audit', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
      
      const response = await fetch(`/api/audit?${params}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      const data = await response.json();
      // Map _id to id for frontend compatibility
      return data.map((log: any) => ({
        ...log,
        id: log._id || log.id
      }));
    },
  });

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
      
      const response = await fetch(`/api/audit?${params}`);
      if (!response.ok) throw new Error('Failed to export audit logs');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `audit-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'login': return 'bg-green-100 text-green-800';
      case 'logout': return 'bg-gray-100 text-gray-800';
      case 'login_failed': return 'bg-red-100 text-red-800';
      case 'created': return 'bg-blue-100 text-blue-800';
      case 'updated': return 'bg-yellow-100 text-yellow-800';
      case 'deleted': return 'bg-red-100 text-red-800';
      case 'viewed': return 'bg-gray-100 text-gray-800';
      case 'access_denied': return 'bg-red-100 text-red-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'auth': return <Shield className="w-4 h-4" />;
      case 'users': return <User className="w-4 h-4" />;
      case 'enquiries': return <Activity className="w-4 h-4" />;
      case 'bookings': return <Calendar className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // Calculate quick stats
  const stats = {
    total: auditLogs.length,
    today: auditLogs.filter(log => new Date(log.createdAt).toDateString() === new Date().toDateString()).length,
    logins: auditLogs.filter(log => log.action === 'login').length,
    errors: auditLogs.filter(log => log.action === 'access_denied' || log.action === 'login_failed').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground">Track all user actions and system activities</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setFilters({...filters, action: 'login'})}
            size="sm"
          >
            <User className="w-4 h-4 mr-1" />
            Logins
          </Button>
          <Button
            variant="outline"
            onClick={() => setFilters({...filters, action: 'access_denied'})}
            size="sm"
          >
            <Shield className="w-4 h-4 mr-1" />
            Security
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            data-testid="button-export-audit"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Logs</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Today</p>
                <p className="text-2xl font-bold">{stats.today}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Logins</p>
                <p className="text-2xl font-bold">{stats.logins}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">Security Issues</p>
                <p className="text-2xl font-bold">{stats.errors}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filter Audit Logs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="action">Action</Label>
                <Select value={filters.action || 'all'} onValueChange={(value) => setFilters({...filters, action: value === 'all' ? undefined : value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    <SelectItem value="login">Login</SelectItem>
                    <SelectItem value="logout">Logout</SelectItem>
                    <SelectItem value="created">Created</SelectItem>
                    <SelectItem value="updated">Updated</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
                    <SelectItem value="viewed">Viewed</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="module">Module</Label>
                <Select value={filters.module || 'all'} onValueChange={(value) => setFilters({...filters, module: value === 'all' ? undefined : value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All modules" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All modules</SelectItem>
                    <SelectItem value="auth">Authentication</SelectItem>
                    <SelectItem value="users">Users</SelectItem>
                    <SelectItem value="enquiries">Enquiries</SelectItem>
                    <SelectItem value="bookings">Bookings</SelectItem>
                    <SelectItem value="reports">Reports</SelectItem>
                    <SelectItem value="settings">Settings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="userRole">User Role</Label>
                <Select value={filters.userRole || 'all'} onValueChange={(value) => setFilters({...filters, userRole: value === 'all' ? undefined : value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="salesperson">Salesperson</SelectItem>
                    <SelectItem value="accounts">Accounts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="dateFrom">Date From</Label>
                <Input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => setFilters({...filters, dateFrom: e.target.value || undefined})}
                  data-testid="input-date-from"
                />
              </div>
              
              <div>
                <Label htmlFor="dateTo">Date To</Label>
                <Input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => setFilters({...filters, dateTo: e.target.value || undefined})}
                  data-testid="input-date-to"
                />
              </div>
              
              <div>
                <Label htmlFor="userId">User ID</Label>
                <Input
                  placeholder="Filter by user..."
                  value={filters.userId || ''}
                  onChange={(e) => setFilters({...filters, userId: e.target.value || undefined})}
                  data-testid="input-user-id"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2 mt-4">
              <Button onClick={() => refetch()} data-testid="button-apply-filters">
                <Search className="w-4 h-4 mr-2" />
                Apply Filters
              </Button>
              <Button variant="outline" onClick={() => { setFilters({}); refetch(); }} data-testid="button-clear-filters">
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>System Audit Logs</span>
            <Badge variant="outline" data-testid="text-log-count">
              {auditLogs.length} records
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No audit logs found</div>
          ) : (
            <div className="rounded-md border">
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
                  {auditLogs.map((log: AuditLog) => (
                    <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                      <TableCell className="font-mono text-sm" data-testid={`text-timestamp-${log.id}`}>
                        <div>
                          <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-user-${log.id}`}>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className={
                            log.userRole === 'admin' ? 'bg-red-100 text-red-800' :
                            log.userRole === 'manager' ? 'bg-blue-100 text-blue-800' :
                            log.userRole === 'salesperson' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {log.userRole}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {log.userId ? log.userId.substring(0, 8) : 'System'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-action-${log.id}`}>
                        <Badge className={getActionColor(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-module-${log.id}`}>
                        <div className="flex items-center space-x-2">
                          {getModuleIcon(log.module)}
                          <span>{log.module}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}