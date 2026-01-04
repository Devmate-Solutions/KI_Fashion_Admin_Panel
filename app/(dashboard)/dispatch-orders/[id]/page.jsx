"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useDispatchOrder,
  useConfirmDispatchOrder,
  useSubmitApproval,
  useReturnDispatchItems,
  useDeleteDispatchOrder,
} from "@/lib/hooks/useDispatchOrders";
import { useAuthStore } from "@/store/store";
import { ledgerAPI } from "@/lib/api/endpoints/ledger";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSuppliers } from "@/lib/hooks/useSuppliers";
import { useLogisticsCompanies } from "@/lib/hooks/useLogisticsCompanies";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  Plus,
  Info,
  Package,
  DollarSign,
  CreditCard,
  Banknote,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Trash2,
  Edit,
  AlertCircle,
  Pencil,
} from "lucide-react";
import toast from "react-hot-toast";
import ProductImageGallery from "@/components/ui/ProductImageGallery";
import PacketCompositionView from "@/components/ui/PacketCompositionView";
import ArrayInput from "@/components/ui/ArrayInput";
import PacketConfigurationModal from "@/components/modals/PacketConfigurationModal";

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

const statusStyles = {
  pending: "bg-sky-500/15 text-sky-600 border-sky-200",
  "pending-approval": "bg-amber-500/15 text-amber-600 border-amber-200",
  confirmed: "bg-emerald-500/15 text-emerald-600 border-emerald-200",
  picked_up: "bg-blue-500/15 text-blue-600 border-blue-200",
  in_transit: "bg-amber-500/15 text-amber-600 border-amber-200",
  delivered: "bg-green-500/15 text-green-600 border-green-200",
  cancelled: "bg-rose-500/15 text-rose-600 border-rose-200",
};

