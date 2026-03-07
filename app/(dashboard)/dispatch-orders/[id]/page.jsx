"use client";

import { useState, useEffect, useCallback, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/components/BackButton";
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
  CreditCard,
  Banknote,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Trash2,
  Edit,
  AlertCircle,
  Pencil,
  ImagePlus,
  X,
  Printer,
} from "lucide-react";
import toast from "react-hot-toast";
import { dispatchOrdersAPI } from "@/lib/api/endpoints/dispatchOrders";
import ProductImageGallery from "@/components/ui/ProductImageGallery";
import PacketCompositionView from "@/components/ui/PacketCompositionView";
import ArrayInput from "@/components/ui/ArrayInput";
import PacketConfigurationModal from "@/components/modals/PacketConfigurationModal";
import StandaloneSupplierPaymentModal from "@/components/modals/StandaloneSupplierPaymentModal";
import BarcodePrintModal from "@/components/modals/BarcodePrintModal";
import { MultiSelect } from "@/components/ui/multi-select";
import { SEASON_OPTIONS } from "@/lib/constants/seasons";
import { cn } from "@/lib/utils";

// Helper to get image array from various sources
const getImageArray = (item) => {
  // Check populated product images first (available for confirmed orders)
  if (Array.isArray(item.product?.images) && item.product.images.length > 0) {
    return item.product.images;
  }
  // Check productImage array (stored on dispatch order item, uploaded by supplier)
  if (Array.isArray(item.productImage) && item.productImage.length > 0) {
    return item.productImage.filter(url => url && typeof url === 'string' && url.trim() !== '');
  }
  // Backward-compat: single string productImage
  if (typeof item.productImage === 'string' && item.productImage.trim() !== '') {
    return [item.productImage];
  }
  // Check item.images field (populated by editedItems spread in itemsWithDetails)
  if (Array.isArray(item.images) && item.images.length > 0) {
    return item.images.filter(url => url && typeof url === 'string' && url.trim() !== '');
  }
  return [];
};

