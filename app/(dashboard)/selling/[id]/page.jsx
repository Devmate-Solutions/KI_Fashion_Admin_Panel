"use client";

import { useState, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  useSale,
  useUpdateSale,
  useMarkDelivered,
  useUpdatePayment,
  useDeleteSale,
} from "@/lib/hooks/useSales";
import CreateSaleReturnModal from "@/components/modals/CreateSaleReturnModal";
import { useAuthStore } from "@/store/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Package,
  DollarSign,
  CreditCard,
  Banknote,
  CheckCircle2,
  ArrowLeft,
  Trash2,
  User,
  MapPin,
  Truck,
  Phone,
  Mail,
  Calendar,
  Receipt,
  FileText,
  Printer,
  AlertCircle,
  RefreshCcw 
} from "lucide-react";
import toast from "react-hot-toast";
import ProductImageGallery from "@/components/ui/ProductImageGallery";

// Helper to get image array from various sources
const getImageArray = (item) => {
  if (Array.isArray(item.product?.images) && item.product.images.length > 0) {
    return item.product.images;
  }
  if (item.productImage) {
    return Array.isArray(item.productImage)
      ? item.productImage
      : [item.productImage];
  }
  return [];
};

// Format address that may be a string or object
const formatAddress = (address) => {
  if (!address) return "";
  if (typeof address === "string") return address;
  if (typeof address === "object") {
    const { street, city, state, zipCode, country } = address;
    return [street, city, state, zipCode, country].filter(Boolean).join(", ");
  }
  return String(address);
};

