import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Percent, IndianRupee } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface DiscountSectionProps {
  grandTotal: number;
  onDiscountApplied: (discountData: {
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    discountAmount: number;
    discountReason: string;
    discountExceedsLimit: boolean;
    finalTotal: number;
  }) => void;
}

export function DiscountSection({ grandTotal, onDiscountApplied }: DiscountSectionProps) {
  const { toast } = useToast();
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [finalTotal, setFinalTotal] = useState(grandTotal);
  const [exceedsLimit, setExceedsLimit] = useState(false);
  const [limitMessage, setLimitMessage] = useState('');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState(50000);
  const [isChecking, setIsChecking] = useState(false);

  // Fetch system settings to get current max discount percentage
  const { data: systemSettings } = useQuery({
    queryKey: ['/api/system-settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/system-settings');
      return await response.json();
    },
  });

  const maxDiscountPercentage = systemSettings?.maxDiscountPercentage || 10;

  // Update final total when grand total changes
  useEffect(() => {
    setFinalTotal(grandTotal - discountAmount);
  }, [grandTotal, discountAmount]);

  const checkDiscount = async () => {
    if (discountValue <= 0) {
      toast({
        title: "Invalid Discount",
        description: "Please enter a discount value greater than 0",
        variant: "destructive"
      });
      return;
    }


    setIsChecking(true);
    try {
      console.log('🔍 Checking discount:', { discountType: 'percentage', discountValue, grandTotal });
      const response = await apiRequest('POST', '/api/system-settings/check-discount', {
        discountType: 'percentage',
        discountValue,
        grandTotal
      });
      const responseData = await response.json();
      console.log('✅ Discount check response:', responseData);

      const { exceedsLimit: limitsExceeded, reason, discountAmount: calculatedAmount, maxDiscountPercentage: maxPct } = responseData;

      setDiscountAmount(calculatedAmount);
      setFinalTotal(grandTotal - calculatedAmount);
      setExceedsLimit(limitsExceeded);
      setLimitMessage(reason || '');

      // Notify parent component only on success
      onDiscountApplied({
        discountType: 'percentage',
        discountValue,
        discountAmount: calculatedAmount,
        discountReason: reason || '',
        discountExceedsLimit: limitsExceeded,
        finalTotal: grandTotal - calculatedAmount
      });

      toast({
        title: limitsExceeded ? "Admin Will Be Notified" : "Discount Applied",
        description: limitsExceeded 
          ? "This discount exceeds the set limit. Admin will be notified about this quotation." 
          : "Discount has been successfully applied to the quotation.",
        variant: "default"
      });

    } catch (error: any) {
      console.error('❌ Error checking discount:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status,
        response: error.response
      });
      toast({
        title: "Error",
        description: error.message || "Failed to check discount validity",
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  const clearDiscount = () => {
    setDiscountType('percentage');
    setDiscountValue(0);
    setDiscountAmount(0);
    setFinalTotal(grandTotal);
    setExceedsLimit(false);
    setLimitMessage('');
    
    onDiscountApplied({
      discountType: 'percentage',
      discountValue: 0,
      discountAmount: 0,
      discountReason: '',
      discountExceedsLimit: false,
      finalTotal: grandTotal
    });

    toast({
      title: "Discount Cleared",
      description: "Discount has been removed from the quotation."
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discount Management</CardTitle>
        <CardDescription>
          Apply discount to this quotation (Max: {maxDiscountPercentage}%)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {discountAmount === 0 && (
          <div className="space-y-2">
            <Label>Discount Percentage (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={discountValue || ''}
              onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
              placeholder="Enter discount percentage"
            />
            <p className="text-xs text-muted-foreground">
              Maximum allowed: {maxDiscountPercentage}%
            </p>
          </div>
        )}


        {discountAmount > 0 && (
          <div className="space-y-4">
            {/* Final Price Display */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 p-6 rounded-lg">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-gray-800">Final Quotation Total</h3>
                <div className="text-4xl font-bold text-green-700">
                  ₹{finalTotal.toLocaleString('en-IN')}
                </div>
                <div className="flex justify-center items-center gap-4 text-sm text-gray-600">
                  <span>Original: <span className="line-through">₹{grandTotal.toLocaleString('en-IN')}</span></span>
                  <span>•</span>
                  <span>Saved: <span className="text-red-600 font-semibold">₹{discountAmount.toLocaleString('en-IN')}</span></span>
                </div>
              </div>
            </div>

          </div>
        )}

        <div className="flex gap-2">
          {discountAmount === 0 && (
            <Button 
              type="button"
              onClick={checkDiscount}
              disabled={isChecking || discountValue <= 0}
              className="flex-1"
            >
              {isChecking ? 'Checking...' : 'Apply Discount'}
            </Button>
          )}
          {discountAmount > 0 && (
            <Button 
              type="button"
              onClick={clearDiscount}
              variant="outline"
              className="flex-1"
            >
              Clear
            </Button>
          )}
        </div>

        {exceedsLimit && (
          <Badge variant="outline" className="w-full justify-center py-2 border-orange-500 text-orange-700">
            <AlertCircle className="h-4 w-4 mr-2" />
            Admin will be notified about this discount
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