const truncateToTwoDecimals = (num) => {
  const val = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(val) || val === null || val === undefined) return 0;
  // Use a small epsilon to handle floating point issues like 0.54 being 0.5399999999999999
  return Math.trunc(val * 100 + 0.00000001) / 100;
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
  const { id } = use(params);
  const dispatchOrderId = id;
  const { data: dispatchOrder, isLoading } = useDispatchOrder(dispatchOrderId);
  const confirmMutation = useConfirmDispatchOrder();
  const submitApprovalMutation = useSubmitApproval();
  const returnMutation = useReturnDispatchItems();
  const deleteMutation = useDeleteDispatchOrder();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super-admin';
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState("confirm");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [returnQuantities, setReturnQuantities] = useState({});
  const [returnReasons, setReturnReasons] = useState({});
  const [cashPayment, setCashPayment] = useState("0");
  const [bankPayment, setBankPayment] = useState("0");
  const [exchangeRate, setExchangeRate] = useState("1.0");
  const [percentage, setPercentage] = useState("0");
  const [returnNotes, setReturnNotes] = useState("");
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
  // Per-row image uploading state {itemIndex: boolean}
  const [imageUploading, setImageUploading] = useState({});

  // Track which order field is being edited (for double-click editing)
  const [editingField, setEditingField] = useState(null); // 'logisticsCompany', 'dispatchDate', 'discount', null

  // Packet composition dialog state
  const [packetDialogOpen, setPacketDialogOpen] = useState(false);
  const [selectedItemForPackets, setSelectedItemForPackets] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBarcodePrintModal, setShowBarcodePrintModal] = useState(false);
  const [isPostConfirmPrint, setIsPostConfirmPrint] = useState(false);

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
      // IMPORTANT: Only use season from item.season, NEVER from item.product.season
      const initialItems = {};
      dispatchOrder.items?.forEach((item, index) => {
        // Extract season ONLY from item.season, explicitly ignore product.season
        let itemSeason = [];
        if (item.season !== undefined && item.season !== null) {
          itemSeason = Array.isArray(item.season)
            ? item.season.filter(s => s) // Filter out any null/undefined values
            : [item.season].filter(s => s);
        }
        // Explicitly do NOT use item.product?.season as fallback

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
          season: itemSeason, // Use only the explicitly extracted season
          images: (Array.isArray(item.productImage) && item.productImage.length > 0)
            ? item.productImage
            : (Array.isArray(item.product?.images) && item.product.images.length > 0)
              ? item.product.images
              : [],
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
        ? truncateToTwoDecimals((costPrice / currentExchangeRate) * (1 + currentPercentage / 100))
        : item.landedPrice ||
        truncateToTwoDecimals((costPrice / currentExchangeRate) * (1 + currentPercentage / 100));

      // Ensure season comes ONLY from itemData, never from product or fallback
      // Normalize season to array format and ensure it's only what was actually saved
      const itemSeason = Array.isArray(itemData.season)
        ? itemData.season
        : itemData.season
          ? [itemData.season]
          : [];

      return {
        ...item,
        ...itemData, // Include edited values
        season: itemSeason, // Explicitly set season from itemData only
        index,
        originalIndex: index,
        totalReturned,
        confirmedQty: quantity,
        supplierPaymentAmount,
        supplierPaymentItemTotal: costPrice * quantity,
        landedPrice,
        itemTotal: truncateToTwoDecimals(landedPrice * quantity),
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
        const landedPrice = truncateToTwoDecimals((costPrice / currentExchangeRate) * (1 + currentPercentage / 100));

        return {
          ...item,
          index: -1 - index, // Negative index for new items to distinguish
          originalIndex: null,
          totalReturned: 0,
          confirmedQty: quantity,
          supplierPaymentAmount,
          supplierPaymentItemTotal: costPrice * quantity,
          landedPrice,
          itemTotal: truncateToTwoDecimals(landedPrice * quantity),
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
      const landedPrice = truncateToTwoDecimals(
        (costPrice / currentExchangeRate) * (1 + currentPercentage / 100)
      );
      total += truncateToTwoDecimals(landedPrice * quantity);
    });

    // Add new items
    newItems.forEach((item) => {
      const costPrice = parseFloat(item.costPrice) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      const landedPrice = truncateToTwoDecimals(
        (costPrice / currentExchangeRate) * (1 + currentPercentage / 100)
      );
      total += truncateToTwoDecimals(landedPrice * quantity);
    });

    return truncateToTwoDecimals(total);
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
    return truncateToTwoDecimals(supplierPaymentBeforeDiscount - discountInEur);
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
            truncateToTwoDecimals((costPrice / currentExchangeRate) * (1 + currentPercentage / 100));
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
      // For confirmed orders, use computedPaymentDetails from the backend (ledger aggregation)
      if (dispatchOrder?.computedPaymentDetails?.totalPaid !== undefined) {
        payments = dispatchOrder.computedPaymentDetails.totalPaid || 0;
      } else {
        // Fallback to payment history if computedPaymentDetails not available
        payments = paymentHistory?.reduce((sum, entry) => {
          return sum + (entry.credit || 0);
        }, 0) || 0;
      }
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
    dispatchOrder?.computedPaymentDetails,
    cashPayment,
    bankPayment,
    paymentHistory,
  ]);

  // Filter returnable items - always show all items
  const returnableItems = itemsWithDetails.filter((item) => {
    // Always show all items (removed checkbox option)
    return true;
  });

  // Format currency
  function currency(n) {
    const num = truncateToTwoDecimals(n);
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

    // Check that all active items have packet configuration
    const unconfiguredItemNumbers = [];
    dispatchOrder.items?.forEach((item, originalIdx) => {
      if (!itemsToRemove.includes(originalIdx)) {
        if (!item.packets || item.packets.length === 0) {
          unconfiguredItemNumbers.push(originalIdx + 1);
        }
      }
    });

    if (unconfiguredItemNumbers.length > 0) {
      errors.push(
        `Items missing packet configuration: #${unconfiguredItemNumbers.join(", #")}`
      );
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

  // Strip GCS signed-URL query params (e.g. ?X-Goog-Signature=...) so only the base URL
  // is stored in the database. This prevents expired signed URLs from being persisted,
  // which would break image loading on subsequent page visits.
  const normalizeImageUrl = (url) => {
    if (!url || typeof url !== 'string') return url;
    return url.split('?')[0];
  };

  const handleSubmitApproval = useCallback(() => {
     
    if (!dispatchOrderId) {
       
      return;
    }

    // Validate before submitting
    const { isValid, errors } = validateOrderBeforeConfirm();
     

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

        // Preserve images: use editedItems.images if non-empty, otherwise fall back to item.productImage.
        // Normalize URLs by stripping signed-URL query params (?X-Goog-Signature=...) so that
        // only the base GCS path is stored in the DB — prevents expired signed URLs persisting.
        const resolvedProductImage =
          (Array.isArray(itemData.images) && itemData.images.length > 0)
            ? itemData.images.map(normalizeImageUrl).filter(Boolean)
            : (Array.isArray(item.productImage) && item.productImage.length > 0)
              ? item.productImage.map(normalizeImageUrl).filter(Boolean)
              : [];

        finalItems.push({
          ...item,
          productName: itemData.productName,
          productCode: itemData.productCode,
          quantity: parseFloat(itemData.quantity),
          costPrice: parseFloat(itemData.costPrice),
          primaryColor: itemData.primaryColor,
          size: itemData.size,
          season: itemData.season,
          productImage: resolvedProductImage,
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
     
    if (!dispatchOrderId) {
       
      return;
    }

    // Validate before confirming
    const { isValid, errors } = validateOrderBeforeConfirm();
     

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

        // Ensure season comes ONLY from itemData, never from original item
        const finalSeason = Array.isArray(itemData.season)
          ? itemData.season.filter(s => s) // Filter out null/undefined
          : itemData.season
            ? [itemData.season].filter(s => s)
            : [];

        // Preserve images: use editedItems.images if non-empty, otherwise fall back to item.productImage.
        // Normalize URLs by stripping signed-URL query params (?X-Goog-Signature=...) so that
        // only the base GCS path is stored in the DB — prevents expired signed URLs persisting.
        const resolvedProductImage =
          (Array.isArray(itemData.images) && itemData.images.length > 0)
            ? itemData.images.map(normalizeImageUrl).filter(Boolean)
            : (Array.isArray(item.productImage) && item.productImage.length > 0)
              ? item.productImage.map(normalizeImageUrl).filter(Boolean)
              : [];

        finalItems.push({
          ...item,
          productName: itemData.productName,
          productCode: itemData.productCode,
          quantity: parseFloat(itemData.quantity),
          costPrice: parseFloat(itemData.costPrice),
          primaryColor: itemData.primaryColor,
          size: itemData.size,
          season: finalSeason, // Explicitly use only itemData.season, never fallback
          productImage: resolvedProductImage,
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

     

    confirmMutation.mutate(confirmData, {
      onSuccess: () => {
        setCashPayment("0");
        setBankPayment("0");
        setExchangeRate("1.0");
        setPercentage("0");
        setActiveTab("confirm");

        // Open barcode print modal with auto-print after confirmation
        setTimeout(() => {
          setIsPostConfirmPrint(true);
          setShowBarcodePrintModal(true);
        }, 500);
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
          <BackButton fallbackPath="/dispatch-orders" label="Back to List" />
        </div>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold">Dispatch Order Not Found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
      {/* Enhanced Header */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <BackButton fallbackPath="/dispatch-orders" label="Back" />
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  Dispatch Order: {dispatchOrder.orderNumber}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {dispatchOrder.supplier?.name || dispatchOrder.supplier?.company || "Supplier"} • {dispatchOrder.dispatchDate ? new Date(dispatchOrder.dispatchDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : "—"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {dispatchOrder.status === 'confirmed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsPostConfirmPrint(false);
                  setShowBarcodePrintModal(true);
                }}
                className="hover:bg-primary/10 transition-colors"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Barcodes
              </Button>
            )}
            <Badge
              className={cn(
                "px-4 py-2 text-sm font-semibold rounded-md border",
                statusStyles[dispatchOrder.status] || statusStyles.pending
              )}
            >
              {dispatchOrder.status?.replace(/_/g, " ").replace(/-/g, " ").toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      {/* Order Info - Enhanced Design */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Info className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-lg font-semibold">Order Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Supplier - Always Read-Only */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Supplier (Not Editable)
              </Label>
              <p className="font-semibold text-base text-foreground">
                {dispatchOrder.supplier?.name ||
                  dispatchOrder.supplier?.company ||
                  "—"}
              </p>
              {dispatchOrder.supplier?.phone && (
                <p className="text-sm text-muted-foreground">
                  {(dispatchOrder.supplier?.phoneAreaCode
                    ? `${dispatchOrder.supplier.phoneAreaCode}-`
                    : "") + dispatchOrder.supplier.phone}
                </p>
              )}
              {dispatchOrder.supplier?.email && (
                <p className="text-sm text-muted-foreground">
                  {dispatchOrder.supplier.email}
                </p>
              )}
            </div>

            {/* Logistics Company - Double-click to edit for pending orders */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Logistics Company{" "}
                {isPending && <span className="text-destructive">*</span>}
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
                  className={cn(
                    "font-semibold text-base text-foreground p-2 rounded-md transition-colors",
                    isPending && "cursor-pointer hover:bg-muted border border-transparent hover:border-border"
                  )}
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

            {/* Dispatch Date - Enhanced Design */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
                <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Date {isPending && <span className="text-destructive">*</span>}
              </Label>
              {isPending && editingField === "dispatchDate" ? (
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1 group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                      <svg className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <Input
                      type="date"
                      value={editedDispatchDate}
                      onChange={(e) => setEditedDispatchDate(e.target.value)}
                      onBlur={() => setEditingField(null)}
                      className="h-11 pl-10 pr-3 text-sm font-medium border-primary focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                      autoFocus
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingField(null)}
                    className="h-11 w-11 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                    title="Confirm"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <div
                  className={cn(
                    "relative group",
                    isPending && "cursor-pointer"
                  )}
                  onDoubleClick={() =>
                    isPending && setEditingField("dispatchDate")
                  }
                  title={isPending ? "Double-click to edit" : ""}
                >
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="font-semibold text-base text-foreground tabular-nums">
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
                    {isPending && (
                      <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Discount - Double-click to edit for pending orders */}
            <div className="space-y-1">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Discount
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
                  className={cn(
                    "font-semibold text-base text-foreground p-2 rounded-md transition-colors",
                    isPending && "cursor-pointer hover:bg-muted border border-transparent hover:border-border"
                  )}
                  onDoubleClick={() =>
                    isPending && setEditingField("discount")
                  }
                  title={isPending ? "Double-click to edit" : ""}
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
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
                  className={cn(
                    "font-semibold text-base text-foreground p-2 rounded-md transition-colors",
                    isPending && "cursor-pointer hover:bg-muted border border-transparent hover:border-border"
                  )}
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
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Exchange Rate
                  </Label>
                  <p className="font-semibold text-base text-foreground">
                    {dispatchOrder.exchangeRate
                      ? dispatchOrder.exchangeRate.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })
                      : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Percentage
                  </Label>
                  <p className="font-semibold text-base text-foreground">
                    {dispatchOrder.percentage != null
                      ? `${dispatchOrder.percentage}%`
                      : "—"}
                  </p>
                </div>
              </>
            )}
            {isConfirmed && dispatchOrder.computedPaymentDetails && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Cash Payment
                  </Label>
                  <p className="font-semibold text-base text-foreground">
                    {(dispatchOrder.computedPaymentDetails.cashPayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Bank Payment
                  </Label>
                  <p className="font-semibold text-base text-foreground">
                    {(dispatchOrder.computedPaymentDetails.bankPayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items - Enhanced Design */}
      <Card className="border border-border bg-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Items</CardTitle>
              </div>
            </div>
            <div className="text-sm text-muted-foreground font-medium">
              {isPending && !dispatchOrder?.returnedItems?.length ? (
                <span>
                  {remainingItemsSummary.rows} items • {currency(remainingItemsSummary.value)}
                </span>
              ) : (
                <span>
                  {remainingItemsSummary.quantity} units remaining ({remainingItemsSummary.rows} products) • {currency(remainingItemsSummary.value)}
                  {activeItemsWithDetails.some(
                    (item) => item.totalReturned > 0
                  ) && (
                      <span className="text-destructive ml-2">
                        ({activeItemsWithDetails.reduce(
                          (sum, item) => sum + item.totalReturned,
                          0
                        )} returned)
                      </span>
                    )}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border sticky top-0 z-10">
                <tr>
                  {isPending && (
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      ✓
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Image
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">
                    Colors
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">
                    Sizes
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-24">
                    Season
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-16">
                    Packets
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {isPending ? "QTY" : "Remaining Qty"}
                  </th>
                  {!isPending && (
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Returned
                    </th>
                  )}
                  {!isPending && (
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Original Qty
                    </th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Cost Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Supplier Payment
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Landed Price
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Landed Total
                  </th>
                  {isPending && (
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {itemsWithDetails.map((item, idx) => {
                  const itemData = editedItems[item.index] || item;
                  const isVerified = itemVerifications[item.index] || false;
                  const isRemoved = itemsToRemove.includes(item.index);

                  // Recalculate with edited values
                  // ALWAYS use the remaining quantity (original/edited minus returns) for financial calculations
                  // item.confirmedQty already contains the remaining amount (original - returned)
                  const editedQuantity = item.confirmedQty ?? 0;
                  // Get cost price from editedItems first (user edits), then from original item
                  // Make sure we're getting the actual cost price, not any other numeric value
                  const editedCostPrice = editedItems[item.index]?.costPrice !== undefined
                    ? parseFloat(editedItems[item.index].costPrice) || 0
                    : parseFloat(item.costPrice) || 0;
                  // All financial calculations MUST use editedQuantity (which is confirmedQty)
                  const supplierPaymentItemTotal =
                    editedCostPrice * editedQuantity;
                  const supplierPaymentAmount =
                    editedCostPrice / currentExchangeRate;
                  const landedPrice =
                    truncateToTwoDecimals((editedCostPrice / currentExchangeRate) *
                      (1 + currentPercentage / 100));
                  const itemTotal = truncateToTwoDecimals(landedPrice * editedQuantity);

                  return (
                    <tr
                      key={item.index}
                      className={cn(
                        "transition-colors hover:bg-muted/20",
                        isRemoved && "opacity-50 bg-destructive/5",
                        isPending && !isVerified && "bg-amber-50/30",
                        isPending && isVerified && "bg-emerald-50/20"
                      )}
                    >
                      {isPending && (
                        <td className="px-4 py-3 text-center">
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
                      <td className="px-4 py-3 align-top">
                        {isPending && !isRemoved ? (
                          /* Editable image cell for pending orders */
                          <div className="flex flex-col gap-1.5 min-w-[80px]">
                            {/* Thumbnails with remove button */}
                            {(itemData.images || []).map((url, imgIdx) => (
                              <div key={imgIdx} className="relative group w-14 h-14 flex-shrink-0">
                                <img
                                  src={url}
                                  alt={`Image ${imgIdx + 1}`}
                                  className="w-14 h-14 object-cover rounded border border-border"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newImages = (itemData.images || []).filter((_, i) => i !== imgIdx);
                                    setEditedItems({
                                      ...editedItems,
                                      [item.index]: { ...itemData, images: newImages },
                                    });
                                  }}
                                  className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Remove image"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            ))}
                            {/* Add image button */}
                            <label
                              className="w-14 h-14 flex items-center justify-center rounded border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors flex-shrink-0"
                              title="Add image"
                            >
                              {imageUploading[item.index] ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              ) : (
                                <ImagePlus className="h-4 w-4 text-muted-foreground" />
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                disabled={imageUploading[item.index]}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  // Reset input so same file can be re-selected if needed
                                  e.target.value = "";
                                  setImageUploading((prev) => ({ ...prev, [item.index]: true }));
                                  try {
                                    const result = await dispatchOrdersAPI.uploadItemImage(
                                      dispatchOrderId,
                                      item.index,
                                      file
                                    );
                                    const newUrl = result?.imageUrl || result?.url;
                                    if (!newUrl) throw new Error("No image URL returned");
                                    const currentImages = itemData.images || [];
                                    setEditedItems({
                                      ...editedItems,
                                      [item.index]: {
                                        ...itemData,
                                        images: [...currentImages, newUrl],
                                      },
                                    });
                                    toast.success("Image uploaded");
                                  } catch (err) {
                                    toast.error(err?.response?.data?.message || err?.message || "Image upload failed");
                                  } finally {
                                    setImageUploading((prev) => ({ ...prev, [item.index]: false }));
                                  }
                                }}
                              />
                            </label>
                          </div>
                        ) : (
                          <ProductImageGallery
                            images={getImageArray(item)}
                            productId={item.product?._id?.toString()}
                            alt={itemData.productName || "Product"}
                            size="sm"
                            maxVisible={3}
                            showCount={true}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
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
                      <td className="px-4 py-3 align-top">
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
                          <span className="font-mono text-xs font-medium text-foreground">{itemData.productCode}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 w-24 align-top">
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
                      <td className="px-4 py-3 w-24 align-top">
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
                      <td className="px-4 py-3 w-24 align-top">
                        {isPending && !isRemoved ? (
                          <div className="min-w-[120px]">
                            <MultiSelect
                              options={SEASON_OPTIONS}
                              value={Array.isArray(itemData.season) ? itemData.season : []}
                              onChange={(seasons) =>
                                setEditedItems({
                                  ...editedItems,
                                  [item.index]: {
                                    ...itemData,
                                    season: seasons,
                                  },
                                })
                              }
                              placeholder="Select seasons"
                              disabled={isRemoved}
                            />
                          </div>
                        ) : (
                          <div className="text-xs">
                            {(() => {
                              // Ensure we only display seasons that are actually in the item data
                              // Filter out any invalid or unexpected values
                              const validSeasons = Array.isArray(item.season)
                                ? item.season.filter(s => s && typeof s === 'string')
                                : [];
                              return validSeasons.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {validSeasons.map((s, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-block px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px]"
                                    >
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">
                                  —
                                </span>
                              );
                            })()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 w-16 text-center">
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

                          {/* Breakdown Display - Per Packet */}
                          {(() => {
                            const packets = item.packets || [];
                            if (packets.length === 0) return null;

                            // Use first packet's composition as the per-packet breakdown.
                            // All packets share the same template, so packets[0] represents any single packet.
                            const perPacketBreakdown = {};
                            packets[0]?.composition?.forEach((c) => {
                              if (c.color && c.size && c.quantity > 0) {
                                const key = `${c.color}-${c.size}`;
                                perPacketBreakdown[key] = parseInt(c.quantity) || 0;
                              }
                            });

                            const parts = Object.entries(perPacketBreakdown);
                            if (parts.length === 0) return null;

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
                      <td className="px-4 py-3 text-right align-top">
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
                            <span className="font-semibold text-primary h-8 flex items-center">
                              {/* ALWAYS show remaining quantity (confirmedQty) which matches Return History */}
                              {item.confirmedQty ?? 0}
                            </span>
                          )}
                          {isPending && item.totalReturned > 0 && (
                            <span className="text-xs text-destructive font-medium">
                              -{item.totalReturned} returned
                            </span>
                          )}
                          {isPending && (
                            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                              rem: {item.confirmedQty}
                            </span>
                          )}
                        </div>
                      </td>
                      {!isPending && (
                        <>
                          <td className="px-4 py-3 text-right text-destructive font-semibold align-top">
                            {item.totalReturned}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-muted-foreground align-top">
                            {item.quantity}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-right align-top">
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
                      <td className="px-4 py-3 text-right font-semibold text-foreground align-top">
                        {truncateToTwoDecimals(supplierPaymentItemTotal).toFixed(2) || "—"}
                        {!isPending && item.totalReturned > 0 && (
                          <div className="text-xs text-destructive mt-1">
                            (was{" "}
                            {truncateToTwoDecimals((item.costPrice || 0) * item.quantity).toFixed(2)}{" "}
                            before returns)
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-primary align-top">
                        {truncateToTwoDecimals(landedPrice).toFixed(2) || "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-primary align-top">
                        {truncateToTwoDecimals(itemTotal).toFixed(2) || "—"}
                        {!isPending && item.totalReturned > 0 && (
                          <div className="text-xs text-destructive mt-1">
                            (was{" "}
                            {truncateToTwoDecimals(
                              ((item.costPrice || 0) /
                                currentExchangeRate) *
                              (1 + currentPercentage / 100) *
                              item.quantity
                            )}{" "}
                            before returns)
                          </div>
                        )}
                      </td>
                      {
                        isPending && (
                          <td className="px-4 py-3 text-center align-top">
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
                        )
                      }
                    </tr >
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add New Item Section - Only for Pending Orders */}

      {/* Tabs for Confirm Order and Return Items */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/30 p-1 rounded-lg">
          <TabsTrigger value="confirm" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Confirm Order</TabsTrigger>
          <TabsTrigger value="return" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">Return Items</TabsTrigger>
        </TabsList>

        {/* Confirm Order Tab */}
        <TabsContent value="confirm" className="space-y-4 mt-4">
          {/* Confirm Form (for pending and pending-approval orders) */}
          {isPending && (
            <Card className="border border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Confirm Dispatch Order</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Enter exchange rate and percentage to confirm this order</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="exchange-rate"
                      className="text-sm font-medium text-foreground"
                    >
                      Exchange Rate <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="exchange-rate"
                      type="text"
                      inputMode="decimal"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(e.target.value)}
                      className="h-10"
                      placeholder="1.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="percentage" className="text-sm font-medium text-foreground">
                      Percentage (%) <span className="text-destructive">*</span>
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
                      className="h-10"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="cash-payment"
                      className="text-sm font-medium text-foreground flex items-center gap-2"
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
                      className="h-10"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="bank-payment"
                      className="text-sm font-medium text-foreground flex items-center gap-2"
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
                      className="h-10"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <Card className="border border-border bg-muted/20">
                  <CardContent className="pt-6 space-y-4">
                    {dispatchOrder?.returnedItems &&
                      dispatchOrder.returnedItems.length > 0 && (
                        <div className="mb-4 p-3 bg-amber-50/50 border border-amber-200 rounded-md text-sm text-amber-800">
                          <span className="font-semibold">Note:</span> Values below reflect remaining quantities after returns.
                        </div>
                      )}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          Supplier Payment Amount:
                        </span>
                        <span className="text-base font-semibold text-foreground">
                          {truncateToTwoDecimals(confirmOrderSupplierCurrency.supplierPaymentAmount).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </span>
                      </div>
                      {confirmOrderSupplierCurrency.discount > 0 && (
                        <div className="flex items-center justify-between py-2 border-t border-border">
                          <span className="text-sm font-medium text-muted-foreground">
                            Discount:
                          </span>
                          <span className="text-base font-semibold text-emerald-600">
                            -
                            {truncateToTwoDecimals(confirmOrderSupplierCurrency.discount).toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-3 border-t border-border">
                        <span className="text-sm font-medium text-muted-foreground">
                          Final Amount:
                        </span>
                        <span className="text-xl font-bold text-foreground">
                          {truncateToTwoDecimals(confirmOrderSupplierCurrency.finalAmount).toLocaleString(
                            undefined,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-t border-border">
                        <span className="text-sm font-medium text-muted-foreground">
                          Payments:
                        </span>
                        <span className="text-base font-semibold text-foreground">
                          {truncateToTwoDecimals(confirmOrderSupplierCurrency.payments).toLocaleString(
                            undefined,
                            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-3 border-t-2 border-border bg-muted/30 rounded-md px-4 -mx-4 -mb-4">
                        <span className="text-sm font-semibold text-foreground">
                          Remaining Balance:
                        </span>
                        <span
                          className={cn(
                            "text-xl font-bold",
                            confirmOrderSupplierCurrency.remainingBalance > 0
                              ? "text-destructive"
                              : "text-emerald-600"
                          )}
                        >
                          {truncateToTwoDecimals(Math.abs(confirmOrderSupplierCurrency.remainingBalance)).toLocaleString(
                            undefined,
                            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-border">
                <Button
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={
                    confirmMutation.isPending || deleteMutation.isPending
                  }
                  variant="destructive"
                  size="lg"
                  className="min-w-[160px] gap-2"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Delete Order
                    </>
                  )}
                </Button>
                {/* Super-admin: Confirm Order button (for both pending and pending-approval) */}
                {isSuperAdmin && (dispatchOrder?.status === 'pending' || dispatchOrder?.status === 'pending-approval') && (
                  <Button
                    onClick={() => {
                       
                      handleConfirm();
                    }}
                    disabled={
                      confirmMutation.isPending ||
                      deleteMutation.isPending ||
                      !totalBoxesConfirmed
                    }
                    size="lg"
                    className="min-w-[160px] gap-2"
                    title={!totalBoxesConfirmed ? "Please confirm total boxes before confirming order" : ""}
                  >
                    {confirmMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Confirm Order
                      </>
                    )}
                  </Button>
                )}
                {/* Admin: Submit Approval button (for pending and pending-approval orders) */}
                {isAdmin && (dispatchOrder?.status === 'pending' || dispatchOrder?.status === 'pending-approval') && (
                  <Button
                    onClick={() => {
                       
                      handleSubmitApproval();
                    }}
                    disabled={
                      submitApprovalMutation.isPending ||
                      deleteMutation.isPending ||
                      !totalBoxesConfirmed
                    }
                    size="lg"
                    className="min-w-[160px] gap-2"
                    title={!totalBoxesConfirmed ? "Please confirm total boxes before submitting for approval" : ""}
                  >
                    {submitApprovalMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        {dispatchOrder?.status === 'pending-approval' ? 'Re-submit for Approval' : 'Submit Approval'}
                      </>
                    )}
                  </Button>
                )}
              </CardFooter>
            </Card>
          )}

          {/* Payment Details - Enhanced Design */}
          {isConfirmed && (dispatchOrder.paymentDetails || dispatchOrder.computedPaymentDetails) && (
            <Card className="border border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-lg font-semibold">Payment Details</CardTitle>
                      {dispatchOrder?.returnedItems &&
                        dispatchOrder.returnedItems.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Payment amounts reflect remaining quantities after returns
                          </p>
                        )}
                    </div>
                  </div>
                  {canAddPayment && !showPaymentModal && (
                    <Button size="sm" onClick={() => setShowPaymentModal(true)} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Payment
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-2 p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-md bg-blue-500/10 flex items-center justify-center">
                        <Banknote className="h-4 w-4 text-blue-600" />
                      </div>
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Cash Payment
                      </Label>
                    </div>
                    <p className="text-xl font-bold text-foreground">
                      {(dispatchOrder.computedPaymentDetails?.cashPayment || 0)
                        .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="space-y-2 p-4 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-8 w-8 rounded-md bg-indigo-500/10 flex items-center justify-center">
                        <CreditCard className="h-4 w-4 text-indigo-600" />
                      </div>
                      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Bank Payment
                      </Label>
                    </div>
                    <p className="text-xl font-bold text-foreground">
                      {(dispatchOrder.computedPaymentDetails?.bankPayment || 0)
                        .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="space-y-2 p-4 rounded-lg bg-muted/30 border border-border">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-2">
                      Remaining Balance
                    </Label>
                    {(() => {
                      const calculatedRemaining = confirmOrderSupplierCurrency.remainingBalance;
                      return (
                        <p
                          className={cn(
                            "text-xl font-bold",
                            calculatedRemaining > 0 ? "text-destructive" : "text-emerald-600"
                          )}
                        >
                          {Math.abs(calculatedRemaining).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}



          {/* Standalone Supplier Payment Modal */}
          {isConfirmed && dispatchOrder?.supplier && (
            <StandaloneSupplierPaymentModal
              open={showPaymentModal}
              onClose={() => setShowPaymentModal(false)}
              entityId={dispatchOrder.supplier._id}
              entityName={dispatchOrder.supplier.name || dispatchOrder.supplier.company}
              onSuccess={() => {
                // Invalidate queries to refresh data
                queryClient.invalidateQueries({ queryKey: ["dispatch-order", dispatchOrderId] });
                queryClient.invalidateQueries({ queryKey: ["dispatch-order-payments", dispatchOrderId] });
                queryClient.invalidateQueries({ queryKey: ["dispatch-orders"] });
                queryClient.invalidateQueries({ queryKey: ["unpaid-dispatch-orders"] });
                queryClient.invalidateQueries({ queryKey: ["pending-balances"] });
                queryClient.invalidateQueries({ queryKey: ["ledger", "supplier"] });
                queryClient.invalidateQueries({ queryKey: ["ledger"] });
                queryClient.invalidateQueries({ queryKey: ["suppliers"] });
              }}
            />
          )}

          {/* Payment History - Enhanced Design */}
          {isConfirmed && paymentHistory.length > 0 && (
            <Card className="border border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold">Payment History</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{paymentHistory.length} payment{paymentHistory.length !== 1 ? 's' : ''} recorded</p>
                  </div>
                  <Badge variant="outline" className="bg-muted border-border">
                    {paymentHistory.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 border-b border-border sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Method</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {paymentHistory.map((payment, idx) => (
                        <tr
                          key={idx}
                          className="transition-colors hover:bg-muted/20"
                        >
                          <td className="px-4 py-3 font-medium text-foreground">
                            {new Date(payment.date).toLocaleDateString(
                              "en-GB",
                              { day: '2-digit', month: 'short', year: 'numeric' }
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="bg-muted border-border">
                              {payment.paymentMethod === "cash"
                                ? "Cash"
                                : "Bank"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-foreground">
                            {currency(payment.credit || 0)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {payment.description || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Return Items Tab */}
        <TabsContent value="return" className="space-y-4 mt-4">
          {/* Returns History - Enhanced Design */}
          {dispatchOrder.returns && dispatchOrder.returns.length > 0 && (
            <Card className="border border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-rose-600" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold">Return History</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{dispatchOrder.returns.length} return{dispatchOrder.returns.length !== 1 ? 's' : ''} recorded</p>
                  </div>
                  <Badge variant="outline" className="bg-muted border-border">
                    {dispatchOrder.returns.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 border-b border-border sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">By</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Value</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Items</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Qty</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {dispatchOrder.returns.map((returnDoc, idx) => (
                        <tr
                          key={idx}
                          className="transition-colors hover:bg-muted/20"
                        >
                          <td className="px-4 py-3 font-medium text-foreground">
                            {new Date(
                              returnDoc.returnedAt
                            ).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {returnDoc.returnedBy?.name || "—"}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-foreground">
                            {(() => {
                              // Calculate return value correctly: sum of (costPrice * returnedQuantity) for each item
                              let calculatedValue = 0;
                              if (returnDoc.items && dispatchOrder?.items) {
                                returnDoc.items.forEach((returnItem) => {
                                  const originalItem = dispatchOrder.items[returnItem.itemIndex];
                                  if (originalItem) {
                                    const costPrice = parseFloat(originalItem.costPrice) || 0;
                                    const returnedQty = returnItem.returnedQuantity || 0;
                                    calculatedValue += costPrice * returnedQty;
                                  }
                                });
                              }
                              // Use calculated value if available, otherwise fallback to backend value
                              const value = calculatedValue > 0 ? calculatedValue : (returnDoc.totalReturnValue || 0);
                              // Format number without currency symbol
                              return value.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              });
                            })()}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-foreground">
                            {returnDoc.items?.length || 0}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-foreground">
                            {(() => {
                              // Calculate total quantity of returned items
                              const totalQty = returnDoc.items?.reduce((sum, item) => {
                                return sum + (item.returnedQuantity || 0);
                              }, 0) || 0;
                              return totalQty;
                            })()}
                          </td>
                          <td className="px-4 py-3">
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
              </CardContent>
            </Card>
          )}

          {/* Return Form - Enhanced Design */}
          <Card className="border border-border bg-card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <Package className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Return Items</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Select items to return and provide reasons</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {returnableItems.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                    <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No items available to return</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 border-b border-border sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Image</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Code</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Remaining</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">Return Qty</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {returnableItems.map((item, idx) => {
                        const remainingQty = item.quantity - item.totalReturned;
                        const hasReturnQty =
                          returnQuantities[item.index] &&
                          parseFloat(returnQuantities[item.index]) > 0;

                        return (
                          <tr
                            key={item.index}
                            className={cn(
                              "transition-colors hover:bg-muted/20",
                              hasReturnQty && "bg-rose-50/30"
                            )}
                          >
                            <td className="px-4 py-3">
                              <ProductImageGallery
                                images={getImageArray(item)}
                                productId={item.product?._id?.toString()}
                                alt={item.productName || "Product"}
                                size="sm"
                                maxVisible={3}
                                showCount={true}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <div className="font-semibold text-foreground">
                                  {item.productName}
                                </div>
                                {item.primaryColor && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Color: {item.primaryColor}
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground mt-1">
                                  Original: {item.quantity} • Returned:{" "}
                                  <span className="text-destructive font-medium">
                                    {item.totalReturned}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs font-medium text-foreground">
                                {item.productCode}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={cn(
                                  "font-semibold",
                                  remainingQty === 0 && "text-muted-foreground"
                                )}
                              >
                                {remainingQty}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center">
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
                            <td className="px-4 py-3">
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

            <CardFooter className="flex flex-col gap-6 pt-6 border-t border-border">
              <div className="w-full">
                <Label
                  htmlFor="return-notes"
                  className="text-sm font-semibold mb-2 block text-foreground"
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
                  className="min-h-[100px] text-sm"
                  rows={4}
                />
              </div>

              {/* Return Summary */}
              {Object.values(returnQuantities).some(
                (qty) => qty && parseFloat(qty) > 0
              ) && (
                  <Card className="border border-border bg-muted/20">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
                          <Package className="h-5 w-5 text-rose-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground">Return Summary</h3>
                      </div>

                      <div className="space-y-6">
                        {/* Items List */}
                        <div className="bg-card rounded-lg p-4 border border-border">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Items to Return</p>
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
                                    className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-md border border-border hover:bg-muted/50 transition-colors"
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <div className="h-2 w-2 rounded-full bg-rose-500 flex-shrink-0"></div>
                                      <span className="text-sm font-medium text-foreground truncate">
                                        {item?.productName || "Unknown Item"}
                                      </span>
                                    </div>
                                    <Badge variant="outline" className="ml-2 bg-rose-50 border-rose-200 text-rose-700 font-semibold">
                                      {qty} {parseFloat(qty) === 1 ? 'item' : 'items'}
                                    </Badge>
                                  </div>
                                );
                              })}
                          </div>
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-card rounded-lg p-4 border border-border">
                            <div className="flex items-center gap-2 mb-2">
                              <Package className="h-4 w-4 text-rose-600" />
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Items</span>
                            </div>
                            <p className="text-2xl font-bold text-foreground">
                              {
                                Object.values(returnQuantities).filter(
                                  (qty) => qty && parseFloat(qty) > 0
                                ).length
                              }
                            </p>
                          </div>
                          <div className="bg-card rounded-lg p-4 border border-border">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle2 className="h-4 w-4 text-rose-600" />
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Quantity</span>
                            </div>
                            <p className="text-2xl font-bold text-foreground">
                              {Object.values(returnQuantities).reduce(
                                (sum, qty) => sum + (parseFloat(qty) || 0),
                                0
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-6 border-t border-border">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setReturnQuantities({});
                    setReturnReasons({});
                    setReturnNotes("");
                  }}
                  disabled={returnMutation.isPending}
                  className="min-w-[140px] gap-2"
                >
                  <XCircle className="h-4 w-4" />
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
                  className="min-w-[160px] gap-2"
                >
                  {returnMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Submit Return
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
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

      {/* Barcode Print Modal */}
      <BarcodePrintModal
        open={showBarcodePrintModal}
        onClose={() => {
          setShowBarcodePrintModal(false);
          setIsPostConfirmPrint(false);
        }}
        dispatchOrderId={dispatchOrderId}
        autoPrint={isPostConfirmPrint}
      />
    </div >
  );
}