// Format currency
function currency(n) {
  const num = Number(n || 0);
  return `£${num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Status styles for payment status
const paymentStatusStyles = {
  pending: "bg-sky-500/15 text-sky-600 border-sky-200",
  partial: "bg-amber-500/15 text-amber-600 border-amber-200",
  paid: "bg-emerald-500/15 text-emerald-600 border-emerald-200",
  refunded: "bg-rose-500/15 text-rose-600 border-rose-200",
};

// Status styles for delivery status
const deliveryStatusStyles = {
  pending: "bg-sky-500/15 text-sky-600 border-sky-200",
  processing: "bg-blue-500/15 text-blue-600 border-blue-200",
  shipped: "bg-amber-500/15 text-amber-600 border-amber-200",
  delivered: "bg-emerald-500/15 text-emerald-600 border-emerald-200",
  cancelled: "bg-rose-500/15 text-rose-600 border-rose-200",
  returned: "bg-purple-500/15 text-purple-600 border-purple-200",
};

export default function SaleDetailPage({ params }) {
  const router = useRouter();
  const { id } = use(params);
  const saleId = id;
  const { data: saleResponse, isLoading } = useSale(saleId);
  const sale = saleResponse?.data || saleResponse;

  const updatePaymentMutation = useUpdatePayment();
  const markDeliveredMutation = useMarkDelivered();
  const deleteMutation = useDeleteSale();
  const { user } = useAuthStore();

  // Payment dialog state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentType, setPaymentType] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Delivery dialog state
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState("");

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Return dialog state
  const [showReturnModal, setShowReturnModal] = useState(false);

  // Calculate totals
  const financials = useMemo(() => {
    if (!sale) return null;

    const subtotal = sale.subtotal || 0;
    const totalDiscount = sale.totalDiscount || 0;
    const totalTax = sale.totalTax || 0;
    const shippingCost = sale.shippingCost || 0;
    const grandTotal = sale.grandTotal || 0;
    const cashPayment = sale.cashPayment || 0;
    const bankPayment = sale.bankPayment || 0;
    const totalPaid = cashPayment + bankPayment;
    const remainingBalance = grandTotal - totalPaid;

    return {
      subtotal,
      totalDiscount,
      totalTax,
      shippingCost,
      grandTotal,
      cashPayment,
      bankPayment,
      totalPaid,
      remainingBalance,
    };
  }, [sale]);

  // Get customer info
  const customer = useMemo(() => {
    if (!sale) return null;

    if (sale.buyer) {
      return {
        name: sale.buyer.name || sale.buyer.company || "N/A",
        phone: sale.buyer.phone
          ? `${sale.buyer.phoneAreaCode || ""}${sale.buyer.phone}`
          : null,
        email: sale.buyer.email,
        address: sale.buyer.address,
        type: "registered",
      };
    }

    if (sale.manualCustomer) {
      return {
        name: sale.manualCustomer.name || "N/A",
        phone: sale.manualCustomer.phone
          ? `${sale.manualCustomer.phoneAreaCode || ""}${sale.manualCustomer.phone}`
          : null,
        email: sale.manualCustomer.email,
        address: sale.manualCustomer.address,
        type: "manual",
      };
    }

    return { name: "Walk-in Customer", type: "walk-in" };
  }, [sale]);

  // Handle payment update
  const handlePaymentUpdate = () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    const paymentData = {
      amount,
      paymentType,
      notes: paymentNotes,
    };

    updatePaymentMutation.mutate(
      { id: saleId, data: paymentData },
      {
        onSuccess: () => {
          setShowPaymentDialog(false);
          setPaymentAmount("");
          setPaymentType("cash");
          setPaymentNotes("");
        },
      }
    );
  };

  // Handle mark as delivered
  const handleMarkDelivered = () => {
    markDeliveredMutation.mutate(
      {
        id: saleId,
        data: {
          deliveryNotes,
          deliveredAt: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          setShowDeliveryDialog(false);
          setDeliveryNotes("");
        },
      }
    );
  };

  // Handle delete
  const handleDelete = () => {
    deleteMutation.mutate(saleId, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        router.push("/selling");
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push("/selling")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Sales
          </Button>
        </div>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold">Sale Not Found</h2>
          <p className="text-muted-foreground mt-2">
            The sale you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push("/selling")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">
              Sale: {sale.saleNumber || `#${String(sale._id).slice(-6)}`}
            </h1>
            <p className="text-sm text-muted-foreground">
              {sale.saleDate
                ? new Date(sale.saleDate).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
                : "—"}
              {sale.invoiceNumber && ` • Invoice: ${sale.invoiceNumber}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={
              paymentStatusStyles[sale.paymentStatus] ||
              paymentStatusStyles.pending
            }
          >
            {sale.paymentStatus?.toUpperCase() || "PENDING"}
          </Badge>
          <Badge
            variant="outline"
            className={
              deliveryStatusStyles[sale.deliveryStatus] ||
              deliveryStatusStyles.pending
            }
          >
            {sale.deliveryStatus?.replace(/_/g, " ").toUpperCase() || "PENDING"}
          </Badge>
        </div>
      </div>

      {/* Customer Information */}
      <Accordion
        type="single"
        collapsible
        defaultValue="customer-info"
        className="border border-blue-200 rounded-lg bg-blue-50/30"
      >
        <AccordionItem value="customer-info" className="border-b-0">
          <AccordionTrigger className="px-4 hover:no-underline bg-blue-50/50 rounded-t-lg">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-blue-900">
                Customer Information
              </span>
              {customer?.type === "manual" && (
                <Badge className="bg-blue-500/15 text-blue-600 border-blue-200 text-xs ml-2">
                  Manual Sale
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 bg-white/60 rounded-b-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Customer Name
                </Label>
                <p className="font-medium text-sm">{customer?.name || "—"}</p>
              </div>
              {customer?.phone && (
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Phone
                  </Label>
                  <p className="font-medium text-sm">{customer.phone}</p>
                </div>
              )}
              {customer?.email && (
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </Label>
                  <p className="font-medium text-sm">{customer.email}</p>
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Sale Date
                </Label>
                <p className="font-medium text-sm">
                  {sale.saleDate
                    ? new Date(sale.saleDate).toLocaleDateString("en-GB")
                    : "—"}
                </p>
              </div>
              {/* Payment Method hidden for simplified view */}
              {/* Address, Sale Type and Notes intentionally hidden for simplified view */}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Delivery Information */}
      {(sale.deliveryAddress || sale.deliveryPersonnel) && (
        <Accordion
          type="single"
          collapsible
          defaultValue="delivery-info"
          className="border border-green-200 rounded-lg bg-green-50/30"
        >
          <AccordionItem value="delivery-info" className="border-b-0">
            <AccordionTrigger className="px-4 hover:no-underline bg-green-50/50 rounded-t-lg">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-green-900">
                  Delivery Information
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 bg-white/60 rounded-b-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                {sale.deliveryAddress && (
                  <>
                    {sale.deliveryAddress.street && (
                      <div className="col-span-2">
                        <Label className="text-xs text-muted-foreground">
                          Street Address
                        </Label>
                        <p className="font-medium text-sm">
                          {sale.deliveryAddress.street}
                        </p>
                      </div>
                    )}
                    {sale.deliveryAddress.city && (
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          City
                        </Label>
                        <p className="font-medium text-sm">
                          {sale.deliveryAddress.city}
                        </p>
                      </div>
                    )}
                    {sale.deliveryAddress.state && (
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          State
                        </Label>
                        <p className="font-medium text-sm">
                          {sale.deliveryAddress.state}
                        </p>
                      </div>
                    )}
                    {sale.deliveryAddress.zipCode && (
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Zip Code
                        </Label>
                        <p className="font-medium text-sm">
                          {sale.deliveryAddress.zipCode}
                        </p>
                      </div>
                    )}
                    {sale.deliveryAddress.country && (
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Country
                        </Label>
                        <p className="font-medium text-sm">
                          {sale.deliveryAddress.country}
                        </p>
                      </div>
                    )}
                  </>
                )}
                {sale.deliveryPersonnel && (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Delivery Personnel
                      </Label>
                      <p className="font-medium text-sm">
                        {sale.deliveryPersonnel.name || "—"}
                      </p>
                    </div>
                    {sale.deliveryPersonnel.phone && (
                      <div>
                        <Label className="text-xs text-muted-foreground">
                          Personnel Phone
                        </Label>
                        <p className="font-medium text-sm">
                          {sale.deliveryPersonnel.phone}
                        </p>
                      </div>
                    )}
                  </>
                )}
                {sale.deliveryDate && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Expected Delivery
                    </Label>
                    <p className="font-medium text-sm">
                      {new Date(sale.deliveryDate).toLocaleDateString("en-GB")}
                    </p>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Items Section */}
      <Accordion
        type="single"
        collapsible
        defaultValue="items"
        className="border border-purple-200 rounded-lg bg-purple-50/30"
      >
        <AccordionItem value="items" className="border-b-0">
          <AccordionTrigger className="px-4 hover:no-underline bg-purple-50/50 rounded-t-lg">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-600" />
                <span className="font-semibold text-purple-900">
                  Items ({sale.items?.length || 0})
                </span>
              </div>
              <div className="text-sm text-purple-700 font-medium">
                {sale.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0} units • {currency(financials?.grandTotal || 0)}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-4 bg-white/60 rounded-b-lg">
            <div className="border-t border-purple-200 mx-4 pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-purple-100/50 border-b-2 border-purple-200">
                    <tr>
                      <th className="p-2 text-left text-purple-900 font-semibold">
                        Image
                      </th>
                      <th className="p-2 text-left text-purple-900 font-semibold">
                        Product
                      </th>
                      <th className="p-2 text-left text-purple-900 font-semibold">
                        SKU
                      </th>
                      <th className="p-2 text-left text-purple-900 font-semibold">
                        Variant / Packet
                      </th>
                      <th className="p-2 text-right text-purple-900 font-semibold">
                        Qty
                      </th>
                      <th className="p-2 text-right text-purple-900 font-semibold">
                        Unit Price
                      </th>
                      <th className="p-2 text-right text-purple-900 font-semibold">
                        Discount
                      </th>
                      <th className="p-2 text-right text-purple-900 font-semibold">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items?.map((item, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-purple-100 ${idx % 2 === 0 ? "bg-white" : "bg-purple-50/20"
                          }`}
                      >
                        <td className="p-2">
                          <ProductImageGallery
                            images={getImageArray(item)}
                            alt={item.product?.name || "Product"}
                            size="sm"
                            maxVisible={1}
                            showCount={false}
                          />
                        </td>
                        <td className="p-2">
                          <div className="font-medium">{item.product?.name || item.productCode || "—"}</div>
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {item.product?.sku || "—"}
                        </td>
                        <td className="p-2">
                          {item.isPacketSale ? (
                            <div className="text-sm font-medium text-blue-600">{item.packetBarcode || 'Packet'}</div>
                          ) : (
                            <div className="text-sm font-medium text-amber-600">Loose Item</div>
                          )}
                        </td>
                        <td className="p-2 text-right font-medium">{item.quantity || 0}</td>
                        <td className="p-2 text-right">
                          {currency(item.unitPrice || 0)}
                        </td>
                        <td className="p-2 text-right text-red-600">
                          {item.discount ? `-${currency(item.discount)}` : "—"}
                        </td>
                        <td className="p-2 text-right font-semibold">{currency(item.totalPrice || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Payment Summary Card */}
      <Card className="border-amber-200 bg-amber-50/30">
        <CardHeader className="bg-amber-50/50 rounded-t-lg">
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <DollarSign className="h-5 w-5 text-amber-600" />
            Payment Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Subtotal</Label>
              <p className="font-medium text-lg">{currency(financials?.subtotal || 0)}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Discount</Label>
              <p className="font-medium text-lg text-red-600">-{currency(financials?.totalDiscount || 0)}</p>
            </div>
          </div>

          <div className="border-t border-amber-200 mt-4 pt-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground font-semibold">
                  Grand Total
                </Label>
                <p className="font-bold text-xl text-amber-900">
                  {currency(financials?.grandTotal || 0)}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Banknote className="h-3 w-3" /> Cash Payment
                </Label>
                <p className="font-medium text-lg text-green-600">
                  {currency(financials?.cashPayment || 0)}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <CreditCard className="h-3 w-3" /> Bank Payment
                </Label>
                <p className="font-medium text-lg text-green-600">
                  {currency(financials?.bankPayment || 0)}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-semibold">
                  Remaining Balance
                </Label>
                <p
                  className={`font-bold text-xl ${(financials?.remainingBalance || 0) > 0
                    ? "text-red-600"
                    : "text-green-600"
                    }`}
                >
                  {currency(financials?.remainingBalance || 0)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2 flex-wrap border-t border-amber-200 bg-amber-50/30 rounded-b-lg">
          <Button onClick={() => setShowPaymentDialog(true)} className="bg-green-600 hover:bg-green-700">
            <Banknote className="h-4 w-4 mr-2" />
            Add Payment
          </Button>

          <Button onClick={() => setShowReturnModal(true)} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Create Return
          </Button>
          {/* Mark Delivered, View Invoice and Delete Sale buttons hidden for simplified view */}
        </CardFooter>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-green-600" />
              Add Payment
            </DialogTitle>
            <DialogDescription>
              Record a new payment for this sale. Remaining balance:{" "}
              {currency(financials?.remainingBalance || 0)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="paymentAmount">Payment Amount (£)</Label>
              <Input
                id="paymentAmount"
                type="number"
                min="0"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="paymentType">Payment Type</Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select payment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="paymentNotes">Notes (Optional)</Label>
              <Textarea
                id="paymentNotes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Add any notes about this payment..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePaymentUpdate}
              disabled={updatePaymentMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updatePaymentMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery Dialog */}
      <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-600" />
              Mark as Delivered
            </DialogTitle>
            <DialogDescription>
              Confirm that this sale has been delivered to the customer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="deliveryNotes">Delivery Notes (Optional)</Label>
              <Textarea
                id="deliveryNotes"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Add any notes about the delivery..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeliveryDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkDelivered}
              disabled={markDeliveredMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {markDeliveredMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Confirm Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Delete Sale
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this sale? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Sale Number:{" "}
              <span className="font-medium text-foreground">
                {sale.saleNumber || `#${String(sale._id).slice(-6)}`}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              Customer:{" "}
              <span className="font-medium text-foreground">
                {customer?.name}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              Total:{" "}
              <span className="font-medium text-foreground">
                {currency(financials?.grandTotal || 0)}
              </span>
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Sale
            </Button>
          </DialogFooter>
        </DialogContent>

      </Dialog>

      {/* Create Return Modal */}
      <CreateSaleReturnModal
        open={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        sale={sale}
      />
    </div >
  );
}