export default function DispatchOrderDetailPage({ params }) {
  const router = useRouter();
  const dispatchOrderId = params.id;
  const { data: dispatchOrder, isLoading } = useDispatchOrder(dispatchOrderId);
  const confirmMutation = useConfirmDispatchOrder();
  const submitApprovalMutation = useSubmitApproval();
  const returnMutation = useReturnDispatchItems();
  const deleteMutation = useDeleteDispatchOrder();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super-admin';
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState("confirm");
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [returnQuantities, setReturnQuantities] = useState({});
  const [returnReasons, setReturnReasons] = useState({});
  const [cashPayment, setCashPayment] = useState("0");
  const [bankPayment, setBankPayment] = useState("0");
  const [exchangeRate, setExchangeRate] = useState("1.0");
  const [percentage, setPercentage] = useState("0");
  const [returnNotes, setReturnNotes] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [showAllReturnItems, setShowAllReturnItems] = useState(false);

  // Editable order fields state (supplier is NOT editable)
  const [editedLogisticsCompany, setEditedLogisticsCompany] = useState(null);
  const [editedDispatchDate, setEditedDispatchDate] = useState("");
  const [editedDiscount, setEditedDiscount] = useState("0");
  const [editedTotalBoxes, setEditedTotalBoxes] = useState("0");
  const [totalBoxesConfirmed, setTotalBoxesConfirmed] = useState(false);

  // Item verification and editing state
  const [itemVerifications, setItemVerifications] = useState({}); // {itemIndex: boolean}
  const [editedItems, setEditedItems] = useState({}); // {itemIndex: {productName, productCode, quantity, costPrice, primaryColor, images}}
  const [itemsToRemove, setItemsToRemove] = useState([]); // [itemIndex]
  const [newItems, setNewItems] = useState([]); // [{productName, productCode, quantity, costPrice, primaryColor, images}]
  const [showAddItemForm, setShowAddItemForm] = useState(false);

  // Track which order field is being edited (for double-click editing)
  const [editingField, setEditingField] = useState(null); // 'logisticsCompany', 'dispatchDate', 'discount', null

  // Packet composition dialog state
  const [packetDialogOpen, setPacketDialogOpen] = useState(false);
  const [selectedItemForPackets, setSelectedItemForPackets] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const queryClient = useQueryClient();

  // Fetch data for dropdowns
  const { data: suppliers = [] } = useSuppliers();
  const { data: logisticsCompanies = [] } = useLogisticsCompanies();

  // Preset return reasons
  const PRESET_RETURN_REASONS = [
    "Defective",
    "Wrong item",
    "Damaged in transit",
    "Quality issue",
    "Size mismatch",
    "Color mismatch",
    "Customer cancellation",
    "Other",
  ];

  // Fetch payment history for this dispatch order (only when order is confirmed)
  const { data: paymentHistory = [] } = useQuery({
    queryKey: ["dispatch-order-payments", dispatchOrderId],
    queryFn: async () => {
      if (!dispatchOrder || !dispatchOrder.supplier?._id) return [];
      try {
        const response = await ledgerAPI.getSupplierLedger(
          dispatchOrder.supplier._id,
          { limit: 100 }
        );
        const entries =
          response?.data?.data?.entries || response?.data?.entries || [];
        // Filter entries for this dispatch order
        return entries.filter(
          (entry) =>
            entry.referenceModel === "DispatchOrder" &&
            entry.referenceId === dispatchOrderId &&
            entry.transactionType === "payment"
        );
      } catch (error) {
        console.error("Error fetching payment history:", error);
        return [];
      }
    },
    enabled:
      !!dispatchOrder &&
      !!dispatchOrderId &&
      dispatchOrder?.status === "confirmed",
  });

  // Calculate values that depend on dispatchOrder (safe to use even if undefined)
  // Must be declared before useQuery hooks that use them
  const isConfirmed = dispatchOrder?.status === "confirmed";
  const isPending = dispatchOrder?.status === "pending" || dispatchOrder?.status === "pending-approval";
  const canEdit = isPending; // Both pending and pending-approval can be edited

  // Fetch supplier's total balance (for Add Payment form)
  const { data: supplierLedgerData } = useQuery({
    queryKey: ["supplier-total-balance", dispatchOrder?.supplier?._id],
    queryFn: async () => {
      if (!dispatchOrder || !dispatchOrder.supplier?._id) return null;
      try {
        const response = await ledgerAPI.getSupplierLedger(
          dispatchOrder.supplier._id,
          { limit: 1000 }
        );
        const backendResponse = response?.data || response;
        const ledgerData = backendResponse?.data || backendResponse;
        return {
          totalRemainingBalance: ledgerData?.totalRemainingBalance || 0,
          totalOutstandingBalance: ledgerData?.totalOutstandingBalance || 0,
        };
      } catch (error) {
        console.error("Error fetching supplier total balance:", error);
        return null;
      }
    },
    enabled:
      !!dispatchOrder &&
      !!dispatchOrder.supplier?._id &&
      showPaymentForm &&
      isConfirmed,
  });

  // Calculate supplier's total balance
  const supplierTotalBalance = useMemo(() => {
    if (!supplierLedgerData) return 0;
    return (
      (supplierLedgerData.totalRemainingBalance || 0) -
      (supplierLedgerData.totalOutstandingBalance || 0)
    );
  }, [supplierLedgerData]);

  // Initialize exchange rate and percentage from dispatch order or defaults
  useEffect(() => {
    if (dispatchOrder && isPending) {
      setExchangeRate(String(dispatchOrder.exchangeRate || 1.0));
      setPercentage(String(dispatchOrder.percentage || 0));
      setEditedDiscount(String(dispatchOrder.totalDiscount || 0));
      setEditedTotalBoxes(String(dispatchOrder.totalBoxes || 0));
      setTotalBoxesConfirmed(!!dispatchOrder.isTotalBoxesConfirmed);

      // Initialize financials from paymentDetails (drafts)
      if (dispatchOrder.paymentDetails) {
        setCashPayment(String(dispatchOrder.paymentDetails.cashPayment || 0));
        setBankPayment(String(dispatchOrder.paymentDetails.bankPayment || 0));
      }

      // Initialize order fields (supplier remains uneditable - use original value)
      if (dispatchOrder.logisticsCompany) {
        setEditedLogisticsCompany(
          dispatchOrder.logisticsCompany._id || dispatchOrder.logisticsCompany
        );
      }
      if (dispatchOrder.dispatchDate) {
        // Format date for input field (YYYY-MM-DD)
        const date = new Date(dispatchOrder.dispatchDate);
        const formatted = date.toISOString().split("T")[0];
        setEditedDispatchDate(formatted);
      }

      // Initialize item verifications (all unchecked initially)
      const initialVerifications = {};
      dispatchOrder.items?.forEach((item, index) => {
        initialVerifications[index] = false;
      });
      setItemVerifications(initialVerifications);

      // Initialize edited items with current values
      const initialItems = {};
      dispatchOrder.items?.forEach((item, index) => {
        initialItems[index] = {
          productName: item.productName || "",
          productCode: item.productCode || "",
          quantity: item.quantity || 0,
          costPrice: item.costPrice || 0,
          primaryColor: Array.isArray(item.primaryColor)
            ? item.primaryColor
            : item.primaryColor
              ? [item.primaryColor]
              : [],
          size: Array.isArray(item.size)
            ? item.size
            : item.size
              ? [item.size]
              : [],
          images: item.productImage || item.product?.images || [],
          packets: item.packets || [],
          useVariantTracking: item.useVariantTracking || false,
          boxStr: item.boxes?.map((b) => b.boxNumber).join(", ") || "",
        };
      });
      setEditedItems(initialItems);
    }
  }, [dispatchOrder, isPending]);

  // Calculate confirmed quantities and landed prices
  // For pending orders, use the input values; for confirmed orders, use stored values
  const currentExchangeRate = isPending
    ? parseFloat(exchangeRate) || 1.0
    : dispatchOrder?.exchangeRate || 1.0;
  const currentPercentage = isPending
    ? parseFloat(percentage) || 0
    : dispatchOrder?.percentage || 0;

  const itemsWithDetails = useMemo(() => {
    // Start with existing items
    const existing = (dispatchOrder?.items || []).map((item, index) => {
      const totalReturned =
        dispatchOrder?.returnedItems
          ?.filter((returned) => returned.itemIndex === index)
          .reduce((sum, returned) => sum + returned.quantity, 0) || 0;

      // Calculate confirmed quantity (remaining after returns)
      let confirmedQty;
      if (totalReturned > 0) {
        const confirmedQtyFromBackend = dispatchOrder?.confirmedQuantities?.find(
          (cq) => cq.itemIndex === index
        )?.quantity;
        if (
          confirmedQtyFromBackend !== undefined &&
          confirmedQtyFromBackend !== null
        ) {
          confirmedQty = confirmedQtyFromBackend;
        } else {
          confirmedQty = Math.max(0, item.quantity - totalReturned);
        }
      } else if (isPending) {
        confirmedQty = item.quantity;
      } else {
        const confirmedQtyFromBackend = dispatchOrder?.confirmedQuantities?.find(
          (cq) => cq.itemIndex === index
        )?.quantity;
        confirmedQty =
          confirmedQtyFromBackend !== undefined &&
            confirmedQtyFromBackend !== null
            ? confirmedQtyFromBackend
            : item.quantity;
      }

      // Use edited values if available (for pending orders), otherwise use original
      const itemData =
        isPending && editedItems[index] ? editedItems[index] : item;
      const costPrice = parseFloat(itemData.costPrice) || 0;

      const quantity = isPending
        ? Math.max(0, (parseFloat(itemData.quantity) || 0) - totalReturned)
        : confirmedQty;

      const supplierPaymentAmount = isPending
        ? costPrice / currentExchangeRate
        : item.supplierPaymentAmount || costPrice / currentExchangeRate;

      const landedPrice = isPending
        ? (costPrice / currentExchangeRate) * (1 + currentPercentage / 100)
        : item.landedPrice ||
        (costPrice / currentExchangeRate) * (1 + currentPercentage / 100);

      return {
        ...item,
        ...itemData, // Include edited values
        index,
        originalIndex: index,
        totalReturned,
        confirmedQty: quantity,
        supplierPaymentAmount,
        supplierPaymentItemTotal: costPrice * quantity,
        landedPrice,
        itemTotal: landedPrice * quantity,
        isNew: false,
        isRemoved: itemsToRemove.includes(index)
      };
    });

    // Add new items (only if in pending state)
    let allItems = [...existing];
    if (isPending) {
      const newItemEntries = newItems.map((item, index) => {
        const costPrice = parseFloat(item.costPrice) || 0;
        const quantity = parseFloat(item.quantity) || 0;
        const supplierPaymentAmount = costPrice / currentExchangeRate;
        const landedPrice = (costPrice / currentExchangeRate) * (1 + currentPercentage / 100);

        return {
          ...item,
          index: -1 - index, // Negative index for new items to distinguish
          originalIndex: null,
          totalReturned: 0,
          confirmedQty: quantity,
          supplierPaymentAmount,
          supplierPaymentItemTotal: costPrice * quantity,
          landedPrice,
          itemTotal: landedPrice * quantity,
          isNew: true,
          isRemoved: false,
          productImage: item.images || item.productImage || [] // Mapping field name
        };
      });
      allItems = [...allItems, ...newItemEntries];
    }

    return allItems;
  }, [dispatchOrder, isPending, editedItems, newItems, itemsToRemove, currentExchangeRate, currentPercentage]);

  // Calculate totals with safe defaults - REACTIVE to edited values
  // Only include items that are not removed
  const activeItemsWithDetails = useMemo(() => {
    return itemsWithDetails.filter(item => !item.isRemoved);
  }, [itemsWithDetails]);

  const packetConfigItems = useMemo(() => {
    return activeItemsWithDetails.map((item, idx) => {
      const itemData =
        isPending && editedItems[item.index] ? editedItems[item.index] : item;
      return {
        id: String(item.index ?? idx),
        index: item.index ?? idx,
        productName:
          itemData.productName || itemData.productCode || `Item ${idx + 1}`,
        productCode: itemData.productCode,
        quantity: parseFloat(itemData.quantity) || 0,
        primaryColor: itemData.primaryColor || [],
        size: itemData.size || [],
        packets: itemData.packets || [],
      };
    });
  }, [activeItemsWithDetails, editedItems, isPending]);

  // Supplier payment total in supplier currency (cost price × quantity for all active items)
  // For confirmed orders, use confirmedQty which accounts for returned items
  const supplierPaymentTotal = useMemo(() => {
    let total = 0;

    // Add active existing items (with edited values)
    activeItemsWithDetails.forEach((item) => {
      const itemData =
        isPending && editedItems[item.index] ? editedItems[item.index] : item;
      const costPrice = parseFloat(itemData.costPrice) || 0;
      // ALWAYS use confirmedQty (which accounts for returns) for financial totals
      const quantity = item.confirmedQty || 0;
      total += costPrice * quantity;
    });

    // Add new items
    newItems.forEach((item) => {
      const costPrice = parseFloat(item.costPrice) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      total += costPrice * quantity;
    });

    return total;
  }, [activeItemsWithDetails, editedItems, newItems, isPending]);

  // Landed price total - REACTIVE
  // For confirmed orders, use confirmedQty which accounts for returned items
  const landedPriceTotal = useMemo(() => {
    let total = 0;

    // Add active existing items (with edited values)
    activeItemsWithDetails.forEach((item) => {
      const itemData =
        isPending && editedItems[item.index] ? editedItems[item.index] : item;
      const costPrice = parseFloat(itemData.costPrice) || 0;
      // ALWAYS use confirmedQty (which accounts for returns) for financial totals
      const quantity = item.confirmedQty || 0;
      const landedPrice =
        (costPrice / currentExchangeRate) * (1 + currentPercentage / 100);
      total += landedPrice * quantity;
    });

    // Add new items
    newItems.forEach((item) => {
      const costPrice = parseFloat(item.costPrice) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      const landedPrice =
        (costPrice / currentExchangeRate) * (1 + currentPercentage / 100);
      total += landedPrice * quantity;
    });

    return total;
  }, [
    activeItemsWithDetails,
    editedItems,
    newItems,
    currentExchangeRate,
    currentPercentage,
    isPending,
  ]);

  // Supplier payment before discount (for display) - always ensure it's defined and REACTIVE
  // For confirmed orders, recalculate from items using confirmedQty (accounts for returns)
  const supplierPaymentBeforeDiscount = useMemo(() => {
    if (isPending) {
      // For pending orders, convert supplier currency total to EUR (REACTIVE to edited values)
      return currentExchangeRate > 0
        ? supplierPaymentTotal / currentExchangeRate
        : 0;
    } else {
      // For confirmed orders, recalculate from items using confirmedQty (which accounts for returns)
      // Convert supplierPaymentTotal (in supplier currency) to EUR
      return currentExchangeRate > 0
        ? supplierPaymentTotal / currentExchangeRate
        : 0;
    }
  }, [isPending, supplierPaymentTotal, currentExchangeRate]);

  // For payment calculations, use supplierPaymentTotal minus discount (what admin owes supplier after discount)
  // Discount is now editable by admin - REACTIVE to editedDiscount
  const discountInEur = useMemo(() => {
    if (isPending) {
      // For pending orders, calculate proportional discount if returns exist
      let discount = parseFloat(editedDiscount) || 0;

      if (
        dispatchOrder?.returnedItems &&
        dispatchOrder.returnedItems.length > 0
      ) {
        let originalAmount = 0;
        dispatchOrder?.items?.forEach((item) => {
          const costPrice = parseFloat(item.costPrice) || 0;
          originalAmount += costPrice * item.quantity;
        });
        const originalDiscount = dispatchOrder.totalDiscount || 0;
        const discountPercentage =
          originalAmount > 0 ? originalDiscount / originalAmount : 0;
        discount = supplierPaymentTotal * discountPercentage;
      }

      return currentExchangeRate > 0 ? discount / currentExchangeRate : 0;
    } else {
      // For confirmed orders, totalDiscount is already in EUR
      return dispatchOrder?.totalDiscount || 0;
    }
  }, [
    isPending,
    editedDiscount,
    currentExchangeRate,
    dispatchOrder,
    supplierPaymentTotal,
  ]);

  // Total amount in EUR (what admin owes supplier after discount) - REACTIVE
  // For confirmed orders, this should reflect remaining value after returns
  const totalAmount = useMemo(() => {
    return supplierPaymentBeforeDiscount - discountInEur;
  }, [supplierPaymentBeforeDiscount, discountInEur]);

  // Calculate remaining items count and total value after returns (for display)
  const remainingItemsSummary = useMemo(() => {
    if (isPending && !dispatchOrder?.returnedItems?.length) {
      // For pending orders with no returns, show all items
      const totalItemsRows = activeItemsWithDetails.length + newItems.length;
      const totalQuantity =
        activeItemsWithDetails.reduce(
          (sum, item) => sum + (parseFloat(item.quantity) || 0),
          0
        ) +
        newItems.reduce(
          (sum, item) => sum + (parseFloat(item.quantity) || 0),
          0
        );
      return {
        rows: totalItemsRows,
        quantity: totalQuantity,
        value: totalAmount,
      };
    } else {
      // For orders with returns or confirmed orders, calculate remaining
      let remainingRows = 0;
      let remainingQuantity = 0;
      let remainingValue = 0;

      activeItemsWithDetails.forEach((item) => {
        const remainingQty = item.confirmedQty || 0;
        if (remainingQty > 0) {
          remainingRows++;
          remainingQuantity += remainingQty;
          // Calculate item value using confirmed quantity
          const costPrice = parseFloat(item.costPrice) || 0;
          const landedPrice =
            (costPrice / currentExchangeRate) * (1 + currentPercentage / 100);
          remainingValue += landedPrice * remainingQty;
        }
      });

      return {
        rows: remainingRows,
        quantity: remainingQuantity,
        value: remainingValue,
      };
    }
  }, [
    isPending,
    activeItemsWithDetails,
    newItems,
    totalAmount,
    currentExchangeRate,
    currentPercentage,
    dispatchOrder?.returnedItems,
  ]);

  const remainingBalance = dispatchOrder?.paymentDetails?.remainingBalance || 0;
  // Calculate supplier due (negative remaining balance means we overpaid, supplier owes us)
  const supplierDue = remainingBalance < 0 ? Math.abs(remainingBalance) : 0;
  // Allow adding payments for confirmed orders (even if fully paid or overpaid)
  const canAddPayment = isConfirmed;

  // Calculate supplier currency values for Confirm Order section (no exchange rate, no percentage)
  const confirmOrderSupplierCurrency = useMemo(() => {
    // Supplier Payment Amount in Supplier Currency
    let supplierPaymentAmount = 0;
    if (isPending) {
      // For pending orders, use supplierPaymentTotal (already sum of cost × qty)
      supplierPaymentAmount = supplierPaymentTotal;
    } else {
      // For confirmed orders, recalculate from items: sum(costPrice × confirmedQty)
      dispatchOrder?.items?.forEach((item, index) => {
        const confirmedQty =
          dispatchOrder?.confirmedQuantities?.find(
            (cq) => cq.itemIndex === index
          )?.quantity ||
          item.quantity -
          (dispatchOrder?.returnedItems
            ?.filter((r) => r.itemIndex === index)
            .reduce((sum, r) => sum + r.quantity, 0) || 0);
        const costPrice = parseFloat(item.costPrice) || 0;
        supplierPaymentAmount += costPrice * confirmedQty;
      });
    }

    // Discount in Supplier Currency
    let discount = 0;
    if (isPending) {
      const currentDiscountValue = parseFloat(editedDiscount) || 0;

      // If returns exist, calculate the proportional discount based on the original discount percentage
      if (
        dispatchOrder?.returnedItems &&
        dispatchOrder.returnedItems.length > 0
      ) {
        // Calculate original total from items (before returns)
        let originalAmount = 0;
        dispatchOrder?.items?.forEach((item) => {
          const costPrice = parseFloat(item.costPrice) || 0;
          originalAmount += costPrice * item.quantity;
        });

        // Original discount from the order
        const originalDiscount = dispatchOrder.totalDiscount || 0;

        // Calculate original discount percentage
        const discountPercentage =
          originalAmount > 0 ? originalDiscount / originalAmount : 0;

        // Apply same percentage to the new remaining amount
        discount = supplierPaymentAmount * discountPercentage;
      } else {
        discount = currentDiscountValue;
      }
    } else {
      discount = dispatchOrder?.totalDiscount || 0; // Stored in supplier currency
    }

    // Final Amount
    const finalAmount = supplierPaymentAmount - discount;

    // Payments in Supplier Currency
    let payments = 0;
    if (isPending) {
      // For pending orders, cashPayment and bankPayment are already in supplier currency
      payments =
        (parseFloat(cashPayment) || 0) + (parseFloat(bankPayment) || 0);
    } else {
      // For confirmed orders, calculate total payments from payment history and convert to supplier currency
      const exchangeRate = dispatchOrder?.exchangeRate || 1;
      // Calculate total payments from payment history (more accurate than paymentDetails)
      const totalPaidEur =
        paymentHistory?.reduce((sum, entry) => {
          return sum + (entry.credit || 0);
        }, 0) || 0;
      // Convert from EUR to supplier currency
      payments = totalPaidEur * exchangeRate;
    }

    // Remaining Balance
    const remaining = finalAmount - payments;

    return {
      supplierPaymentAmount,
      discount,
      finalAmount,
      payments,
      remainingBalance: remaining,
    };
  }, [
    isPending,
    isConfirmed,
    supplierPaymentTotal,
    editedDiscount,
    dispatchOrder?.items,
    dispatchOrder?.confirmedQuantities,
    dispatchOrder?.returnedItems,
    dispatchOrder?.totalDiscount,
    dispatchOrder?.exchangeRate,
    dispatchOrder?.paymentDetails,
    cashPayment,
    bankPayment,
    paymentHistory,
  ]);

  // Filter returnable items
  const returnableItems = itemsWithDetails.filter((item) => {
    const remainingQty = item.quantity - item.totalReturned;
    return showAllReturnItems || remainingQty > 0;
  });

  // Format currency
  function currency(n) {
    const num = Number(n || 0);
    return `£${num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // Validation function
  const validateOrderBeforeConfirm = useCallback(() => {
    const errors = [];

    // Check order-level fields (supplier is not editable, so we check the original)
    if (!dispatchOrder?.supplier) {
      errors.push("Supplier is required");
    }
    if (!editedLogisticsCompany) {
      errors.push("Logistics company is required");
    }
    if (!editedDispatchDate) {
      errors.push("Dispatch date is required");
    }
    if (!exchangeRate || parseFloat(exchangeRate) <= 0) {
      errors.push("Exchange rate must be greater than 0");
    }

    // Get active items (not removed)
    const activeItems =
      dispatchOrder.items?.filter((_, idx) => !itemsToRemove.includes(idx)) ||
      [];
    const totalActiveItems = activeItems.length + newItems.length;

    if (totalActiveItems === 0) {
      errors.push("At least one item is required");
    }

    // Check all active items are verified
    const unverifiedItems = [];
    dispatchOrder.items?.forEach((_, originalIdx) => {
      if (
        !itemsToRemove.includes(originalIdx) &&
        !itemVerifications[originalIdx]
      ) {
        unverifiedItems.push(originalIdx + 1);
      }
    });

    if (unverifiedItems.length > 0) {
      errors.push(`Items not verified: #${unverifiedItems.join(", #")}`);
    }

    // Check all active items have valid quantities
    const invalidQuantityItems = [];
    dispatchOrder.items?.forEach((_, originalIdx) => {
      if (!itemsToRemove.includes(originalIdx)) {
        const itemData = editedItems[originalIdx];
        if (
          itemData &&
          (parseFloat(itemData.quantity) <= 0 ||
            isNaN(parseFloat(itemData.quantity)))
        ) {
          invalidQuantityItems.push(originalIdx + 1);
        }
      }
    });

    if (invalidQuantityItems.length > 0) {
      errors.push(
        `Items with invalid quantity: #${invalidQuantityItems.join(", #")}`
      );
    }

    // Check if total boxes is confirmed
    if (!totalBoxesConfirmed) {
      errors.push("Total boxes must be confirmed before order confirmation");
    }

    // Check if total boxes is greater than 0
    const totalBoxesValue = parseInt(editedTotalBoxes) || 0;
    if (totalBoxesValue <= 0) {
      errors.push("Total boxes must be greater than 0");
    }

    return { isValid: errors.length === 0, errors };
  }, [
    dispatchOrder,
    editedLogisticsCompany,
    editedDispatchDate,
    exchangeRate,
    itemsToRemove,
    newItems,
    itemVerifications,
    editedItems,
    totalBoxesConfirmed,
    editedTotalBoxes,
  ]);

  const handleSubmitApproval = useCallback(() => {
    console.log("handleSubmitApproval called");
    if (!dispatchOrderId) {
      console.log("No dispatch order ID");
      return;
    }

    // Validate before submitting
    const { isValid, errors } = validateOrderBeforeConfirm();
    console.log("Validation result:", { isValid, errors });

    if (!isValid) {
      toast.error(
        <div>
          <p className="font-semibold">Cannot submit order for approval:</p>
          <ul className="mt-1 list-disc list-inside text-sm">
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>,
        { duration: 5000 }
      );
      return;
    }

    console.log("Validation passed, preparing approval submission...");

    // Prepare items array with edited values and exclude removed items
    const finalItems = [];

    // Add edited existing items (excluding removed ones)
    dispatchOrder.items?.forEach((item, idx) => {
      if (!itemsToRemove.includes(idx)) {
        const itemData = editedItems[idx] || item;

        // Get edited packets if they exist
        let itemPackets = item.packets;
        if (editedItems[idx]?.packets) {
          itemPackets = editedItems[idx].packets;
        }

        finalItems.push({
          ...item,
          productName: itemData.productName,
          productCode: itemData.productCode,
          quantity: parseFloat(itemData.quantity),
          costPrice: parseFloat(itemData.costPrice),
          primaryColor: itemData.primaryColor,
          size: itemData.size,
          productImage: itemData.images,
          packets: itemPackets,
          boxes: itemData.boxStr
            ? itemData.boxStr
              .split(",")
              .map((s) => ({ boxNumber: parseInt(s.trim()) }))
              .filter((b) => !isNaN(b.boxNumber))
            : [],
          useVariantTracking: item.useVariantTracking,
        });
      }
    });

    // Add new items
    newItems.forEach((item) => {
      finalItems.push(item);
    });

    const approvalData = {
      id: dispatchOrderId,
      items: finalItems,
      totalBoxes: parseInt(editedTotalBoxes) || 0,
      paymentData: {
        cashPayment: parseFloat(cashPayment) || 0,
        bankPayment: parseFloat(bankPayment) || 0,
        exchangeRate: parseFloat(exchangeRate) || 1.0,
        percentage: parseFloat(percentage) || 0,
        discount: confirmOrderSupplierCurrency.discount,
      },
      logisticsCompany: editedLogisticsCompany,
      dispatchDate: editedDispatchDate,
      isTotalBoxesConfirmed: totalBoxesConfirmed,
    };

    console.log("Calling submitApprovalMutation with data:", approvalData);

    submitApprovalMutation.mutate(approvalData, {
      onSuccess: () => {
        setCashPayment("0");
        setBankPayment("0");
        setExchangeRate("1.0");
        setPercentage("0");
        setActiveTab("confirm");
        toast.success("Order submitted for approval successfully!");
      },
    });
  }, [
    dispatchOrderId,
    validateOrderBeforeConfirm,
    dispatchOrder,
    itemsToRemove,
    editedItems,
    newItems,
    cashPayment,
    bankPayment,
    exchangeRate,
    percentage,
    editedTotalBoxes,
    submitApprovalMutation,
    confirmOrderSupplierCurrency.discount,
    editedLogisticsCompany,
    editedDispatchDate,
    totalBoxesConfirmed,
  ]);

  const handleConfirm = useCallback(() => {
    console.log("handleConfirm called");
    if (!dispatchOrderId) {
      console.log("No dispatch order ID");
      return;
    }

    // Validate before confirming
    const { isValid, errors } = validateOrderBeforeConfirm();
    console.log("Validation result:", { isValid, errors });

    if (!isValid) {
      toast.error(
        <div>
          <p className="font-semibold">Cannot confirm order:</p>
          <ul className="mt-1 list-disc list-inside text-sm">
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>,
        { duration: 5000 }
      );
      return;
    }

    console.log("Validation passed, preparing confirmation...");

    // Prepare items array with edited values and exclude removed items
    const finalItems = [];

    // Add edited existing items (excluding removed ones)
    dispatchOrder.items?.forEach((item, idx) => {
      if (!itemsToRemove.includes(idx)) {
        const itemData = editedItems[idx] || item;

        // Get edited packets if they exist
        let itemPackets = item.packets;
        if (editedItems[idx]?.packets) {
          itemPackets = editedItems[idx].packets;
        }

        finalItems.push({
          ...item,
          productName: itemData.productName,
          productCode: itemData.productCode,
          quantity: parseFloat(itemData.quantity),
          costPrice: parseFloat(itemData.costPrice),
          primaryColor: itemData.primaryColor,
          size: itemData.size,
          productImage: itemData.images,
          packets: itemPackets, // Include edited packets
          boxes: itemData.boxStr
            ? itemData.boxStr
              .split(",")
              .map((s) => ({ boxNumber: parseInt(s.trim()) }))
              .filter((b) => !isNaN(b.boxNumber))
            : [], // Include edited boxes
          useVariantTracking: item.useVariantTracking,
        });
      }
    });

    // Add new items
    newItems.forEach((item) => {
      finalItems.push(item);
    });

    // NOTE: Currently the backend confirmation endpoint only accepts payment fields
    // Full editing support (supplier, logistics, date, items) requires backend updates
    // For now, we'll send what the backend accepts
    const confirmData = {
      id: dispatchOrderId,
      items: finalItems,
      totalBoxes: parseInt(editedTotalBoxes) || 0,
      paymentData: {
        cashPayment: parseFloat(cashPayment) || 0,
        bankPayment: parseFloat(bankPayment) || 0,
        exchangeRate: parseFloat(exchangeRate) || 1.0,
        percentage: parseFloat(percentage) || 0,
        discount: confirmOrderSupplierCurrency.discount,
      },
      logisticsCompany: editedLogisticsCompany,
      dispatchDate: editedDispatchDate,
      isTotalBoxesConfirmed: totalBoxesConfirmed,
    };

    console.log("Calling confirmMutation with data:", confirmData);

    confirmMutation.mutate(confirmData, {
      onSuccess: () => {
        setCashPayment("0");
        setBankPayment("0");
        setExchangeRate("1.0");
        setPercentage("0");
        setActiveTab("confirm");
        toast.success("Order confirmed successfully!");

        // No warning needed as edits are now saved
      },
    });
  }, [
    dispatchOrderId,
    validateOrderBeforeConfirm,
    dispatchOrder,
    itemsToRemove,
    editedItems,
    newItems,
    editedLogisticsCompany,
    editedDispatchDate,
    cashPayment,
    bankPayment,
    exchangeRate,
    percentage,
    editedDiscount,
    editedTotalBoxes,
    confirmMutation,
    confirmOrderSupplierCurrency.discount,
    totalBoxesConfirmed,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Enter to confirm/submit (only in confirm tab and form is valid)
      if (
        e.key === "Enter" &&
        e.ctrlKey &&
        activeTab === "confirm" &&
        isPending &&
        dispatchOrder
      ) {
        e.preventDefault();
        const { isValid } = validateOrderBeforeConfirm();
        if (isValid) {
          // Super-admin: confirm, Admin: submit approval (only for pending)
          if (isSuperAdmin) {
            handleConfirm();
          } else if (isAdmin && dispatchOrder.status === 'pending') {
            handleSubmitApproval();
          }
        } else {
          toast.error("Please fix validation errors before submitting");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeTab,
    isPending,
    dispatchOrder,
    validateOrderBeforeConfirm,
    handleConfirm,
    handleSubmitApproval,
    isSuperAdmin,
    isAdmin,
  ]);

  const handleAddPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!paymentMethod || !["cash", "bank"].includes(paymentMethod)) {
      toast.error("Please select a valid payment method");
      return;
    }

    setIsSubmittingPayment(true);

    try {
      // Calculate outstanding balance (supplier due) if payment exceeds remaining balance
      const newRemainingBalance = remainingBalance - amount;
      const outstandingBalance =
        newRemainingBalance < 0 ? Math.abs(newRemainingBalance) : 0;
      const finalRemainingBalance =
        newRemainingBalance > 0 ? newRemainingBalance : 0;

      await ledgerAPI.createEntry({
        type: "supplier",
        entityId: dispatchOrder.supplier._id,
        entityModel: "Supplier",
        transactionType: "payment",
        referenceId: dispatchOrderId,
        referenceModel: "DispatchOrder",
        debit: 0,
        credit: amount,
        date: paymentDate ? new Date(paymentDate) : new Date(),
        description:
          paymentDescription ||
          `Payment for Dispatch Order ${dispatchOrder.orderNumber} - ${paymentMethod}`,
        paymentMethod: paymentMethod,
        paymentDetails: {
          cashPayment: paymentMethod === "cash" ? amount : 0,
          bankPayment: paymentMethod === "bank" ? amount : 0,
          remainingBalance: finalRemainingBalance,
          outstandingBalance: outstandingBalance, // Supplier owes us this amount
        },
      });

      toast.success("Payment recorded successfully");

      // Reset form
      setPaymentAmount("");
      setPaymentMethod("cash");
      setPaymentDate("");
      setPaymentDescription("");
      setShowPaymentForm(false);

      // Invalidate queries to refresh data
      queryClient.invalidateQueries(["dispatch-order", dispatchOrderId]);
      queryClient.invalidateQueries([
        "dispatch-order-payments",
        dispatchOrderId,
      ]);
      queryClient.invalidateQueries(["dispatch-orders"]);
      queryClient.invalidateQueries(["unpaid-dispatch-orders"]);
    } catch (error) {
      console.error("Error creating payment:", error);
      console.error("Error response:", error.response?.data);
      console.error("Payment payload sent:", {
        amount,
        remainingBalance,
        outstandingBalance,
        finalRemainingBalance,
      });

      // Show detailed error message
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Failed to record payment";

      toast.error(errorMessage);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleReturn = async () => {
    // Validate return quantities
    const returnedItems = Object.entries(returnQuantities)
      .filter(([_, qty]) => {
        const qtyNum = parseFloat(qty);
        return qtyNum > 0 && !isNaN(qtyNum);
      })
      .map(([itemIndex, quantity]) => {
        const item = itemsWithDetails.find(
          (i) => i.index === parseInt(itemIndex)
        );
        const qtyNum = parseFloat(quantity);
        const remainingQty = item ? item.quantity - item.totalReturned : 0;

        // Validate quantity doesn't exceed remaining
        if (qtyNum > remainingQty) {
          toast.error(
            `Return quantity for ${item?.productName || "item"
            } exceeds remaining quantity (${remainingQty})`
          );
          return null;
        }

        // Get reason - use custom reason if "Other" is selected
        let reason = returnReasons[itemIndex] || "";
        if (reason === "Other" && returnReasons[`${itemIndex}-custom`]) {
          reason = returnReasons[`${itemIndex}-custom`];
        }

        return {
          itemIndex: parseInt(itemIndex),
          quantity: qtyNum,
          reason: reason,
        };
      })
      .filter(Boolean); // Remove null entries from validation failures

    if (returnedItems.length === 0) {
      toast.error(
        "Please specify at least one item to return with a valid quantity"
      );
      return;
    }

    // Ensure returnedItems is a valid array
    if (!Array.isArray(returnedItems) || returnedItems.length === 0) {
      toast.error("Invalid return items. Please try again.");
      return;
    }

    const payload = {
      returnedItems: returnedItems,
      notes: returnNotes || "",
    };

    try {
      await returnMutation.mutateAsync({
        id: dispatchOrderId,
        returnedItems: payload.returnedItems,
        notes: payload.notes,
      });

      // Reset form on success
      setReturnQuantities({});
      setReturnReasons({});
      setReturnNotes("");
      setShowAllReturnItems(false);
    } catch (error) {
      // Error is handled by the mutation's onError
      console.error("Return error:", error);
    }
  };

  // Packet configuration save handler
  const handlePacketsSave = (packets, context) => {
    const targetIndex = context?.index ?? selectedItemForPackets?.index;
    if (targetIndex === undefined || targetIndex === null) return;

    setEditedItems((prev) => ({
      ...prev,
      [targetIndex]: {
        ...prev[targetIndex],
        packets,
        useVariantTracking: true,
      },
    }));

    toast.success("Packet configuration saved");
  };

  // Delete order handler
  const handleDelete = useCallback(() => {
    if (!dispatchOrderId) return;

    deleteMutation.mutate(dispatchOrderId, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        router.push("/dispatch-orders");
      },
    });
  }, [dispatchOrderId, deleteMutation, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!dispatchOrder) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push("/dispatch-orders")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        </div>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold">Dispatch Order Not Found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => router.push("/dispatch-orders")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">
              Dispatch Order: {dispatchOrder.orderNumber}
            </h1>
          </div>
        </div>
        <Badge
          className={statusStyles[dispatchOrder.status] || statusStyles.pending}
        >
          {dispatchOrder.status?.replace(/_/g, " ").replace(/-/g, " ").toUpperCase()}
        </Badge>
      </div>

      {/* Order Info - Collapsible */}
      <Accordion
        type="single"
        collapsible
        defaultValue="order-info"
        className="border border-blue-200 rounded-lg bg-blue-50/30"
      >
        <AccordionItem value="order-info" className="border-b-0">
          <AccordionTrigger className="px-4 hover:no-underline bg-blue-50/50 rounded-t-lg">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-blue-900">
                Order Information
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 bg-white/60 rounded-b-lg">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
              {/* Supplier - Always Read-Only */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  Supplier (Not Editable)
                </Label>
                <p className="font-medium text-sm">
                  {dispatchOrder.supplier?.name ||
                    dispatchOrder.supplier?.company ||
                    "—"}
                </p>
                {dispatchOrder.supplier?.phone && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {(dispatchOrder.supplier?.phoneAreaCode
                      ? `${dispatchOrder.supplier.phoneAreaCode}-`
                      : "") + dispatchOrder.supplier.phone}
                  </p>
                )}
                {dispatchOrder.supplier?.email && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {dispatchOrder.supplier.email}
                  </p>
                )}
              </div>

              {/* Logistics Company - Double-click to edit for pending orders */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  Logistics Company{" "}
                  {isPending && <span className="text-red-500">*</span>}
                  {/* {isPending && <span className="text-xs text-blue-600 ml-1">(double-click to edit)</span>} */}
                </Label>
                {isPending && editingField === "logisticsCompany" ? (
                  <div className="flex gap-1">
                    <Select
                      value={editedLogisticsCompany || ""}
                      onValueChange={setEditedLogisticsCompany}
                      onOpenChange={(open) => {
                        if (!open) {
                          setEditingField(null);
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 text-sm border-blue-500 border-2">
                        <SelectValue placeholder="Select logistics company" />
                      </SelectTrigger>
                      <SelectContent>
                        {logisticsCompanies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingField(null)}
                      className="h-9 px-2"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </Button>
                  </div>
                ) : (
                  <p
                    className={`font-medium text-sm p-2 rounded ${isPending
                      ? "cursor-pointer hover:bg-blue-50 border border-transparent hover:border-blue-300"
                      : ""
                      }`}
                    onDoubleClick={() =>
                      isPending && setEditingField("logisticsCompany")
                    }
                    title={isPending ? "Double-click to edit" : ""}
                  >
                    {logisticsCompanies.find(
                      (c) => c.id === editedLogisticsCompany
                    )?.name ||
                      dispatchOrder.logisticsCompany?.name ||
                      "—"}
                  </p>
                )}
              </div>

              {/* Dispatch Date - Double-click to edit for pending orders */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  Date {isPending && <span className="text-red-500">*</span>}
                  {/* {isPending && <span className="text-xs text-blue-600 ml-1">(double-click to edit)</span>} */}
                </Label>
                {isPending && editingField === "dispatchDate" ? (
                  <div className="flex gap-1">
                    <Input
                      type="date"
                      value={editedDispatchDate}
                      onChange={(e) => setEditedDispatchDate(e.target.value)}
                      onBlur={() => setEditingField(null)}
                      className="h-9 text-sm border-blue-500 border-2"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingField(null)}
                      className="h-9 px-2"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </Button>
                  </div>
                ) : (
                  <p
                    className={`font-medium text-sm p-2 rounded ${isPending
                      ? "cursor-pointer hover:bg-blue-50 border border-transparent hover:border-blue-300"
                      : ""
                      }`}
                    onDoubleClick={() =>
                      isPending && setEditingField("dispatchDate")
                    }
                    title={isPending ? "" : ""}
                  >
                    {(() => {
                      if (editedDispatchDate) {
                        const [year, month, day] = editedDispatchDate.split("-");
                        return `${day}/${month}/${year}`;
                      }
                      if (dispatchOrder.dispatchDate) {
                        const date = new Date(dispatchOrder.dispatchDate);
                        // Using UTC methods to avoid timezone shifts for these dates
                        const day = String(date.getUTCDate()).padStart(2, '0');
                        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                        const year = date.getUTCFullYear();
                        return `${day}/${month}/${year}`;
                      }
                      return "—";
                    })()}
                  </p>
                )}
              </div>

              {/* Discount - Double-click to edit for pending orders */}
              <div>
                <Label className="text-xs text-muted-foreground">
                  Discount
                  {/* {isPending && <span className="text-xs text-blue-600 ml-1">(double-click to edit)</span>} */}
                </Label>
                {isPending && editingField === "discount" ? (
                  <div className="flex gap-1">
                    <Input
                      type="text"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={editedDiscount}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers and one decimal point
                        const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                        setEditedDiscount(sanitized);
                      }}
                      onBlur={() => setEditingField(null)}
                      className="h-9 text-sm border-blue-500 border-2"
                      placeholder="0.00"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingField(null)}
                      className="h-9 px-2"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </Button>
                  </div>
                ) : (
                  <p
                    className={`font-medium text-sm p-2 rounded ${isPending
                      ? "cursor-pointer hover:bg-blue-50 border border-transparent hover:border-blue-300"
                      : ""
                      }`}
                    onDoubleClick={() =>
                      isPending && setEditingField("discount")
                    }
                    title={isPending ? "" : ""}
                  >
                    {isPending
                      ? (() => {
                        if (
                          dispatchOrder?.returnedItems &&
                          dispatchOrder.returnedItems.length > 0
                        ) {
                          // Show the calculated proportional discount for pending orders with returns
                          return confirmOrderSupplierCurrency.discount.toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          );
                        }
                        return editedDiscount;
                      })()
                      : (() => {
                        // For display in Order Information, show discount in supplier currency (amount)
                        // For pending orders: totalDiscount is stored in supplier currency

                        const discountValue =
                          dispatchOrder.totalDiscount || 0;
                        // Format as number (supplier currency) without EUR symbol
                        return discountValue.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        });
                      })()}
                  </p>
                )}
              </div>

              {/* Total Boxes - Editable for pending orders */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Label className="text-xs text-muted-foreground">
                    Total Boxes
                  </Label>
                  {isPending && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="total-boxes-confirmed"
                        checked={totalBoxesConfirmed}
                        onCheckedChange={(checked) => {
                          setTotalBoxesConfirmed(checked === true);
                        }}
                        className="h-4 w-4"
                      />
                      <Label
                        htmlFor="total-boxes-confirmed"
                        className="text-xs text-muted-foreground cursor-pointer"
                      >
                        Confirm
                      </Label>
                    </div>
                  )}
                </div>
                {isPending && editingField === "totalBoxes" ? (
                  <div className="flex gap-1">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={editedTotalBoxes}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers
                        const sanitized = value.replace(/[^0-9]/g, '');
                        setEditedTotalBoxes(sanitized);
                        // Reset confirmation when value changes
                        if (sanitized !== editedTotalBoxes) {
                          setTotalBoxesConfirmed(false);
                        }
                      }}
                      onBlur={() => setEditingField(null)}
                      className="h-9 text-sm border-blue-500 border-2"
                      placeholder="0"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingField(null)}
                      className="h-9 px-2"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </Button>
                  </div>
                ) : (
                  <p
                    className={`font-medium text-sm p-2 rounded ${isPending
                      ? "cursor-pointer hover:bg-blue-50 border border-transparent hover:border-blue-300"
                      : ""
                      }`}
                    onDoubleClick={() =>
                      isPending && setEditingField("totalBoxes")
                    }
                    title={isPending ? "Double-click to edit" : ""}
                  >
                    {isPending
                      ? editedTotalBoxes
                      : dispatchOrder.totalBoxes || 0}
                  </p>
                )}
              </div>

              {isConfirmed && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Exchange Rate
                    </Label>
                    <p className="font-medium text-sm">
                      {dispatchOrder.exchangeRate
                        ? dispatchOrder.exchangeRate.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Percentage
                    </Label>
                    <p className="font-medium text-sm">
                      {dispatchOrder.percentage != null
                        ? `${dispatchOrder.percentage}%`
                        : "—"}
                    </p>
                  </div>
                </>
              )}
              {isConfirmed && dispatchOrder.paymentDetails && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Cash Payment
                    </Label>
                    <p className="font-medium text-sm">
                      {dispatchOrder.paymentDetails.cashPayment}
                      {/* {paymentAmountsInSupplierCurrency.cashPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} */}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Bank Payment
                    </Label>
                    <p className="font-medium text-sm">
                      {dispatchOrder.paymentDetails.bankPayment}
                      {/* {paymentAmountsInSupplierCurrency.bankPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} */}
                    </p>
                  </div>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Items - Collapsible */}
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
                <span className="font-semibold text-purple-900">Items</span>
              </div>
              <div className="text-sm text-purple-700 font-medium">
                {isPending && !dispatchOrder?.returnedItems?.length ? (
                  <>
                    {remainingItemsSummary.rows} items • {currency(totalAmount)}
                  </>
                ) : (
                  <>
                    {remainingItemsSummary.quantity} units remaining (
                    {remainingItemsSummary.rows} products) •{" "}
                    {currency(remainingItemsSummary.value)}
                    {activeItemsWithDetails.some(
                      (item) => item.totalReturned > 0
                    ) && (
                        <span className="text-xs text-red-600 ml-2">
                          (
                          {activeItemsWithDetails.reduce(
                            (sum, item) => sum + item.totalReturned,
                            0
                          )}{" "}
                          returned)
                        </span>
                      )}
                  </>
                )}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-4 bg-white/60 rounded-b-lg">
            <div className="border-t border-purple-200 mx-4 pt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-purple-100/50 border-b-2 border-purple-200">
                    <tr>
                      {isPending && (
                        <th className="p-2 text-center text-purple-900 font-semibold">
                          ✓
                        </th>
                      )}
                      <th className="p-2 text-left text-purple-900 font-semibold">
                        Image
                      </th>
                      <th className="p-2 text-left text-purple-900 font-semibold">
                        Product
                      </th>
                      <th className="p-2 text-left text-purple-900 font-semibold">
                        Code
                      </th>
                      <th className="p-2 text-left text-purple-900 font-semibold w-24">
                        Colors
                      </th>
                      <th className="p-2 text-left text-purple-900 font-semibold w-24">
                        Sizes
                      </th>
                      <th className="p-2 text-left text-purple-900 font-semibold w-24">
                        Season
                      </th>
                      <th className="p-2 text-center text-purple-900 font-semibold w-16">
                        Packets
                      </th>
                      <th className="p-2 text-right text-purple-900 font-semibold">
                        {isPending ? "QTY" : "Remaining Qty"}
                      </th>
                      {!isPending && (
                        <th className="p-2 text-right text-purple-900 font-semibold">
                          Returned
                        </th>
                      )}
                      {!isPending && (
                        <th className="p-2 text-right text-purple-900 font-semibold">
                          Original Qty
                        </th>
                      )}
                      <th className="p-2 text-right text-purple-900 font-semibold">
                        Cost Price
                      </th>
                      <th className="p-2 text-right text-purple-900 font-semibold">
                        Supplier Payment
                      </th>
                      <th className="p-2 text-right text-purple-900 font-semibold">
                        Landed Price
                      </th>
                      <th className="p-2 text-right text-purple-900 font-semibold">
                        Landed Total
                      </th>
                      {isPending && (
                        <th className="p-2 text-center text-purple-900 font-semibold">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {itemsWithDetails.map((item, idx) => {
                      const itemData = editedItems[item.index] || item;
                      const isVerified = itemVerifications[item.index] || false;
                      const isRemoved = itemsToRemove.includes(item.index);

                      // Recalculate with edited values
                      // ALWAYS use the remaining quantity (original/edited minus returns) for financial calculations
                      // item.confirmedQty already contains the remaining amount (original - returned)
                      const editedQuantity = item.confirmedQty ?? 0;
                      const editedCostPrice =
                        parseFloat(itemData.costPrice) || 0;
                      // All financial calculations MUST use editedQuantity (which is confirmedQty)
                      const supplierPaymentItemTotal =
                        editedCostPrice * editedQuantity;
                      const supplierPaymentAmount =
                        editedCostPrice / currentExchangeRate;
                      const landedPrice =
                        (editedCostPrice / currentExchangeRate) *
                        (1 + currentPercentage / 100);
                      const itemTotal = landedPrice * editedQuantity;

                      return (
                        <tr
                          key={item.index}
                          className={`border-b border-purple-100 transition-colors ${isRemoved
                            ? "opacity-50 bg-red-50"
                            : isPending && !isVerified
                              ? "bg-amber-50/50"
                              : isPending && isVerified
                                ? "bg-green-50/30"
                                : idx % 2 === 0
                                  ? "bg-white"
                                  : "bg-purple-50/20"
                            }`}
                        >
                          {isPending && (
                            <td className="p-2 text-center">
                              <input
                                type="checkbox"
                                checked={isVerified}
                                onChange={(e) =>
                                  setItemVerifications({
                                    ...itemVerifications,
                                    [item.index]: e.target.checked,
                                  })
                                }
                                disabled={isRemoved}
                                className="w-4 h-4 cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="p-2">
                            <ProductImageGallery
                              images={getImageArray(item)}
                              alt={itemData.productName || "Product"}
                              size="sm"
                              maxVisible={3}
                              showCount={true}
                            />
                          </td>
                          <td className="p-2 align-top">
                            {isPending && !isRemoved ? (
                              <Input
                                value={itemData.productName}
                                onChange={(e) =>
                                  setEditedItems({
                                    ...editedItems,
                                    [item.index]: {
                                      ...itemData,
                                      productName: e.target.value,
                                    },
                                  })
                                }
                                className="h-8 text-sm min-w-[150px]"
                              />
                            ) : (
                              <div className="font-medium">
                                {itemData.productName}
                              </div>
                            )}
                          </td>
                          <td className="p-2 align-top">
                            {isPending && !isRemoved ? (
                              <Input
                                value={itemData.productCode}
                                onChange={(e) =>
                                  setEditedItems({
                                    ...editedItems,
                                    [item.index]: {
                                      ...itemData,
                                      productCode: e.target.value,
                                    },
                                  })
                                }
                                className="h-8 text-sm w-24"
                              />
                            ) : (
                              <span>{itemData.productCode}</span>
                            )}
                          </td>
                          <td className="p-2 w-24 align-top">
                            {isPending && !isRemoved ? (
                              <div className="min-w-[100px]">
                                <ArrayInput
                                  value={
                                    Array.isArray(itemData.primaryColor)
                                      ? itemData.primaryColor
                                      : itemData.primaryColor
                                        ? [itemData.primaryColor]
                                        : []
                                  }
                                  onChange={(colors) =>
                                    setEditedItems({
                                      ...editedItems,
                                      [item.index]: {
                                        ...itemData,
                                        primaryColor: colors,
                                      },
                                    })
                                  }
                                  placeholder="Enter color..."
                                  disabled={isRemoved}
                                />
                              </div>
                            ) : (
                              <div className="text-xs">
                                {Array.isArray(itemData.primaryColor) &&
                                  itemData.primaryColor.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {itemData.primaryColor.map((color, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px]"
                                      >
                                        {color}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-2 w-24 align-top">
                            {isPending && !isRemoved ? (
                              <div className="min-w-[100px]">
                                <ArrayInput
                                  value={
                                    Array.isArray(itemData.size)
                                      ? itemData.size
                                      : itemData.size
                                        ? [itemData.size]
                                        : []
                                  }
                                  onChange={(sizes) =>
                                    setEditedItems({
                                      ...editedItems,
                                      [item.index]: {
                                        ...itemData,
                                        size: sizes,
                                      },
                                    })
                                  }
                                  placeholder="Enter size..."
                                  disabled={isRemoved}
                                />
                              </div>
                            ) : (
                              <div className="text-xs">
                                {Array.isArray(itemData.size) &&
                                  itemData.size.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {itemData.size.map((s, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-block px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px]"
                                      >
                                        {s}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-2 w-16 text-center">
                            <div className="flex flex-col gap-1.5 items-center">
                              {isPending ? (
                                <>
                                  {item.packets?.length > 0 ? (
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="text-xs font-medium text-slate-600">
                                        {item.packets[0].isLoose
                                          ? null
                                          : item.packets.length}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          const modalItemId = String(
                                            item.index ??
                                            item.productCode ??
                                            item.productName ??
                                            "0"
                                          );
                                          setSelectedItemForPackets({
                                            ...item,
                                            ...itemData,
                                            index: item.index,
                                            modalItemId,
                                          });
                                          setPacketDialogOpen(true);
                                        }}
                                        className="h-6 w-6 p-0 hover:bg-slate-100 text-slate-500 hover:text-blue-600"
                                        title="Edit Configuration"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const modalItemId = String(
                                          item.index ??
                                          item.productCode ??
                                          item.productName ??
                                          "0"
                                        );
                                        setSelectedItemForPackets({
                                          ...item,
                                          ...itemData,
                                          index: item.index,
                                          modalItemId,
                                        });
                                        setPacketDialogOpen(true);
                                      }}
                                      className="h-6 w-6 p-0 hover:bg-slate-100 text-slate-500 hover:text-blue-600"
                                      title="Configure Packets"
                                    >
                                      <Package className="h-3.5 w-3.5 text-blue-500" />
                                    </Button>
                                  )}
                                </>
                              ) : item.useVariantTracking &&
                                item.packets?.length > 0 ? (
                                <div className="text-xs font-medium text-slate-600">
                                  {item.packets[0].isLoose ? (
                                    <span className="text-slate-500 italic">
                                      Loose Items
                                    </span>
                                  ) : (
                                    (() => {
                                      // Calculate total items in packets
                                      const totalInPackets =
                                        item.packets.reduce((sum, p) => {
                                          return (
                                            sum +
                                            (p.composition?.reduce(
                                              (s, c) =>
                                                s + (parseInt(c.quantity) || 0),
                                              0
                                            ) || 0)
                                          );
                                        }, 0);

                                      // If items were returned, show adjusted packet info
                                      const remainingQty =
                                        item.confirmedQty || item.quantity;
                                      const hasReturns = item.totalReturned > 0;

                                      // Estimate remaining packets (proportional)
                                      const returnRatio =
                                        totalInPackets > 0
                                          ? remainingQty / totalInPackets
                                          : 1;
                                      const estimatedRemainingPackets =
                                        Math.ceil(
                                          item.packets.length * returnRatio
                                        );

                                      return (
                                        <div className="flex flex-col">
                                          <span>
                                            {hasReturns
                                              ? estimatedRemainingPackets
                                              : item.packets.length}{" "}
                                            Packet
                                            {(hasReturns
                                              ? estimatedRemainingPackets
                                              : item.packets.length) !== 1
                                              ? "s"
                                              : ""}
                                          </span>
                                          {hasReturns && (
                                            <span className="text-[9px] text-amber-600 italic mt-0.5">
                                              (from {item.packets.length}{" "}
                                              original)
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })()
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              )}

                              {/* Breakdown Display - Adjusted for Returns */}
                              {(() => {
                                const packets = item.packets || [];
                                if (packets.length === 0) return null;

                                // Calculate original total from packets
                                let originalTotal = 0;
                                const originalBreakdown = {};
                                packets.forEach((p) => {
                                  p.composition?.forEach((c) => {
                                    if (c.color && c.size && c.quantity > 0) {
                                      const key = `${c.color}-${c.size}`;
                                      const qty = parseInt(c.quantity) || 0;
                                      originalBreakdown[key] =
                                        (originalBreakdown[key] || 0) + qty;
                                      originalTotal += qty;
                                    }
                                  });
                                });

                                if (originalTotal === 0) return null;

                                // Calculate remaining quantity after returns
                                const remainingQty =
                                  item.confirmedQty || item.quantity;
                                const returnRatio =
                                  originalTotal > 0
                                    ? remainingQty / originalTotal
                                    : 1;

                                // Calculate adjusted breakdown (proportional reduction)
                                const adjustedBreakdown = {};
                                Object.entries(originalBreakdown).forEach(
                                  ([key, qty]) => {
                                    // Proportionally reduce each color-size combination
                                    const adjustedQty = Math.round(
                                      qty * returnRatio
                                    );
                                    if (adjustedQty > 0) {
                                      adjustedBreakdown[key] = adjustedQty;
                                    }
                                  }
                                );

                                const parts = Object.entries(adjustedBreakdown);
                                if (parts.length === 0) return null;

                                // Show indicator if items were returned
                                const hasReturns = item.totalReturned > 0;

                                return (
                                  <div className="flex flex-col gap-1">
                                    {hasReturns && (
                                      <span className="text-[9px] text-amber-600 italic">
                                        Adjusted for returns
                                      </span>
                                    )}
                                    <div className="flex flex-wrap gap-1">
                                      {parts.map(([key, qty]) => (
                                        <span
                                          key={key}
                                          className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                                        >
                                          {key}: {qty}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </td>
                          <td className="p-2 text-right align-top">
                            <div className="flex flex-col items-end gap-1">
                              {isPending && !isRemoved ? (
                                <Input
                                  type="text"
                                  inputMode="numeric"
                                  value={itemData.quantity}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    // Allow only numbers
                                    const sanitized = value.replace(/[^0-9]/g, '');
                                    setEditedItems({
                                      ...editedItems,
                                      [item.index]: {
                                        ...itemData,
                                        quantity: sanitized,
                                      },
                                    });
                                  }}
                                  className="h-8 text-sm w-10 text-right"
                                />
                              ) : (
                                <span className="font-medium text-blue-700 h-8 flex items-center">
                                  {/* ALWAYS show remaining quantity (confirmedQty) which matches Return History */}
                                  {item.confirmedQty ?? 0}
                                </span>
                              )}
                              {isPending && item.totalReturned > 0 && (
                                <span className="text-[10px] text-red-600 font-medium">
                                  -{item.totalReturned} returned
                                </span>
                              )}
                              {isPending && (
                                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                  rem: {item.confirmedQty}
                                </span>
                              )}
                            </div>
                          </td>
                          {!isPending && (
                            <>
                              <td className="p-2 text-right text-red-600 font-medium align-top">
                                {item.totalReturned}
                              </td>
                              <td className="p-2 text-right font-medium text-muted-foreground align-top">
                                {item.quantity}
                              </td>
                            </>
                          )}
                          <td className="p-2 text-right align-top">
                            {isPending && !isRemoved ? (
                              <Input
                                type="text"
                                inputMode="decimal"
                                value={itemData.costPrice}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Allow only numbers and one decimal point
                                  const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                                  setEditedItems({
                                    ...editedItems,
                                    [item.index]: {
                                      ...itemData,
                                      costPrice: sanitized,
                                    },
                                  });
                                }}
                                className="h-8 text-sm w-24 text-right"
                              />
                            ) : (
                              <span className="text-muted-foreground">
                                {item.costPrice?.toFixed(2) || "—"}
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-right font-semibold text-slate-700 align-top">
                            {supplierPaymentItemTotal?.toFixed(2) || "—"}
                            {!isPending && item.totalReturned > 0 && (
                              <div className="text-[9px] text-red-600 mt-0.5">
                                (was{" "}
                                {(
                                  (item.costPrice || 0) * item.quantity
                                ).toFixed(2)}{" "}
                                before returns)
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-right text-blue-700 align-top">
                            {landedPrice?.toFixed(2) || "—"}
                          </td>
                          <td className="p-2 text-right font-medium text-blue-700 align-top">
                            {itemTotal?.toFixed(2) || "—"}
                            {!isPending && item.totalReturned > 0 && (
                              <div className="text-[9px] text-red-600 mt-0.5">
                                (was{" "}
                                {(
                                  ((item.costPrice || 0) /
                                    currentExchangeRate) *
                                  (1 + currentPercentage / 100) *
                                  item.quantity
                                ).toFixed(2)}{" "}
                                before returns)
                              </div>
                            )}
                          </td>
                          {isPending && (
                            <td className="p-2 text-center align-top">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (isRemoved) {
                                    setItemsToRemove(
                                      itemsToRemove.filter(
                                        (i) => i !== item.index
                                      )
                                    );
                                  } else {
                                    setItemsToRemove([
                                      ...itemsToRemove,
                                      item.index,
                                    ]);
                                  }
                                }}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2
                                  className={`h-4 w-4 ${isRemoved
                                    ? "text-green-600"
                                    : "text-red-600"
                                    }`}
                                />
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Add New Item Section - Only for Pending Orders */}

      {/* Tabs for Confirm Order and Return Items */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="confirm">Confirm Order</TabsTrigger>
          <TabsTrigger value="return">Return Items</TabsTrigger>
        </TabsList>

        {/* Confirm Order Tab */}
        <TabsContent value="confirm" className="space-y-4 mt-4">
          {/* Confirm Form (for pending and pending-approval orders) */}
          {isPending && (
            <Card className="bg-gradient-to-br from-emerald-50/80 to-teal-50/60 border-2 border-emerald-200">
              <CardHeader className="bg-emerald-100/50 border-b border-emerald-200">
                <CardTitle className="flex items-center gap-2 text-emerald-900">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Confirm Dispatch Order
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 bg-white/40">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="exchange-rate"
                      className="text-sm font-medium"
                    >
                      Exchange Rate <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="exchange-rate"
                      type="text"
                      inputMode="decimal"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(e.target.value)}
                      className="h-10 text-base"
                      placeholder="1.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="percentage" className="text-sm font-medium">
                      Percentage (%) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="percentage"
                      type="text"
                      inputMode="decimal"
                      min="0"
                      step="0.1"
                      value={percentage}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers and one decimal point
                        const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                        setPercentage(sanitized);
                      }}
                      className="h-10 text-base"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="cash-payment"
                      className="text-sm font-medium flex items-center gap-2"
                    >
                      <Banknote className="h-4 w-4 text-muted-foreground" />
                      Cash Payment
                    </Label>
                    <Input
                      id="cash-payment"
                      type="text"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={cashPayment}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers and one decimal point
                        const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                        setCashPayment(sanitized);
                      }}
                      className="h-10 text-base"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="bank-payment"
                      className="text-sm font-medium flex items-center gap-2"
                    >
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      Bank Payment
                    </Label>
                    <Input
                      id="bank-payment"
                      type="text"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={bankPayment}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers and one decimal point
                        const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                        setBankPayment(sanitized);
                      }}
                      className="h-10 text-base"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <Card className="bg-gradient-to-r from-slate-50 to-slate-100/80 border-2 border-slate-300">
                  <CardContent className="pt-4 space-y-3">
                    {dispatchOrder?.returnedItems &&
                      dispatchOrder.returnedItems.length > 0 && (
                        <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                          <span className="font-semibold">Note:</span> Values
                          below reflect remaining quantities after returns.
                        </div>
                      )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-medium">
                        Supplier Payment Amount:
                      </span>
                      <div className="flex flex-col items-end">
                        <span className="font-semibold">
                          {confirmOrderSupplierCurrency.supplierPaymentAmount.toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </span>
                        {dispatchOrder?.returnedItems &&
                          dispatchOrder.returnedItems.length > 0 &&
                          (() => {
                            // Calculate original supplier payment amount
                            let originalAmount = 0;
                            dispatchOrder?.items?.forEach((item) => {
                              const costPrice = parseFloat(item.costPrice) || 0;
                              originalAmount += costPrice * item.quantity;
                            });
                            return (
                              <span className="text-[10px] text-red-600 mt-0.5">
                                (was{" "}
                                {originalAmount.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{" "}
                                before returns)
                              </span>
                            );
                          })()}
                      </div>
                    </div>
                    {confirmOrderSupplierCurrency.discount > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground font-medium">
                          Discount:
                        </span>
                        <div className="flex flex-col items-end">
                          <span className="font-semibold text-green-600">
                            -
                            {confirmOrderSupplierCurrency.discount.toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </span>
                          {dispatchOrder?.returnedItems &&
                            dispatchOrder.returnedItems.length > 0 && (
                              <span className="text-[10px] text-red-600 mt-0.5">
                                (was{" "}
                                {parseFloat(editedDiscount).toLocaleString(
                                  undefined,
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  }
                                )}{" "}
                                before returns)
                              </span>
                            )}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm pt-1 border-t">
                      <span className="text-muted-foreground font-medium">
                        Final Amount:
                      </span>
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-lg">
                          {confirmOrderSupplierCurrency.finalAmount.toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </span>
                        {dispatchOrder?.returnedItems &&
                          dispatchOrder.returnedItems.length > 0 &&
                          (() => {
                            // Calculate original final amount
                            let originalAmount = 0;
                            dispatchOrder?.items?.forEach((item) => {
                              const costPrice = parseFloat(item.costPrice) || 0;
                              originalAmount += costPrice * item.quantity;
                            });
                            const originalFinal =
                              originalAmount -
                              (dispatchOrder?.totalDiscount || 0);
                            return (
                              <span className="text-[10px] text-red-600 mt-0.5">
                                (was{" "}
                                {originalFinal.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}{" "}
                                before returns)
                              </span>
                            );
                          })()}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground font-medium">
                        Payments:
                      </span>
                      <span className="font-semibold">
                        {confirmOrderSupplierCurrency.payments.toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        )}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-2 border-t">
                      <span className="text-muted-foreground font-medium">
                        Remaining Balance:
                      </span>
                      <span
                        className={`font-semibold text-lg ${confirmOrderSupplierCurrency.remainingBalance > 0
                          ? "text-red-600"
                          : "text-green-600"
                          }`}
                      >
                        {confirmOrderSupplierCurrency.remainingBalance.toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-2">
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={
                    confirmMutation.isPending || deleteMutation.isPending
                  }
                  variant="destructive"
                  size="lg"
                  className="min-w-[160px]"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Order
                    </>
                  )}
                </Button>
                {/* Super-admin: Confirm Order button (for both pending and pending-approval) */}
                {isSuperAdmin && (dispatchOrder?.status === 'pending' || dispatchOrder?.status === 'pending-approval') && (
                  <Button
                    onClick={() => {
                      console.log("Confirm button clicked");
                      handleConfirm();
                    }}
                    disabled={
                      confirmMutation.isPending ||
                      deleteMutation.isPending ||
                      !totalBoxesConfirmed
                    }
                    size="lg"
                    className="min-w-[160px]"
                    title={!totalBoxesConfirmed ? "Please confirm total boxes before confirming order" : ""}
                  >
                    {confirmMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Confirm Order
                      </>
                    )}
                  </Button>
                )}
                {/* Admin: Submit Approval button (for pending and pending-approval orders) */}
                {isAdmin && (dispatchOrder?.status === 'pending' || dispatchOrder?.status === 'pending-approval') && (
                  <Button
                    onClick={() => {
                      console.log("Submit Approval button clicked");
                      handleSubmitApproval();
                    }}
                    disabled={
                      submitApprovalMutation.isPending ||
                      deleteMutation.isPending ||
                      !totalBoxesConfirmed
                    }
                    size="lg"
                    className="min-w-[160px]"
                    title={!totalBoxesConfirmed ? "Please confirm total boxes before submitting for approval" : ""}
                  >
                    {submitApprovalMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {dispatchOrder?.status === 'pending-approval' ? 'Re-submit for Approval' : 'Submit Approval'}
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          )}

          {/* Payment Details (if confirmed) */}
          {isConfirmed && dispatchOrder.paymentDetails && (
            <Card className="bg-gradient-to-br from-amber-50/80 to-yellow-50/60 border-2 border-amber-200">
              <CardHeader className="bg-amber-100/50 border-b border-amber-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-amber-900">
                    <DollarSign className="h-5 w-5 text-amber-600" />
                    Payment Details
                  </CardTitle>
                  {canAddPayment && !showPaymentForm && (
                    <Button size="sm" onClick={() => setShowPaymentForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Payment
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="bg-white/40">
                {dispatchOrder?.returnedItems &&
                  dispatchOrder.returnedItems.length > 0 && (
                    <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                      <span className="font-semibold">Note:</span> Payment
                      amounts reflect remaining quantities after returns.
                      {(() => {
                        const totalReturned =
                          dispatchOrder.returnedItems.reduce(
                            (sum, r) => sum + (r.quantity || 0),
                            0
                          );
                        return ` (${totalReturned} items returned)`;
                      })()}
                    </div>
                  )}
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Cash Payment
                      </Label>
                      <p className="font-medium text-sm">
                        {dispatchOrder.paymentDetails.cashPayment.toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Bank Payment
                      </Label>
                      <p className="font-medium text-sm">
                        {dispatchOrder.paymentDetails.bankPayment.toLocaleString(
                          undefined,
                          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        )}
                      </p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Remaining Balance
                    </Label>
                    {(() => {
                      const pendingAmount = parseFloat(paymentAmount) || 0;
                      const previewRemaining = remainingBalance - pendingAmount;
                      const displayRemaining =
                        previewRemaining > 0 ? previewRemaining : 0;
                      const hasPreview = showPaymentForm && pendingAmount > 0;
                      return (
                        <>
                          <p
                            className={`font-medium text-sm ${displayRemaining > 0
                              ? "text-red-600"
                              : "text-green-600"
                              }`}
                          >
                            {displayRemaining.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                          {hasPreview &&
                            previewRemaining !== remainingBalance && (
                              <p className="text-xs text-orange-500 mt-1"></p>
                            )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add Payment Form */}
          {showPaymentForm && canAddPayment && (
            <Card className="bg-gradient-to-br from-indigo-50/80 to-blue-50/60 border-2 border-indigo-200">
              <CardHeader className="bg-indigo-100/50 border-b border-indigo-200">
                <CardTitle className="text-indigo-900">Add Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 bg-white/40">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="payment-amount">
                      Amount <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="payment-amount"
                      type="text"
                      inputMode="decimal"
                      step="0.01"
                      min="0.01"
                      value={paymentAmount}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers and one decimal point
                        const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                        setPaymentAmount(sanitized);
                      }}
                      placeholder="Enter amount"
                      disabled={isSubmittingPayment}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {remainingBalance > 0
                        ? `Remaining Balance: ${currency(remainingBalance)}`
                        : supplierDue > 0
                          ? `Fully paid. Outstanding Balance: ${currency(
                            supplierDue
                          )}`
                          : "Fully paid"}
                    </p>
                    {supplierTotalBalance !== undefined && (
                      <p className="text-xs font-semibold text-indigo-700 mt-2 pt-2 border-t border-indigo-200">
                        Supplier Total Balance:{" "}
                        <span
                          className={
                            supplierTotalBalance > 0
                              ? "text-green-600"
                              : supplierTotalBalance < 0
                                ? "text-red-600"
                                : "text-slate-600"
                          }
                        >
                          {supplierTotalBalance > 0 ? "+" : ""}
                          {currency(Math.abs(supplierTotalBalance))}
                        </span>
                        {supplierTotalBalance > 0 && (
                          <span className="text-green-600 ml-1">
                            (Admin owes supplier)
                          </span>
                        )}
                        {supplierTotalBalance < 0 && (
                          <span className="text-red-600 ml-1">
                            (Supplier owes admin)
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="payment-method">
                      Payment Method <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={paymentMethod}
                      onValueChange={setPaymentMethod}
                      disabled={isSubmittingPayment}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="payment-date">Date</Label>
                    <Input
                      id="payment-date"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      disabled={isSubmittingPayment}
                      max={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="payment-description">Description</Label>
                    <Input
                      id="payment-description"
                      value={paymentDescription}
                      onChange={(e) => setPaymentDescription(e.target.value)}
                      placeholder="Optional description"
                      disabled={isSubmittingPayment}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  onClick={handleAddPayment}
                  disabled={
                    isSubmittingPayment ||
                    !paymentAmount ||
                    parseFloat(paymentAmount) <= 0
                  }
                >
                  {isSubmittingPayment ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    "Record Payment"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPaymentForm(false);
                    setPaymentAmount("");
                    setPaymentMethod("cash");
                    setPaymentDate("");
                    setPaymentDescription("");
                  }}
                  disabled={isSubmittingPayment}
                >
                  Cancel
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* Payment History - Collapsible */}
          {isConfirmed && paymentHistory.length > 0 && (
            <Accordion
              type="single"
              collapsible
              className="border border-amber-200 rounded-lg bg-amber-50/30"
            >
              <AccordionItem value="payment-history" className="border-b-0">
                <AccordionTrigger className="px-4 hover:no-underline bg-amber-50/50 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-amber-600" />
                    <span className="font-semibold text-amber-900">
                      Payment History
                    </span>
                    <Badge
                      variant="outline"
                      className="ml-2 bg-amber-100 border-amber-300 text-amber-900"
                    >
                      {paymentHistory.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-4 bg-white/60 rounded-b-lg">
                  <div className="border-t border-amber-200 mx-4 pt-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-amber-100/50 border-b-2 border-amber-200">
                          <tr>
                            <th className="p-2 text-left">Date</th>
                            <th className="p-2 text-left">Method</th>
                            <th className="p-2 text-right">Amount</th>
                            <th className="p-2 text-left">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentHistory.map((payment, idx) => (
                            <tr
                              key={idx}
                              className={`border-b border-amber-100 ${idx % 2 === 0 ? "bg-white" : "bg-amber-50/20"
                                }`}
                            >
                              <td className="p-2">
                                {new Date(payment.date).toLocaleDateString(
                                  "en-GB"
                                )}
                              </td>
                              <td className="p-2">
                                <Badge variant="outline">
                                  {payment.paymentMethod === "cash"
                                    ? "Cash"
                                    : "Bank"}
                                </Badge>
                              </td>
                              <td className="p-2 text-right font-medium">
                                {currency(payment.credit || 0)}
                              </td>
                              <td className="p-2 text-muted-foreground">
                                {payment.description || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </TabsContent>

        {/* Return Items Tab */}
        <TabsContent value="return" className="space-y-4 mt-4">
          {/* Returns History - Compact Table */}
          {dispatchOrder.returns && dispatchOrder.returns.length > 0 && (
            <Accordion
              type="single"
              collapsible
              className="border border-rose-200 rounded-lg bg-rose-50/30"
            >
              <AccordionItem value="return-history" className="border-b-0">
                <AccordionTrigger className="px-4 hover:no-underline bg-rose-50/50 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-rose-600" />
                    <span className="font-semibold text-rose-900">
                      Return History
                    </span>
                    <Badge
                      variant="outline"
                      className="ml-2 bg-rose-100 border-rose-300 text-rose-900"
                    >
                      {dispatchOrder.returns.length}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-4 bg-white/60 rounded-b-lg">
                  <div className="border-t border-rose-200 mx-4 pt-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-rose-100/50 border-b-2 border-rose-200">
                          <tr>
                            <th className="p-2 text-left">Date</th>
                            <th className="p-2 text-left">By</th>
                            <th className="p-2 text-right">Value</th>
                            <th className="p-2 text-right">Items</th>
                            <th className="p-2 text-left">Details</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dispatchOrder.returns.map((returnDoc, idx) => (
                            <tr
                              key={idx}
                              className={`border-b border-rose-100 ${idx % 2 === 0 ? "bg-white" : "bg-rose-50/20"
                                }`}
                            >
                              <td className="p-2">
                                {new Date(
                                  returnDoc.returnedAt
                                ).toLocaleDateString("en-GB")}
                              </td>
                              <td className="p-2 text-muted-foreground">
                                {returnDoc.returnedBy?.name || "—"}
                              </td>
                              <td className="p-2 text-right font-medium">
                                {currency(returnDoc.totalReturnValue || 0)}
                              </td>
                              <td className="p-2 text-right">
                                {returnDoc.items?.length || 0}
                              </td>
                              <td className="p-2">
                                <Accordion type="single" collapsible>
                                  <AccordionItem
                                    value={`return-details-${idx}`}
                                    className="border-0"
                                  >
                                    <AccordionTrigger className="py-1 text-xs hover:no-underline">
                                      View details
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-2">
                                      <div className="space-y-1 text-xs text-muted-foreground">
                                        {returnDoc.items?.map(
                                          (item, itemIdx) => (
                                            <div key={itemIdx}>
                                              Item {item.itemIndex}:{" "}
                                              {item.returnedQuantity} qty -{" "}
                                              {item.reason || "No reason"}
                                            </div>
                                          )
                                        )}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* Return Form */}
          <Card className="bg-gradient-to-br from-rose-50/80 to-pink-50/60 border-2 border-rose-200">
            <CardHeader className="bg-rose-100/50 border-b border-rose-200">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-rose-900">
                  <Package className="h-5 w-5 text-rose-600" />
                  Return Items
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="show-all-items"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Show all items
                  </Label>
                  <input
                    id="show-all-items"
                    type="checkbox"
                    checked={showAllReturnItems}
                    onChange={(e) => setShowAllReturnItems(e.target.checked)}
                    className="cursor-pointer"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 bg-white/40">
              {returnableItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No items available to return</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-rose-100/50 border-b-2 border-rose-200">
                      <tr>
                        <th className="p-2 text-left">Image</th>
                        <th className="p-2 text-left">Product</th>
                        <th className="p-2 text-left">Code</th>
                        <th className="p-2 text-center">Remaining</th>
                        <th className="p-2 text-center">Return Qty</th>
                        <th className="p-2 text-left">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnableItems.map((item, idx) => {
                        const remainingQty = item.quantity - item.totalReturned;
                        const hasReturnQty =
                          returnQuantities[item.index] &&
                          parseFloat(returnQuantities[item.index]) > 0;

                        return (
                          <tr
                            key={item.index}
                            className={`border-b border-rose-100 transition-colors ${hasReturnQty
                              ? "bg-rose-200/40"
                              : idx % 2 === 0
                                ? "bg-white"
                                : "bg-rose-50/20"
                              }`}
                          >
                            <td className="p-2">
                              <ProductImageGallery
                                images={getImageArray(item)}
                                alt={item.productName || "Product"}
                                size="sm"
                                maxVisible={3}
                                showCount={true}
                              />
                            </td>
                            <td className="p-2">
                              <div>
                                <div className="font-medium">
                                  {item.productName}
                                </div>
                                {item.primaryColor && (
                                  <div className="text-xs text-muted-foreground">
                                    Color: {item.primaryColor}
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground mt-1">
                                  Original: {item.quantity} • Returned:{" "}
                                  <span className="text-red-600">
                                    {item.totalReturned}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-2">
                              <span className="font-mono text-xs">
                                {item.productCode}
                              </span>
                            </td>
                            <td className="p-2 text-center">
                              <span
                                className={`font-semibold ${remainingQty === 0
                                  ? "text-muted-foreground"
                                  : ""
                                  }`}
                              >
                                {remainingQty}
                              </span>
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex justify-center">
                                <Input
                                  id={`return-qty-${item.index}`}
                                  type="text"
                                  inputMode="numeric"
                                  max={remainingQty}
                                  step="1"
                                  value={returnQuantities[item.index] || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    // Allow only numbers
                                    const sanitized = val.replace(/[^0-9]/g, '');
                                    if (
                                      sanitized === "" ||
                                      (parseFloat(sanitized) >= 0 &&
                                        parseFloat(sanitized) <= remainingQty)
                                    ) {
                                      setReturnQuantities({
                                        ...returnQuantities,
                                        [item.index]: val,
                                      });
                                    }
                                  }}
                                  placeholder="0"
                                  className="h-8 text-sm w-20 text-center"
                                  disabled={remainingQty === 0}
                                />
                              </div>
                            </td>
                            <td className="p-2">
                              <div className="flex gap-2">
                                <Select
                                  value={returnReasons[item.index] || ""}
                                  onValueChange={(value) =>
                                    setReturnReasons({
                                      ...returnReasons,
                                      [item.index]: value,
                                    })
                                  }
                                  disabled={remainingQty === 0}
                                >
                                  <SelectTrigger className="h-8 text-sm w-32">
                                    <SelectValue placeholder="Select reason" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PRESET_RETURN_REASONS.map((reason) => (
                                      <SelectItem key={reason} value={reason}>
                                        {reason}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {returnReasons[item.index] &&
                                  returnReasons[item.index] === "Other" && (
                                    <Input
                                      id={`return-reason-custom-${item.index}`}
                                      value={
                                        returnReasons[`${item.index}-custom`] ||
                                        ""
                                      }
                                      onChange={(e) =>
                                        setReturnReasons({
                                          ...returnReasons,
                                          [`${item.index}-custom`]:
                                            e.target.value,
                                        })
                                      }
                                      placeholder="Specify reason"
                                      className="h-8 text-sm flex-1"
                                      disabled={remainingQty === 0}
                                    />
                                  )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>

            <div className="border-t pt-4 space-y-4 px-6 pb-6">
              <div>
                <Label
                  htmlFor="return-notes"
                  className="text-sm font-semibold mb-2 block"
                >
                  Additional Notes{" "}
                  <span className="text-muted-foreground font-normal text-xs">
                    (Optional)
                  </span>
                </Label>
                <Textarea
                  id="return-notes"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Any additional information about this return..."
                  className="min-h-[80px] text-sm"
                  rows={3}
                />
              </div>

              {/* Return Summary */}
              {Object.values(returnQuantities).some(
                (qty) => qty && parseFloat(qty) > 0
              ) && (
                  <Card className="bg-gradient-to-r from-rose-200/60 to-pink-200/40 border-2 border-rose-400">
                    <CardContent className="pt-4">
                      <p className="text-sm font-semibold mb-3">Return Summary</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          {Object.entries(returnQuantities)
                            .filter(([_, qty]) => qty && parseFloat(qty) > 0)
                            .map(([itemIndex, qty]) => {
                              const item = itemsWithDetails.find(
                                (i) => i.index === parseInt(itemIndex)
                              );
                              return (
                                <div
                                  key={itemIndex}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span className="text-muted-foreground truncate mr-2">
                                    {item?.productName}:
                                  </span>
                                  <span className="font-semibold">{qty} qty</span>
                                </div>
                              );
                            })}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Total Items:
                            </span>
                            <span className="font-semibold">
                              {
                                Object.values(returnQuantities).filter(
                                  (qty) => qty && parseFloat(qty) > 0
                                ).length
                              }
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Total Quantity:
                            </span>
                            <span className="font-semibold text-lg">
                              {Object.values(returnQuantities).reduce(
                                (sum, qty) => sum + (parseFloat(qty) || 0),
                                0
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

              <CardFooter className="flex items-center justify-end gap-4 pt-4 px-0">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setReturnQuantities({});
                    setReturnReasons({});
                    setReturnNotes("");
                  }}
                  disabled={returnMutation.isPending}
                  className="min-w-[120px]"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Clear Form
                </Button>
                <Button
                  onClick={handleReturn}
                  disabled={
                    returnMutation.isPending ||
                    Object.values(returnQuantities).every(
                      (qty) => !qty || parseFloat(qty) <= 0
                    )
                  }
                  size="lg"
                  className="min-w-[160px]"
                >
                  {returnMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Submit Return
                    </>
                  )}
                </Button>
              </CardFooter>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Packet Configuration Modal */}
      <PacketConfigurationModal
        isOpen={packetDialogOpen}
        onClose={() => {
          setPacketDialogOpen(false);
          setSelectedItemForPackets(null);
        }}
        onSave={handlePacketsSave}
        item={selectedItemForPackets}
        items={packetConfigItems}
        activeItemId={selectedItemForPackets?.modalItemId}
        initialPackets={selectedItemForPackets?.packets || []}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Delete Dispatch Order
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete dispatch order{" "}
              <strong>{dispatchOrder?.orderNumber}</strong>? This action cannot
              be undone and will permanently remove this order from the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Order
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
