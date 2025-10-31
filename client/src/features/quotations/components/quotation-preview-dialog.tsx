import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, Mail, Eye, X } from "lucide-react";
import { downloadWorkingQuotationPDF, type WorkingQuotationPDFData } from "@/lib/working-pdf-generator";
import type { Quotation } from "@shared/schema-client";

interface QuotationPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: Quotation;
  onSendEmail: (quotation: Quotation) => Promise<void>;
}

export default function QuotationPreviewDialog({ 
  open, 
  onOpenChange, 
  quotation, 
  onSendEmail 
}: QuotationPreviewDialogProps) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const { toast } = useToast();

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      // Convert quotation data to PDF format using actual schema
      const pdfData: WorkingQuotationPDFData = {
        quotationNumber: quotation.quotationNumber,
        quotationDate: new Date(quotation.createdAt).toLocaleDateString(),
        clientName: quotation.clientName,
        clientEmail: quotation.clientEmail,
        clientPhone: quotation.clientPhone,
        expectedGuests: quotation.expectedGuests || 0,
        
        venueRentalItems: quotation.venueRentalItems || [],
        roomPackages: quotation.roomPackages || [],
        menuPackages: quotation.menuPackages || [],
        
        venueRentalTotal: quotation.venueRentalTotal || 0,
        roomTotal: quotation.roomTotal || 0,
        menuTotal: quotation.menuTotal || 0,
        banquetTotal: quotation.banquetTotal || 0,
        grandTotal: quotation.grandTotal || 0,
        
        // GST and discount information
        includeGST: quotation.includeGST || false,
        discountType: quotation.discountType,
        discountValue: quotation.discountValue,
        discountAmount: quotation.discountAmount,
        finalTotal: quotation.finalTotal,
        
        termsAndConditions: quotation.termsAndConditions || [],
      };
      
      downloadWorkingQuotationPDF(pdfData, `quotation-${quotation.quotationNumber}.pdf`);
      toast({
        title: "PDF Downloaded",
        description: "Quotation PDF has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSendEmail = async () => {
    try {
      setIsSendingEmail(true);
      await onSendEmail(quotation);
      toast({
        title: "Email Sent",
        description: "Quotation has been sent to the customer's email.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Quotation Preview - {quotation.quotationNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">QUOTATION</CardTitle>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {quotation.quotationNumber}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Date:</strong> {new Date(quotation.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <strong>Status:</strong> 
                    <Badge variant={quotation.status === 'sent' ? 'default' : 'secondary'}>
                      {quotation.status?.toUpperCase() || 'DRAFT'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Details */}
          <Card>
            <CardHeader>
              <CardTitle>Client Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p><strong>Name:</strong> {quotation.clientName}</p>
                  <p><strong>Email:</strong> {quotation.clientEmail}</p>
                  <p><strong>Phone:</strong> {quotation.clientPhone}</p>
                </div>
                <div>
                  <p><strong>Expected Guests:</strong> {quotation.expectedGuests}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Menu Packages */}
          {quotation.menuPackages && quotation.menuPackages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Food & Beverage Packages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {quotation.menuPackages.map((pkg, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-lg">{pkg.name}</h4>
                        <div className="flex gap-2 items-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${pkg.type === 'veg' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                            <span className={`inline-flex items-center justify-center w-3.5 h-3.5 ${pkg.type === 'veg' ? 'border-green-700' : 'border-red-700'} border rounded-sm`}>
                              <span className={`${pkg.type === 'veg' ? 'bg-green-700' : 'bg-red-700'} w-1.5 h-1.5 rounded-full`} />
                            </span>
                            {pkg.type === 'veg' ? 'Veg' : 'Non-Veg'}
                          </span>
                          <Badge variant="outline">
                            ₹{(pkg.price || 0).toLocaleString()}
                          </Badge>
                        </div>
                      </div>
                      
                      {/* Menu Items Details */}
                      {pkg.selectedItems && pkg.selectedItems.length > 0 && (
                        <div className="mt-3 space-y-4">
                          {/* Package Items (included in base price) */}
                          {(() => {
                            const packageItems = pkg.selectedItems.filter((item: any) => item.isPackageItem || item.additionalPrice === 0);
                            const additionalItems = pkg.selectedItems.filter((item: any) => !item.isPackageItem && item.additionalPrice > 0);
                            
                            return (
                              <>
                                {packageItems.length > 0 && (
                                  <div>
                                    <h5 className="font-medium mb-2 text-sm text-muted-foreground">INCLUDED IN BASE PACKAGE:</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {packageItems.map((item, itemIndex) => (
                                        <div key={itemIndex} className="flex items-center text-sm py-1">
                                          <span className="text-green-600 mr-2">✓</span>
                                          <span className="text-gray-700">{item.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {additionalItems.length > 0 && (
                                  <div>
                                    <h5 className="font-medium mb-2 text-sm text-blue-600">ADDITIONAL ITEMS (EXTRA CHARGE):</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                      {additionalItems.map((item, itemIndex) => (
                                        <div key={itemIndex} className="flex justify-between items-center text-sm py-1 border-b border-blue-100 bg-blue-50 px-2 rounded">
                                          <span className="text-gray-700 font-medium">{item.name}</span>
                                          <span className="font-bold text-blue-600">+₹{(item.additionalPrice || 0).toLocaleString()}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                      
                      {/* Package Summary */}
                      <div className="mt-3 pt-3 border-t">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Base Price:</span>
                            <p className="font-medium">₹{(pkg.price || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">GST ({pkg.gst || 18}%):</span>
                            <p className="font-medium">₹{Math.round((pkg.price || 0) * (pkg.gst || 18) / 100).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Items Count:</span>
                            <p className="font-medium">{pkg.selectedItems?.length || 0}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total:</span>
                            <p className="font-medium text-green-600">₹{Math.round((pkg.price || 0) * (1 + (pkg.gst || 18) / 100)).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Venue Rental */}
          {quotation.venueRentalItems && quotation.venueRentalItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Venue Rental Packages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {quotation.venueRentalItems.map((venue, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-lg">{venue.venue}</h4>
                        <Badge variant="outline" className="text-lg px-3 py-1">
                          ₹{(venue.sessionRate || 0).toLocaleString()}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Event Date</p>
                          <p className="font-medium">{venue.eventDate ? new Date(venue.eventDate).toLocaleDateString() : 'N/A'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Venue Space</p>
                          <p className="font-medium">{venue.venueSpace}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Session</p>
                          <p className="font-medium">{venue.session}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Rate per Session</p>
                          <p className="font-medium text-green-600">₹{(venue.sessionRate || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Room Quotation */}
          {quotation.roomPackages && quotation.roomPackages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Room Accommodation Packages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {quotation.roomPackages.map((room, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-lg">{room.category}</h4>
                        <Badge variant="outline" className="text-lg px-3 py-1">
                          ₹{(room.rate || 0).toLocaleString()}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Room Category</p>
                          <p className="font-medium">{room.category}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Rate per Night</p>
                          <p className="font-medium text-green-600">₹{(room.rate || 0).toLocaleString()}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">GST (18%)</p>
                          <p className="font-medium">₹{Math.round((room.rate || 0) * 0.18).toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Total per Night (Including GST):</span>
                          <span className="font-semibold text-lg text-green-600">
                            ₹{Math.round((room.rate || 0) * 1.18).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Venue Rental Summary */}
                {quotation.venueRentalTotal > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Venue Rental</h4>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Venue Rental Total:</span>
                      <span className="font-semibold text-blue-900">₹{(quotation.venueRentalTotal || 0).toLocaleString()}</span>
                    </div>
                  </div>
                )}
                
                {/* Room Accommodation Summary */}
                {quotation.roomQuotationTotal > 0 && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-900 mb-2">Room Accommodation</h4>
                    <div className="flex justify-between">
                      <span className="text-green-700">Room Packages Total:</span>
                      <span className="font-semibold text-green-900">₹{(quotation.roomQuotationTotal || 0).toLocaleString()}</span>
                    </div>
                  </div>
                )}
                
                {/* Food & Beverage Summary */}
                {quotation.menuTotal > 0 && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-orange-900 mb-2">Food & Beverage</h4>
                    <div className="flex justify-between">
                      <span className="text-orange-700">Menu Packages Total:</span>
                      <span className="font-semibold text-orange-900">₹{(quotation.menuTotal || 0).toLocaleString()}</span>
                    </div>
                  </div>
                )}
                
                {/* Grand Total */}
                <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Grand Total:</span>
                    <span className="text-2xl font-bold text-green-600">₹{(quotation.grandTotal || 0).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">All prices include applicable taxes</p>
                </div>

                {/* Discount Section */}
                {quotation.discountAmount && quotation.discountAmount > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">Discount Applied</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">Discount Type:</span>
                        <span className="font-medium text-blue-900">
                          {quotation.discountType === 'percentage' ? `${quotation.discountValue}%` : `₹${quotation.discountValue?.toLocaleString()}`}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-blue-200">
                        <span className="font-semibold text-blue-900">Discount Amount:</span>
                        <span className="font-bold text-red-600">-₹{quotation.discountAmount.toLocaleString()}</span>
                      </div>
                      {quotation.discountExceedsLimit && (
                        <div className="bg-orange-100 p-2 rounded mt-2">
                          <p className="text-xs text-orange-800 font-medium">📧 Admin notified about this discount</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Final Total after Discount */}
                {quotation.finalTotal && quotation.finalTotal !== quotation.grandTotal && (
                  <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                    <div className="flex justify-between items-center">
                      <span className="text-xl font-bold text-green-900">Final Total (After Discount):</span>
                      <span className="text-3xl font-bold text-green-700">₹{(quotation.finalTotal || 0).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">This is the total amount payable</p>
                  </div>
                )}
                
                {/* Validity Information */}
                <div className="bg-yellow-50 p-3 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-700 font-medium">Valid Until:</span>
                    <span className="font-semibold text-yellow-900">
                      {quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : '30 days from creation'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms and Conditions */}
          {quotation.termsAndConditions && quotation.termsAndConditions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {quotation.termsAndConditions.map((term, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-muted-foreground">{index + 1}.</span>
                      <span>{term}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
              >
                <Download className="w-4 h-4 mr-2" />
                {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
              <Button
                onClick={handleSendEmail}
                disabled={isSendingEmail}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Mail className="w-4 h-4 mr-2" />
                {isSendingEmail ? 'Sending...' : 'Send Email'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
