import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Percent, Save, AlertCircle, FileText, Calendar, User } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export function DiscountSettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  
  const [maxDiscountPercentage, setMaxDiscountPercentage] = useState(10);

  // Fetch system settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/system-settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/system-settings');
      return await response.json();
    },
  });

  // Fetch quotations that exceeded discount limit
  const { data: exceededQuotations = [], isLoading: quotationsLoading } = useQuery({
    queryKey: ['/api/quotations/exceeded-discounts'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/quotations/exceeded-discounts');
      return await response.json();
    },
  });

  // Update local state when settings are loaded
  useEffect(() => {
    if (settings) {
      setMaxDiscountPercentage(settings.maxDiscountPercentage || 10);
    }
  }, [settings]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PUT', '/api/system-settings', data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/quotations/exceeded-discounts'] });
      toast({
        title: 'Settings Updated',
        description: 'Discount percentage limit has been updated.',
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update discount settings',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    updateSettingsMutation.mutate({
      maxDiscountPercentage,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Discount Percentage Setting */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" />
                Discount Percentage Limit
              </CardTitle>
              <CardDescription>
                Set the maximum discount percentage allowed. Quotations exceeding this limit will be tracked here.
              </CardDescription>
            </div>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)} variant="outline">
                Edit Settings
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maxDiscountPercentage" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Maximum Discount Percentage (%)
            </Label>
            <Input
              id="maxDiscountPercentage"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={maxDiscountPercentage}
              onChange={(e) => setMaxDiscountPercentage(parseFloat(e.target.value) || 0)}
              disabled={!isEditing}
            />
            {isEditing && (
              <p className="text-xs text-muted-foreground">
                Current: {maxDiscountPercentage}%
              </p>
            )}
          </div>

          {!isEditing && (
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Current Limit</p>
                  <p className="text-2xl font-bold text-primary">{maxDiscountPercentage}%</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Quotations exceeding this limit will be tracked below</p>
                </div>
              </div>
            </div>
          )}

          {/* Save/Cancel Buttons */}
          {isEditing && (
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  // Reset to original settings
                  if (settings) {
                    setMaxDiscountPercentage(settings.maxDiscountPercentage || 10);
                  }
                }}
                disabled={updateSettingsMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quotations That Exceeded Discount Limit */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Quotations Exceeding Discount Limit
          </CardTitle>
          <CardDescription>
            Quotations that have discount percentage above the set limit ({maxDiscountPercentage}%)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {quotationsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : exceededQuotations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No quotations have exceeded the discount limit</p>
              <p className="text-sm">All quotations are within the {maxDiscountPercentage}% limit</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quotation #</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Discount Applied</TableHead>
                  <TableHead>Grand Total</TableHead>
                  <TableHead>Final Total</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exceededQuotations.map((quotation: any) => (
                  <TableRow key={quotation.id}>
                    <TableCell className="font-medium">
                      {quotation.quotationNumber}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{quotation.clientName}</p>
                        <p className="text-sm text-muted-foreground">{quotation.clientEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-orange-600 border-orange-200">
                            {quotation.discountType === 'percentage' 
                              ? `${quotation.discountValue}%` 
                              : `₹${quotation.discountValue?.toLocaleString('en-IN')}`
                            }
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Amount: ₹{quotation.discountAmount?.toLocaleString('en-IN')}
                        </p>
                        {quotation.discountReason && (
                          <p className="text-xs text-muted-foreground italic">
                            "{quotation.discountReason}"
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      ₹{quotation.grandTotal?.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-green-600">
                          ₹{quotation.finalTotal?.toLocaleString('en-IN')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Saved: ₹{((quotation.grandTotal || 0) - (quotation.finalTotal || 0)).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{quotation.createdBy?.name || 'System'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {quotation.createdAt ? new Date(quotation.createdAt).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}