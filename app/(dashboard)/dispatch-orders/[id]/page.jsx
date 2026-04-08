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
  useDispatchOrderPacketStocks,
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
  FilePen,
  Euro,
  Coins,
  Scissors,
  FileText,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { dispatchOrdersAPI } from "@/lib/api/endpoints/dispatchOrders";
import ProductImageGallery from "@/components/ui/ProductImageGallery";
import ImageLightbox from "@/components/ui/ImageLightbox";
import PacketCompositionView from "@/components/ui/PacketCompositionView";
import ArrayInput from "@/components/ui/ArrayInput";
import PacketConfigurationModal from "@/components/modals/PacketConfigurationModal";
import StandaloneSupplierPaymentModal from "@/components/modals/StandaloneSupplierPaymentModal";
import BarcodePrintModal from "@/components/modals/BarcodePrintModal";
import { useSubmitEditRequest } from "@/lib/hooks/useEditRequests";
import DeleteRequestDialog from "@/components/modals/DeleteRequestDialog";
import { MultiSelect } from "@/components/ui/multi-select";
import { SEASON_OPTIONS } from "@/lib/constants/seasons";
import { cn } from "@/lib/utils";
import BritishDatePicker from "@/components/BritishDatePicker";

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
  const [cashPayment, setCashPayment] = useState("");
  const [bankPayment, setBankPayment] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
  const [percentage, setPercentage] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [showAllReturnItems, setShowAllReturnItems] = useState(false);
  const { data: packetStocks = [], isLoading: packetsLoading } = useDispatchOrderPacketStocks(dispatchOrderId);
  const [selectedPacketForReturn, setSelectedPacketForReturn] = useState(null);
  const [returnType, setReturnType] = useState("packet"); // 'packet', 'loose', 'break'
  const [breakReturnItems, setBreakReturnItems] = useState([]); // Array of { size, color, quantity }
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [showReturnDialog, setShowReturnDialog] = useState(false);

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

  // Lightbox state for viewing pending-item images
  const [pendingGallery, setPendingGallery] = useState({ open: false, images: [], itemIndex: null });

  // Track which order field is being edited (for double-click editing)
  const [editingField, setEditingField] = useState(null); // 'logisticsCompany', 'dispatchDate', 'discount', null

  // Packet composition dialog state
  const [packetDialogOpen, setPacketDialogOpen] = useState(false);
  const [selectedItemForPackets, setSelectedItemForPackets] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBarcodePrintModal, setShowBarcodePrintModal] = useState(false);
  const [isPostConfirmPrint, setIsPostConfirmPrint] = useState(false);
  const [editRequestReason, setEditRequestReason] = useState("");
  const [showDeleteRequestDialog, setShowDeleteRequestDialog] = useState(false);


  const submitEditRequestMutation = useSubmitEditRequest();

  // Confirmed order inline edit state
  const [isEditingConfirmed, setIsEditingConfirmed] = useState(false);
  const [confirmedEditLoading, setConfirmedEditLoading] = useState(false);
  const [confirmedEditSaving, setConfirmedEditSaving] = useState(false);
  const [confirmedEditError, setConfirmedEditError] = useState(null);
  const [confirmedEditResult, setConfirmedEditResult] = useState(null);
  const [confirmedEditForm, setConfirmedEditForm] = useState({ exchangeRate: '', percentage: '', discount: '', items: [] });
  const [confirmedEditImpact, setConfirmedEditImpact] = useState(null);

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
  const isEligibleForEdit = ['confirmed', 'picked_up', 'in_transit', 'delivered'].includes(dispatchOrder?.status);
  const canDeleteDispatchOrder =
    !!dispatchOrder &&
    (isSuperAdmin || (isAdmin && dispatchOrder.status === "pending"));


  // Initialize exchange rate and percentage from dispatch order or defaults
  useEffect(() => {
    if (dispatchOrder && isPending) {
      setExchangeRate("");
      setPercentage("");
      setEditedDiscount(String(dispatchOrder.totalDiscount || 0));
      setEditedTotalBoxes(String(dispatchOrder.totalBoxes || 0));
      setTotalBoxesConfirmed(!!dispatchOrder.isTotalBoxesConfirmed);

      // Initialize financials from paymentDetails (drafts)
      if (dispatchOrder.paymentDetails) {
        setCashPayment(dispatchOrder.paymentDetails.cashPayment ? String(dispatchOrder.paymentDetails.cashPayment) : "");
        setBankPayment(dispatchOrder.paymentDetails.bankPayment ? String(dispatchOrder.paymentDetails.bankPayment) : "");
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
        const formatted = date.toLocaleDateString('en-CA');
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
          minSellingPrice: item.minSellingPrice ?? item.product?.pricing?.minSellingPrice ?? item.product?.pricing?.sellingPrice ?? 0,
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
    ? parseFloat(exchangeRate) || 0
    : dispatchOrder?.exchangeRate || 0;
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
        isPending && editedItems[item.index]
          ? editedItems[item.index]
          : isEditingConfirmed && item.originalIndex !== null
            ? {
              ...item,
              ...(confirmedEditForm.items[item.originalIndex] || {}),
            }
            : item;
      return {
        id: String(item.index ?? idx),
        index: item.index ?? idx,
        productName:
          itemData.productName || itemData.productCode || `Item ${idx + 1}`,
        productCode: itemData.productCode,
        quantity: parseFloat(itemData.quantity ?? item.confirmedQty ?? 0) || 0,
        primaryColor: itemData.primaryColor || [],
        size: itemData.size || [],
        packets: itemData.packets || [],
        useVariantTracking: itemData.useVariantTracking || false,
      };
    });
  }, [activeItemsWithDetails, editedItems, isPending, isEditingConfirmed, confirmedEditForm.items]);

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

  // Confirmed order inline edit handlers
  const handleEnterEditMode = async () => {
    setConfirmedEditLoading(true);
    setConfirmedEditError(null);
    try {
      const res = await dispatchOrdersAPI.editImpact(dispatchOrderId);
      const data = res?.data?.data || res?.data || res;
      setConfirmedEditImpact({
        hasSoldItems: data.hasSoldItems,
        currentSupplierPaymentTotal: data.currentSupplierPaymentTotal,
        items: data.items || [],
      });

      let initialDispatchDate = "";
      if (dispatchOrder.dispatchDate) {
        const d = new Date(dispatchOrder.dispatchDate);
        const y = d.getUTCFullYear();
        const m = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        initialDispatchDate = `${y}-${m}-${day}`;
      }

      setConfirmedEditForm({
        exchangeRate: String(data.currentExchangeRate ?? ''),
        percentage: String(data.currentPercentage ?? ''),
        discount: String(data.currentDiscount ?? '0'),
        dispatchDate: initialDispatchDate,
        items: (data.items || []).map(item => ({
          costPrice: String(item.currentCostPrice ?? ''),
          minSellingPrice: String(item.currentMinSellingPrice ?? ''),
          quantity: String(item.orderedQuantity ?? ''),
          soldQty: item.soldQuantity ?? 0,
          productName: item.productName || '',
          productCode: item.productCode || '',
          primaryColor: Array.isArray(item.primaryColor) ? item.primaryColor : [],
          size: Array.isArray(item.size) ? item.size : [],
          season: Array.isArray(item.season) ? item.season : [],
          material: item.material || '',
          description: item.description || '',
          productId: item.productId || '',
          packets: Array.isArray(item.packets) ? item.packets : [],
          useVariantTracking: item.useVariantTracking || false,
        })),
      });
      setIsEditingConfirmed(true);
    } catch (err) {
      setConfirmedEditError(err?.response?.data?.message || err?.message || 'Failed to load order data');
    } finally {
      setConfirmedEditLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingConfirmed(false);
    setConfirmedEditForm({ exchangeRate: '', percentage: '', discount: '', items: [] });
    setConfirmedEditImpact(null);
    setConfirmedEditError(null);
    setConfirmedEditResult(null);
  };

  const handleSaveConfirmedEdit = async () => {
    setConfirmedEditSaving(true);
    setConfirmedEditError(null);
    try {
      const payload = {
        exchangeRate: parseFloat(confirmedEditForm.exchangeRate),
        percentage: parseFloat(confirmedEditForm.percentage),
        discount: parseFloat(confirmedEditForm.discount),
        dispatchDate: confirmedEditForm.dispatchDate || undefined,
        items: confirmedEditForm.items.map(item => ({
          costPrice: parseFloat(item.costPrice),
          minSellingPrice:
            item.minSellingPrice === '' || item.minSellingPrice === undefined || item.minSellingPrice === null
              ? undefined
              : parseFloat(item.minSellingPrice),
          quantity: parseInt(item.quantity),
          productName: String(item.productName || '').trim(),
          productCode: String(item.productCode || '').trim().toUpperCase(),
          primaryColor: Array.isArray(item.primaryColor) ? item.primaryColor : [],
          size: Array.isArray(item.size) ? item.size : [],
          season: Array.isArray(item.season) ? item.season : [],
          material: String(item.material || '').trim(),
          description: String(item.description || '').trim(),
          productId: String(item.productId || '').trim() || undefined,
          packets: Array.isArray(item.packets) ? item.packets : [],
          useVariantTracking: Boolean(item.useVariantTracking),
        })),
      };

      if (!isSuperAdmin) {
        // Non-super-admin: submit edit request
        if (!editRequestReason.trim()) {
          setConfirmedEditError("Please provide a reason for the edit request.");
          setConfirmedEditSaving(false);
          return;
        }

        const requestedChanges = {};
        if (confirmedEditImpact) {
          const impactData = confirmedEditImpact;
          const origER = dispatchOrder?.exchangeRate;
          const origPct = dispatchOrder?.percentage;
          const origDisc = dispatchOrder?.discount || 0;
          
          let origDate = "";
          if (dispatchOrder.dispatchDate) {
            const d = new Date(dispatchOrder.dispatchDate);
            const y = d.getUTCFullYear();
            const m = String(d.getUTCMonth() + 1).padStart(2, '0');
            const day = String(d.getUTCDate()).padStart(2, '0');
            origDate = `${y}-${m}-${day}`;
          }

          if (payload.exchangeRate !== origER) requestedChanges.exchangeRate = { from: origER, to: payload.exchangeRate };
          if (payload.percentage !== origPct) requestedChanges.percentage = { from: origPct, to: payload.percentage };
          if (payload.discount !== origDisc) requestedChanges.discount = { from: origDisc, to: payload.discount };
          if (payload.dispatchDate !== origDate) requestedChanges.dispatchDate = { from: origDate, to: payload.dispatchDate };
          payload.items.forEach((item, i) => {
            const orig = impactData.items?.[i];
            if (orig && item.costPrice !== orig.currentCostPrice) {
              requestedChanges[`items[${i}].costPrice`] = { from: orig.currentCostPrice, to: item.costPrice };
            }
            if (orig && item.minSellingPrice !== orig.currentMinSellingPrice) {
              requestedChanges[`items[${i}].minSellingPrice`] = { from: orig.currentMinSellingPrice, to: item.minSellingPrice };
            }
            if (orig && item.quantity !== orig.orderedQuantity) {
              requestedChanges[`items[${i}].quantity`] = { from: orig.orderedQuantity, to: item.quantity };
            }
            if (orig && item.productName !== (orig.productName || '')) {
              requestedChanges[`items[${i}].productName`] = { from: orig.productName || '', to: item.productName };
            }
            if (orig && item.productCode !== (orig.productCode || '')) {
              requestedChanges[`items[${i}].productCode`] = { from: orig.productCode || '', to: item.productCode };
            }
            if (orig && JSON.stringify(item.primaryColor || []) !== JSON.stringify(orig.primaryColor || [])) {
              requestedChanges[`items[${i}].primaryColor`] = { from: orig.primaryColor || [], to: item.primaryColor || [] };
            }
            if (orig && JSON.stringify(item.size || []) !== JSON.stringify(orig.size || [])) {
              requestedChanges[`items[${i}].size`] = { from: orig.size || [], to: item.size || [] };
            }
            if (orig && JSON.stringify(item.season || []) !== JSON.stringify(orig.season || [])) {
              requestedChanges[`items[${i}].season`] = { from: orig.season || [], to: item.season || [] };
            }
            if (orig && item.material !== (orig.material || '')) {
              requestedChanges[`items[${i}].material`] = { from: orig.material || '', to: item.material };
            }
            if (orig && item.description !== (orig.description || '')) {
              requestedChanges[`items[${i}].description`] = { from: orig.description || '', to: item.description };
            }
            if (orig && item.productId !== (orig.productId || '')) {
              requestedChanges[`items[${i}].productId`] = { from: orig.productId || '', to: item.productId || '' };
            }
            if (orig && JSON.stringify(item.packets || []) !== JSON.stringify(orig.packets || [])) {
              requestedChanges[`items[${i}].packets`] = { from: orig.packets || [], to: item.packets || [] };
            }
          });
        }

        await submitEditRequestMutation.mutateAsync({
          entityType: "dispatch-order",
          entityId: dispatchOrderId,
          entityRef: dispatchOrder?.orderNumber,
          requestType: "edit",
          requestedChanges,
          rawPayload: payload,
          reason: editRequestReason.trim(),
        });

        toast.success("Edit request submitted for approval");
        setIsEditingConfirmed(false);
        setConfirmedEditForm({ exchangeRate: '', percentage: '', discount: '', items: [] });
        setConfirmedEditImpact(null);
        setEditRequestReason("");
        return;
      }

      const res = await dispatchOrdersAPI.editConfirmed(dispatchOrderId, payload);
      const result = res?.data?.data || res?.data || res;
      setConfirmedEditResult(result);
      await queryClient.invalidateQueries({ queryKey: ['dispatch-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['dispatch-order', dispatchOrderId] });
      await queryClient.invalidateQueries({ queryKey: ['purchases'] });
      const supplierId = dispatchOrder?.supplier?._id;
      if (supplierId) {
        await queryClient.invalidateQueries({ queryKey: ['unpaid-dispatch-orders', supplierId] });
        await queryClient.invalidateQueries({ queryKey: ['supplier-ledger', supplierId] });
      }
      setTimeout(() => {
        setIsEditingConfirmed(false);
        setConfirmedEditForm({ exchangeRate: '', percentage: '', discount: '', items: [] });
        setConfirmedEditImpact(null);
        setConfirmedEditResult(null);
      }, 3000);
    } catch (err) {
      setConfirmedEditError(err?.response?.data?.message || err?.message || 'Failed to save changes');
    } finally {
      setConfirmedEditSaving(false);
    }
  };

  // Validation function
  const validateOrderBeforeConfirm = useCallback(() => {
    const errors = [];

    if (!dispatchOrder) {
      return { isValid: false, errors };
    }

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
    if (percentage === "" || percentage === null || percentage === undefined || isNaN(parseFloat(percentage))) {
      errors.push("Percentage is required");
    }

    // Get active items (not removed)
    const activeItems =
      dispatchOrder?.items?.filter((_, idx) => !itemsToRemove.includes(idx)) ||
      [];
    const totalActiveItems = activeItems.length + newItems.length;

    if (totalActiveItems === 0) {
      errors.push("At least one item is required");
    }

    // Check all active items are verified
    const unverifiedItems = [];
    dispatchOrder?.items?.forEach((_, originalIdx) => {
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
    dispatchOrder?.items?.forEach((_, originalIdx) => {
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

    // Check all active items have valid min selling prices
    const invalidMinSellPriceItems = [];
    dispatchOrder?.items?.forEach((item, originalIdx) => {
      if (!itemsToRemove.includes(originalIdx)) {
        const itemData = editedItems[originalIdx] || item;
        const minSellPrice = parseFloat(itemData?.minSellingPrice);
        if (
          itemData?.minSellingPrice === "" ||
          itemData?.minSellingPrice === null ||
          itemData?.minSellingPrice === undefined ||
          isNaN(minSellPrice) ||
          minSellPrice <= 0
        ) {
          invalidMinSellPriceItems.push(originalIdx + 1);
        }
      }
    });

    if (invalidMinSellPriceItems.length > 0) {
      errors.push(
        `Items missing min selling price: #${invalidMinSellPriceItems.join(", #")}`
      );
    }

    const invalidNewMinSellPriceItems = [];
    newItems.forEach((item, idx) => {
      const minSellPrice = parseFloat(item?.minSellingPrice);
      if (
        item?.minSellingPrice === "" ||
        item?.minSellingPrice === null ||
        item?.minSellingPrice === undefined ||
        isNaN(minSellPrice) ||
        minSellPrice <= 0
      ) {
        invalidNewMinSellPriceItems.push(idx + 1);
      }
    });

    if (invalidNewMinSellPriceItems.length > 0) {
      errors.push(
        `New items missing min selling price: #${invalidNewMinSellPriceItems.join(", #")}`
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
    dispatchOrder?.items?.forEach((item, originalIdx) => {
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
    percentage,
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

  const confirmValidation = useMemo(() => validateOrderBeforeConfirm(), [validateOrderBeforeConfirm]);
  const canProceedWithConfirm = confirmValidation.isValid;

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
          minSellingPrice: parseFloat(itemData.minSellingPrice) || 0,
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
        exchangeRate: parseFloat(exchangeRate) || 0,
        percentage: parseFloat(percentage) || 0,
        discount: confirmOrderSupplierCurrency.discount,
      },
      logisticsCompany: editedLogisticsCompany,
      dispatchDate: editedDispatchDate,
      isTotalBoxesConfirmed: totalBoxesConfirmed,
    };

    submitApprovalMutation.mutate(approvalData, {
      onSuccess: (data) => {
        setCashPayment("0");
        setBankPayment("0");
        setExchangeRate("0");
        setPercentage("0");
        setActiveTab("confirm");
        
        if (data?.status === 'pending') {
          toast.success(data?.message || "Backdated order submitted for approval");
          router.push("/approvals/edit-requests");
          return;
        }
        
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
          minSellingPrice: parseFloat(itemData.minSellingPrice) || 0,
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
        exchangeRate: parseFloat(exchangeRate) || 0,
        percentage: parseFloat(percentage) || 0,
        discount: confirmOrderSupplierCurrency.discount,
      },
      logisticsCompany: editedLogisticsCompany,
      dispatchDate: editedDispatchDate,
      isTotalBoxesConfirmed: totalBoxesConfirmed,
    };



    confirmMutation.mutate(confirmData, {
      onSuccess: (data) => {
        setCashPayment("0");
        setBankPayment("0");
        setExchangeRate("0");
        setPercentage("0");
        setActiveTab("confirm");

        if (data?.status === 'pending') {
          toast.success(data?.message || "Backdated confirmation submitted for approval");
          router.push("/approvals/edit-requests");
          return;
        }

        router.push("/dispatch-orders");
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
    router,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Enter to confirm (only in confirm tab and form is valid)
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
          // Super-admin/admin: confirm directly
          if (isSuperAdmin || isAdmin) {
            handleConfirm();
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
    isSuperAdmin,
    isAdmin,
  ]);


  const handlePacketReturn = async () => {
    if (!selectedPacketForReturn) {
      toast.error("Please select an item to return");
      return;
    }

    const payload = {
      id: dispatchOrderId,
      returnedItems: [
        {
          productId: selectedPacketForReturn.product?._id || selectedPacketForReturn.product,
          packetStockId: selectedPacketForReturn._id,
          returnType: returnType,
          quantity: returnType === 'packet' ? 1 : (returnType === 'loose' ? returnQuantity : 1),
          breakItems: returnType === 'break' ? breakReturnItems.map(i => ({
            size: i.size,
            color: i.color,
            quantity: i.returnQuantity
          })) : undefined,
          reason: returnNotes,
        }
      ],
      notes: returnNotes,
    };

    try {
      await returnMutation.mutateAsync(payload);
      toast.success("Return processed successfully");
      setSelectedPacketForReturn(null);
      setReturnQuantity(1);
      setBreakReturnItems([]);
      setReturnNotes("");
      setShowReturnDialog(false);
    } catch (error) {
      console.error("Return error:", error);
    }
  };

  // Packet configuration save handler
  const handlePacketsSave = (packets, context) => {
    const targetIndex = context?.index ?? selectedItemForPackets?.index;
    if (targetIndex === undefined || targetIndex === null) return;

    if (isEditingConfirmed) {
      setConfirmedEditForm((prev) => {
        const items = [...prev.items];
        items[targetIndex] = {
          ...items[targetIndex],
          packets,
          useVariantTracking: true,
        };
        return { ...prev, items };
      });
      toast.success("Packet configuration saved");
      return;
    }

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
    if (!dispatchOrderId || !dispatchOrder) return;

    if (!canDeleteDispatchOrder) {
      toast.error("You do not have permission to delete this order");
      return;
    }

    deleteMutation.mutate(dispatchOrderId, {
      onSuccess: () => {
        setShowDeleteDialog(false);
        router.push("/dispatch-orders");
      },
    });
  }, [canDeleteDispatchOrder, dispatchOrder, dispatchOrderId, deleteMutation, router]);

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
            {isEligibleForEdit && !isEditingConfirmed && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnterEditMode}
                disabled={confirmedEditLoading}
                className="gap-2 text-violet-600 border-violet-200 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                title={isSuperAdmin ? "Edit confirmed order financial fields (super-admin)" : "Request edit of confirmed order financial fields"}
              >
                {confirmedEditLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FilePen className="h-4 w-4" />
                )}
                Edit
              </Button>
            )}
            {isEditingConfirmed && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                className="gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
                Cancel Edit
              </Button>
            )}

            {isEligibleForEdit && !isEditingConfirmed && !isSuperAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteRequestDialog(true)}
                className="gap-2 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Request deletion of this confirmed order"
              >
                <Trash2 className="h-4 w-4" />
                Request Delete
              </Button>
            )}

            {isSuperAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 transition-colors"
                title="Request deletion of this confirmed order"
              >
                <Trash2 className="h-4 w-4" />
                Delete
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

      {/* Order Info */}
      <Card className="border border-border bg-card">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">

            {/* ── PRIMARY: Supplier ── */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5 border-b sm:border-b-0 sm:border-r border-border pb-4 sm:pb-0 sm:pr-6">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Supplier</p>
              <p className="text-xl font-bold text-foreground truncate">
                {dispatchOrder.supplier?.name || dispatchOrder.supplier?.company || "—"}
              </p>
              {(dispatchOrder.supplier?.phone || dispatchOrder.supplier?.email) && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {dispatchOrder.supplier?.phone
                    ? (dispatchOrder.supplier?.phoneAreaCode ? `${dispatchOrder.supplier.phoneAreaCode}-` : "") + dispatchOrder.supplier.phone
                    : null}
                  {dispatchOrder.supplier?.phone && dispatchOrder.supplier?.email ? " · " : null}
                  {dispatchOrder.supplier?.email}
                </p>
              )}
            </div>

            {/* ── FINANCIAL HIGHLIGHTS ── */}
            {isConfirmed ? (
              <div className="flex flex-wrap gap-3 items-center sm:border-r border-border sm:pr-6">
                {/* Edit icon for financial card — super-admin only */}
                {isEligibleForEdit && !isEditingConfirmed && (
                  <button
                    onClick={handleEnterEditMode}
                    disabled={confirmedEditLoading}
                    className="p-1.5 rounded-md text-violet-500 hover:text-violet-700 hover:bg-violet-50 transition-colors"
                    title="Edit financial fields"
                  >
                    {confirmedEditLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FilePen className="h-3.5 w-3.5" />}
                  </button>
                )}
                {isEditingConfirmed && (
                  <div className="flex items-center gap-1 text-violet-600 text-xs font-semibold bg-violet-50 border border-violet-200 px-2 py-1 rounded-md">
                    <FilePen className="h-3 w-3" />
                    Editing
                  </div>
                )}
                {/* Exchange Rate */}
                <div className="bg-primary/8 border border-primary/20 rounded-lg px-3 py-2 min-w-[90px]">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-none mb-1">Rate</p>
                  {isEditingConfirmed ? (
                    <Input
                      type="number"
                      step="0.0001"
                      min="0.0001"
                      value={confirmedEditForm.exchangeRate}
                      onChange={(e) => setConfirmedEditForm(prev => ({ ...prev, exchangeRate: e.target.value }))}
                      className="h-7 w-20 text-sm font-bold border-violet-400 focus:border-violet-500 p-1"
                    />
                  ) : (
                    <p className="text-lg font-bold text-foreground tabular-nums leading-none">
                      {dispatchOrder.exchangeRate
                        ? dispatchOrder.exchangeRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                        : "—"}
                    </p>
                  )}
                </div>
                {/* Percentage */}
                <div className="bg-primary/8 border border-primary/20 rounded-lg px-3 py-2 min-w-[70px]">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-none mb-1">Markup</p>
                  {isEditingConfirmed ? (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={confirmedEditForm.percentage}
                      onChange={(e) => setConfirmedEditForm(prev => ({ ...prev, percentage: e.target.value }))}
                      className="h-7 w-20 text-sm font-bold border-violet-400 focus:border-violet-500 p-1"
                    />
                  ) : (
                    <p className="text-lg font-bold text-foreground leading-none">
                      {dispatchOrder.percentage != null ? `${dispatchOrder.percentage}%` : "—"}
                    </p>
                  )}
                </div>
                {/* Payments (if available) */}
                {dispatchOrder.computedPaymentDetails && (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-12">Cash</span>
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {(dispatchOrder.computedPaymentDetails.cashPayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-12">Bank</span>
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {(dispatchOrder.computedPaymentDetails.bankPayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Pending: show discount + boxes as modest highlights */
              <div className="flex flex-wrap gap-3 items-center sm:border-r border-border sm:pr-6">
                {/* Discount */}
                <div className="flex flex-col gap-0.5">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Discount</p>
                  {isPending && editingField === "discount" ? (
                    <div className="flex gap-1 items-center">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={editedDiscount}
                        onChange={(e) => {
                          const sanitized = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                          setEditedDiscount(sanitized);
                        }}
                        onBlur={() => setEditingField(null)}
                        className="h-8 w-24 text-sm border-blue-500 border-2"
                        placeholder=""
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={() => setEditingField(null)} className="h-8 px-1.5">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </Button>
                    </div>
                  ) : (
                    <p
                      className={cn("text-base font-semibold text-foreground tabular-nums", isPending && "cursor-pointer hover:text-primary transition-colors")}
                      onDoubleClick={() => isPending && setEditingField("discount")}
                      title={isPending ? "Double-click to edit" : ""}
                    >
                      {isPending
                        ? (dispatchOrder?.returnedItems?.length > 0
                          ? confirmOrderSupplierCurrency.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : editedDiscount)
                        : (dispatchOrder.totalDiscount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                {/* Total Boxes */}
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Boxes</p>
                    {isPending && (
                      <div className="flex items-center gap-1">
                        <Checkbox
                          id="total-boxes-confirmed"
                          checked={totalBoxesConfirmed}
                          onCheckedChange={(checked) => setTotalBoxesConfirmed(checked === true)}
                          className="h-3.5 w-3.5"
                        />
                        <Label htmlFor="total-boxes-confirmed" className="text-[10px] text-muted-foreground cursor-pointer">Confirm</Label>
                      </div>
                    )}
                  </div>
                  {isPending && editingField === "totalBoxes" ? (
                    <div className="flex gap-1 items-center">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={editedTotalBoxes}
                        onChange={(e) => {
                          const sanitized = e.target.value.replace(/[^0-9]/g, '');
                          setEditedTotalBoxes(sanitized);
                          if (sanitized !== editedTotalBoxes) setTotalBoxesConfirmed(false);
                        }}
                        onBlur={() => setEditingField(null)}
                        className="h-8 w-20 text-sm border-blue-500 border-2"
                        placeholder=""
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={() => setEditingField(null)} className="h-8 px-1.5">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </Button>
                    </div>
                  ) : (
                    <p
                      className={cn("text-base font-semibold text-foreground tabular-nums", isPending && "cursor-pointer hover:text-primary transition-colors")}
                      onDoubleClick={() => isPending && setEditingField("totalBoxes")}
                      title={isPending ? "Double-click to edit" : ""}
                    >
                      {isPending ? editedTotalBoxes : (dispatchOrder.totalBoxes || 0)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ── SECONDARY META (compact, muted) ── */}
            <div className="flex flex-col gap-2 justify-center shrink-0">
              {/* Logistics Company */}
              <div className="flex items-start gap-2">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider w-16 pt-0.5 shrink-0">Logistics</span>
                {isPending && editingField === "logisticsCompany" ? (
                  <div className="flex gap-1 items-center">
                    <Select
                      value={editedLogisticsCompany || ""}
                      onValueChange={setEditedLogisticsCompany}
                      onOpenChange={(open) => { if (!open) setEditingField(null); }}
                    >
                      <SelectTrigger className="h-7 text-xs border-blue-500 border-2 w-44">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        {logisticsCompanies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" onClick={() => setEditingField(null)} className="h-7 px-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    </Button>
                  </div>
                ) : (
                  <span
                    className={cn("text-xs font-medium text-foreground max-w-[180px] truncate", isPending && "cursor-pointer hover:text-primary transition-colors")}
                    onDoubleClick={() => isPending && setEditingField("logisticsCompany")}
                    title={isPending ? "Double-click to edit" : (logisticsCompanies.find((c) => c.id === editedLogisticsCompany)?.name || dispatchOrder.logisticsCompany?.name || "—")}
                  >
                    {logisticsCompanies.find((c) => c.id === editedLogisticsCompany)?.name || dispatchOrder.logisticsCompany?.name || "—"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider w-16 shrink-0">Date</span>
                {isEditingConfirmed ? (
                  <div className="flex gap-1 items-center">
                    <BritishDatePicker
                      value={confirmedEditForm.dispatchDate}
                      onChange={(date) => {
                        if (date) {
                          const y = date.getFullYear();
                          const m = String(date.getMonth() + 1).padStart(2, '0');
                          const d = String(date.getDate()).padStart(2, '0');
                          setConfirmedEditForm(prev => ({ ...prev, dispatchDate: `${y}-${m}-${d}` }));
                        }
                      }}
                      restrictByRole={true}
                      className="h-7 text-xs border-violet-400 border-2 w-42"
                    />
                  </div>
                ) : isPending && editingField === "dispatchDate" ? (
                  <div className="flex gap-1 items-center">
                    <BritishDatePicker
                      value={editedDispatchDate}
                      onChange={(date) => {
                        if (date) {
                          const y = date.getFullYear();
                          const m = String(date.getMonth() + 1).padStart(2, '0');
                          const d = String(date.getDate()).padStart(2, '0');
                          setEditedDispatchDate(`${y}-${m}-${d}`);
                        }
                      }}
                      restrictByRole={true}
                      className="h-7 text-xs border-blue-500 border-2 w-42"
                    />
                    <Button size="sm" variant="ghost" onClick={() => setEditingField(null)} className="h-7 px-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    </Button>
                  </div>
                ) : (
                  <span
                    className={cn("text-xs font-medium text-foreground tabular-nums", isPending && "cursor-pointer hover:text-primary transition-colors")}
                    onDoubleClick={() => isPending && setEditingField("dispatchDate")}
                    title={isPending ? "Double-click to edit" : ""}
                  >
                    {(() => {
                      if (editedDispatchDate) {
                        const [year, month, day] = editedDispatchDate.split("-");
                        return `${day}/${month}/${year}`;
                      }
                      if (dispatchOrder.dispatchDate) {
                        const date = new Date(dispatchOrder.dispatchDate);
                        const day = String(date.getUTCDate()).padStart(2, '0');
                        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                        const year = date.getUTCFullYear();
                        return `${day}/${month}/${year}`;
                      }
                      return "—";
                    })()}
                  </span>
                )}
              </div>
              {/* For confirmed: also show discount + boxes compactly */}
              {isConfirmed && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider w-16 shrink-0">Discount</span>
                    {isEditingConfirmed ? (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={confirmedEditForm.discount}
                        onChange={(e) => setConfirmedEditForm(prev => ({ ...prev, discount: e.target.value }))}
                        className="h-6 w-24 text-xs border-violet-400 focus:border-violet-500 p-1"
                      />
                    ) : (
                      <span className="text-xs font-medium text-foreground tabular-nums">
                        {(dispatchOrder.totalDiscount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider w-16 shrink-0">Boxes</span>
                    <span className="text-xs font-medium text-foreground tabular-nums">{dispatchOrder.totalBoxes || 0}</span>
                  </div>
                </>
              )}
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Confirmed Order Edit: Warning Banner + Save/Cancel Bar */}
      {(isEditingConfirmed || confirmedEditError || confirmedEditLoading) && (
        <>
          {isEditingConfirmed && confirmedEditImpact?.hasSoldItems && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold">Some items have been sold</p>
                <p className="text-xs mt-0.5 text-amber-700/80">Changing cost price will retroactively update inventory batch prices for sold stock. A ledger adjustment entry will be created if the supplier payment total changes.</p>
              </div>
            </div>
          )}
          {confirmedEditError && (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{confirmedEditError}</p>
            </div>
          )}
          {isEditingConfirmed && confirmedEditResult && (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">{confirmedEditResult.message || 'Changes saved successfully'}</p>
                {confirmedEditResult.adjustmentEntry && (
                  <p className="text-xs mt-0.5">Ledger adjustment entry: <span className="font-mono font-semibold">{confirmedEditResult.adjustmentEntry.entryNumber}</span></p>
                )}
              </div>
            </div>
          )}
          {isEditingConfirmed && <div className="flex flex-col gap-3 rounded-lg border border-violet-200 bg-violet-50/60 px-5 py-3">
            <p className="text-sm text-violet-700 font-medium flex items-center gap-2">
              <FilePen className="h-4 w-4" />
              {isSuperAdmin
                ? "Editing confirmed order — changes will update inventory costs and create a ledger adjustment if the total changes"
                : "Editing confirmed order — your changes will be submitted as a request for Super Admin approval"
              }
            </p>
            {!isSuperAdmin && (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Reason for edit (required)"
                  value={editRequestReason}
                  onChange={(e) => setEditRequestReason(e.target.value)}
                  className="flex-1 h-8 text-sm border-violet-300 focus:border-violet-500"
                />
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={confirmedEditSaving}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveConfirmedEdit}
                disabled={confirmedEditSaving || !!confirmedEditResult || (!isSuperAdmin && !editRequestReason.trim())}
                className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
              >
                {confirmedEditSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {isSuperAdmin ? "Saving..." : "Submitting..."}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {isSuperAdmin ? "Save Changes" : "Submit Edit Request"}
                  </>
                )}
              </Button>
            </div>
          </div>}
        </>
      )}

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
                    Min Sell Price
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
                  // When editing a confirmed order, use confirmedEditForm values for live feedback
                  const isConfirmedItemEdit = isEditingConfirmed && item.originalIndex !== null;
                  const editedCostPrice = isConfirmedItemEdit
                    ? (parseFloat(confirmedEditForm.items[item.originalIndex]?.costPrice) || parseFloat(item.costPrice) || 0)
                    : (editedItems[item.index]?.costPrice !== undefined
                      ? parseFloat(editedItems[item.index].costPrice) || 0
                      : parseFloat(item.costPrice) || 0);
                  const editedQuantity = isConfirmedItemEdit
                    ? (parseInt(confirmedEditForm.items[item.originalIndex]?.quantity) || item.confirmedQty || 0)
                    : (item.confirmedQty ?? 0);
                  // Use confirmedEditForm exchange rate / percentage for live recalculation
                  const rowExchangeRate = isEditingConfirmed
                    ? (parseFloat(confirmedEditForm.exchangeRate) || currentExchangeRate)
                    : currentExchangeRate;
                  const rowPercentage = isEditingConfirmed
                    ? (parseFloat(confirmedEditForm.percentage) ?? currentPercentage)
                    : currentPercentage;
                  const supplierPaymentItemTotal = editedCostPrice * editedQuantity;
                  const supplierPaymentAmount = editedCostPrice / rowExchangeRate;
                  const landedPrice = truncateToTwoDecimals(
                    (editedCostPrice / rowExchangeRate) * (1 + rowPercentage / 100)
                  );
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
                          /* Editable image cell for pending orders — single thumbnail */
                          <div className="flex flex-col gap-1.5 items-center min-w-[56px]">
                            {/* Single thumbnail with count badge */}
                            {(itemData.images || []).length > 0 ? (
                              <div
                                className="relative group w-14 h-14 flex-shrink-0 cursor-pointer"
                                onClick={() =>
                                  setPendingGallery({
                                    open: true,
                                    images: itemData.images || [],
                                    itemIndex: item.index,
                                  })
                                }
                              >
                                <img
                                  src={(itemData.images || [])[0]}
                                  alt="Product"
                                  className="w-14 h-14 object-cover rounded border border-border hover:opacity-90 transition-opacity"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                                {/* Count badge if multiple images */}
                                {(itemData.images || []).length > 1 && (
                                  <div className="absolute -top-1.5 -right-1.5 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded z-10 pointer-events-none">
                                    {(itemData.images || []).length}
                                  </div>
                                )}
                                {/* Remove button — only shown on hover when single image */}
                                {(itemData.images || []).length === 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditedItems({
                                        ...editedItems,
                                        [item.index]: { ...itemData, images: [] },
                                      });
                                    }}
                                    className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    title="Remove image"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="w-14 h-14 flex items-center justify-center rounded border-2 border-dashed border-border bg-muted/30 flex-shrink-0">
                                <span className="text-[9px] text-muted-foreground text-center leading-tight">No{"\n"}image</span>
                              </div>
                            )}
                            {/* Add image button — pencil icon */}
                            <label
                              className="w-14 h-7 flex items-center justify-center gap-1 rounded border border-border hover:border-primary hover:bg-primary/5 cursor-pointer transition-colors"
                              title="Add image"
                            >
                              {imageUploading[item.index] ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                              ) : (
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
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
                            maxVisible={1}
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
                        ) : isEditingConfirmed && item.originalIndex !== null ? (
                          <Input
                            value={confirmedEditForm.items[item.originalIndex]?.productName ?? ''}
                            onChange={(e) => setConfirmedEditForm(prev => {
                              const items = [...prev.items];
                              items[item.originalIndex] = { ...items[item.originalIndex], productName: e.target.value };
                              return { ...prev, items };
                            })}
                            disabled={(confirmedEditForm.items[item.originalIndex]?.soldQty ?? 0) > 0}
                            className="h-8 text-sm min-w-[150px] border-violet-400 focus:border-violet-500"
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
                        ) : isEditingConfirmed && item.originalIndex !== null ? (
                          <Input
                            value={confirmedEditForm.items[item.originalIndex]?.productCode ?? ''}
                            onChange={(e) => setConfirmedEditForm(prev => {
                              const items = [...prev.items];
                              items[item.originalIndex] = { ...items[item.originalIndex], productCode: e.target.value.toUpperCase() };
                              return { ...prev, items };
                            })}
                            disabled={(confirmedEditForm.items[item.originalIndex]?.soldQty ?? 0) > 0}
                            className="h-8 text-sm w-24 border-violet-400 focus:border-violet-500"
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
                        ) : isEditingConfirmed && item.originalIndex !== null ? (
                          <div className="min-w-[100px]">
                            <ArrayInput
                              value={Array.isArray(confirmedEditForm.items[item.originalIndex]?.primaryColor)
                                ? confirmedEditForm.items[item.originalIndex].primaryColor
                                : []}
                              onChange={(colors) => setConfirmedEditForm(prev => {
                                const items = [...prev.items];
                                items[item.originalIndex] = { ...items[item.originalIndex], primaryColor: colors };
                                return { ...prev, items };
                              })}
                              placeholder="Enter color..."
                              disabled={(confirmedEditForm.items[item.originalIndex]?.soldQty ?? 0) > 0}
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
                        ) : isEditingConfirmed && item.originalIndex !== null ? (
                          <div className="min-w-[100px]">
                            <ArrayInput
                              value={Array.isArray(confirmedEditForm.items[item.originalIndex]?.size)
                                ? confirmedEditForm.items[item.originalIndex].size
                                : []}
                              onChange={(sizes) => setConfirmedEditForm(prev => {
                                const items = [...prev.items];
                                items[item.originalIndex] = { ...items[item.originalIndex], size: sizes };
                                return { ...prev, items };
                              })}
                              placeholder="Enter size..."
                              disabled={(confirmedEditForm.items[item.originalIndex]?.soldQty ?? 0) > 0}
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
                        ) : isEditingConfirmed && item.originalIndex !== null ? (
                          <div className="min-w-[120px]">
                            <MultiSelect
                              options={SEASON_OPTIONS}
                              value={Array.isArray(confirmedEditForm.items[item.originalIndex]?.season)
                                ? confirmedEditForm.items[item.originalIndex].season
                                : []}
                              onChange={(seasons) => setConfirmedEditForm(prev => {
                                const items = [...prev.items];
                                items[item.originalIndex] = { ...items[item.originalIndex], season: seasons };
                                return { ...prev, items };
                              })}
                              placeholder="Select seasons"
                              disabled={(confirmedEditForm.items[item.originalIndex]?.soldQty ?? 0) > 0}
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
                          ) : isEditingConfirmed && item.originalIndex !== null ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const modalItemId = String(item.originalIndex ?? item.index ?? "0");
                                setSelectedItemForPackets({
                                  ...item,
                                  ...(confirmedEditForm.items[item.originalIndex] || {}),
                                  index: item.originalIndex,
                                  modalItemId,
                                });
                                setPacketDialogOpen(true);
                              }}
                              disabled={(confirmedEditForm.items[item.originalIndex]?.soldQty ?? 0) > 0}
                              className="h-6 w-6 p-0 hover:bg-slate-100 text-slate-500 hover:text-blue-600"
                              title="Edit Configuration"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
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
                          {/* {(() => {
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
                          })()} */}

                          {(() => {
                            const packets = item.packets || [];
                            if (packets.length === 0) return null;

                            // Build a color signature per packet
                            const colorGroupCount = {};
                            packets.forEach((packet) => {
                              if (!packet.composition?.length) return;

                              const uniqueColors = [...new Set(
                                packet.composition
                                  .filter(c => c.color && c.quantity > 0)
                                  .map(c => c.color)
                              )];

                              const signature = uniqueColors.join("/"); // "beige" or "grey/green/blue"
                              if (signature) {
                                colorGroupCount[signature] = (colorGroupCount[signature] || 0) + 1;
                              }
                            });

                            const parts = Object.entries(colorGroupCount);
                            if (parts.length === 0) return null;

                            return (
                              <div className="flex flex-wrap gap-1">
                                {parts.map(([colorSignature, count]) => (
                                  <span
                                    key={colorSignature}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                                  >
                                    <span className="capitalize">{colorSignature}</span>
                                    <span className="ml-1 text-slate-400">×</span>
                                    <span className="ml-0.5 font-semibold">{count}</span>
                                  </span>
                                ))}
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
                            {isEditingConfirmed && item.originalIndex !== null ? (
                              <div className="flex flex-col items-end gap-1">
                                <Input
                                  type="number"
                                  step="1"
                                  min={confirmedEditForm.items[item.originalIndex]?.soldQty ?? 0}
                                  value={confirmedEditForm.items[item.originalIndex]?.quantity ?? ''}
                                  onChange={(e) => setConfirmedEditForm(prev => {
                                    const items = [...prev.items];
                                    items[item.originalIndex] = { ...items[item.originalIndex], quantity: e.target.value };
                                    return { ...prev, items };
                                  })}
                                  className={cn(
                                    "h-8 text-sm w-20 text-right border-violet-400 focus:border-violet-500",
                                    (confirmedEditForm.items[item.originalIndex]?.soldQty ?? 0) > 0 &&
                                    parseInt(confirmedEditForm.items[item.originalIndex]?.quantity) <= (confirmedEditForm.items[item.originalIndex]?.soldQty ?? 0) &&
                                    "border-amber-400"
                                  )}
                                />
                                {(confirmedEditForm.items[item.originalIndex]?.soldQty ?? 0) > 0 && (
                                  <span className="text-[10px] text-amber-600 font-medium">
                                    min: {confirmedEditForm.items[item.originalIndex].soldQty} (sold)
                                  </span>
                                )}
                              </div>
                            ) : (
                              item.quantity
                            )}
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
                        ) : isEditingConfirmed && item.originalIndex !== null ? (
                          <div className="flex flex-col items-end gap-1">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={confirmedEditForm.items[item.originalIndex]?.costPrice ?? ''}
                              onChange={(e) => setConfirmedEditForm(prev => {
                                const items = [...prev.items];
                                items[item.originalIndex] = { ...items[item.originalIndex], costPrice: e.target.value };
                                return { ...prev, items };
                              })}
                              className="h-8 text-sm w-24 text-right border-violet-400 focus:border-violet-500"
                            />
                            {(confirmedEditForm.items[item.originalIndex]?.soldQty ?? 0) > 0 && (
                              <span className="text-[10px] text-amber-600 font-medium">
                                {confirmedEditForm.items[item.originalIndex].soldQty} sold
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            {item.costPrice?.toFixed(2) || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        {isPending && !isRemoved ? (
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={itemData.minSellingPrice ?? ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                              setEditedItems({
                                ...editedItems,
                                [item.index]: {
                                  ...itemData,
                                  minSellingPrice: sanitized,
                                },
                              });
                            }}
                            className="h-8 text-sm w-24 text-right"
                          />
                        ) : isEditingConfirmed && item.originalIndex !== null ? (
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={confirmedEditForm.items[item.originalIndex]?.minSellingPrice ?? ''}
                            onChange={(e) => setConfirmedEditForm(prev => {
                              const items = [...prev.items];
                              items[item.originalIndex] = { ...items[item.originalIndex], minSellingPrice: e.target.value };
                              return { ...prev, items };
                            })}
                            className="h-8 text-sm w-24 text-right border-violet-400 focus:border-violet-500"
                          />
                        ) : (
                          <span className="text-foreground font-medium">
                            {Number(item.minSellingPrice ?? item.product?.pricing?.minSellingPrice ?? 0).toFixed(2)}
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
                      placeholder=""
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
                      placeholder=""
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
                      placeholder=""
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
                      placeholder=""
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
                {canDeleteDispatchOrder && (
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
                )}
                {/* Super-admin/admin: Confirm Order button (for both pending and pending-approval) */}
                {(isSuperAdmin || isAdmin) && (dispatchOrder?.status === 'pending' || dispatchOrder?.status === 'pending-approval') && (
                  <Button
                    onClick={() => {

                      handleConfirm();
                    }}
                    disabled={
                      confirmMutation.isPending ||
                      deleteMutation.isPending ||
                      !canProceedWithConfirm
                    }
                    size="lg"
                    className="min-w-[160px] gap-2"
                    title={!canProceedWithConfirm ? (confirmValidation.errors[0] || "Please complete all required confirmation fields") : ""}
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
                                          <span className="font-mono bg-muted px-1 rounded mr-1">{item.productCode}</span>
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

          {/* Return Form - Packet Aware */}
          <Card className="border border-border bg-card">
            <CardHeader className="pb-3 border-b border-border mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
                    <Package className="h-5 w-5 text-rose-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold">Stock to Return</CardTitle>
                    <p className="text-sm text-muted-foreground">Select packets or loose items to return to supplier</p>
                  </div>
                </div>
                {packetsLoading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              </div>
            </CardHeader>
            <CardContent>
              {!packetsLoading && packetStocks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-4">
                    <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No stock available for return</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Composition</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Stock Qty</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {packetStocks.map((stock) => (
                        <tr key={stock._id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={cn(
                              stock.isLoose ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"
                            )}>
                              {stock.isLoose ? "Loose" : "Packet"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{stock.product?.productName}</div>
                            <div className="text-xs text-muted-foreground font-mono">{stock.product?.productCode}</div>
                          </td>
                          <td className="px-4 py-3">
                            {!stock.isLoose ? (
                              <div className="flex flex-wrap gap-1">
                                {stock.composition?.map((item, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {item.size} / {item.color}: {item.quantity}
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground">
                                {stock.composition?.[0]?.size} / {stock.composition?.[0]?.color}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">
                            {stock.totalQuantity}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              {!stock.isLoose && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 border-rose-200 text-rose-600 hover:bg-rose-50"
                                  onClick={() => {
                                    setSelectedPacketForReturn(stock);
                                    setReturnType('packet');
                                    setReturnQuantity(1);
                                    setShowReturnDialog(true);
                                  }}
                                >
                                  Return Full
                                </Button>
                              )}
                              {!stock.isLoose && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8"
                                  onClick={() => {
                                    setSelectedPacketForReturn(stock);
                                    setReturnType('break');
                                    setBreakReturnItems(stock.composition.map(item => ({ ...item, returnQuantity: 0 })));
                                    setShowReturnDialog(true);
                                  }}
                                >
                                  Break & Return
                                </Button>
                              )}
                              {stock.isLoose && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 border-rose-200 text-rose-600 hover:bg-rose-50"
                                  onClick={() => {
                                    setSelectedPacketForReturn(stock);
                                    setReturnType('loose');
                                    setReturnQuantity(1);
                                    setShowReturnDialog(true);
                                  }}
                                >
                                  Return Loose
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Return Selection/Action Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Package size={20} />
              Return to Supplier
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {returnType === 'packet' && "Returning full packet. This will be removed from stock."}
              {returnType === 'loose' && "Specify loose quantity to return."}
              {returnType === 'break' && "Select items to return. Rest will stay in loose stock."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Header: Item Summary */}
            <div className="flex justify-between items-center bg-muted/20 p-3 rounded border">
              <div>
                <div className="font-bold">{selectedPacketForReturn?.product?.productName}</div>
                <div className="text-[10px] ">
                  {selectedPacketForReturn?.product?.productCode} | {selectedPacketForReturn?.barcode}
                </div>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase">
                {selectedPacketForReturn?.isLoose ? "Loose" : "Packet"}
              </Badge>
            </div>

            {/* Compact Financials */}
            <div className="grid grid-cols-2 gap-3">
              <div className="border rounded p-3 bg-rose-50/30">
                <div className="text-[10px] font-bold text-rose-600 uppercase">Return Value</div>
                <div className="text-xl font-bold">
                  {(() => {
                    const unitPrice = selectedPacketForReturn?.costPricePerPacket / (selectedPacketForReturn?.totalItemsPerPacket || 1);
                    let totalToReturn = 0;
                    if (returnType === 'packet') totalToReturn = selectedPacketForReturn?.totalItemsPerPacket || 0;
                    else if (returnType === 'loose') totalToReturn = returnQuantity;
                    else if (returnType === 'break') totalToReturn = breakReturnItems.reduce((sum, item) => sum + item.returnQuantity, 0);
                    return (totalToReturn * unitPrice).toFixed(2);
                  })()}
                </div>
              </div>
              <div className="border rounded p-3 bg-muted/10">
                <div className="text-[10px] font-bold text-muted-foreground uppercase">Quantity</div>
                <div className="text-xl font-bold uppercase">
                  {(() => {
                    if (returnType === 'packet') return selectedPacketForReturn?.totalItemsPerPacket || 0;
                    if (returnType === 'loose') return returnQuantity;
                    if (returnType === 'break') return breakReturnItems.reduce((sum, item) => sum + item.returnQuantity, 0);
                    return 0;
                  })()}
                  <span className="text-[10px] ml-1">Units</span>
                </div>
              </div>
            </div>

            {/* Selection Area */}
            {returnType === 'packet' && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Packet Content</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPacketForReturn?.composition?.map((item, idx) => (
                    <div key={idx} className="bg-muted/30 px-2 py-1 rounded text-[10px] border">
                      <span className="font-bold">{item.quantity}</span> {item.size}/{item.color}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {returnType === 'loose' && (
              <div className="flex items-center gap-3 p-3 border rounded bg-amber-50/10">
                <Label className="text-xs shrink-0">Return Quantity:</Label>
                <Input
                  type="number"
                  min={1}
                  max={selectedPacketForReturn?.totalQuantity}
                  value={returnQuantity}
                  onChange={(e) => setReturnQuantity(Math.min(parseInt(e.target.value) || 1, selectedPacketForReturn?.totalQuantity || 1))}
                  className="h-9 w-24 text-sm font-bold"
                />
                <span className="text-[10px] text-muted-foreground">Max: {selectedPacketForReturn?.totalQuantity}</span>
              </div>
            )}

            {returnType === 'break' && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Select Items to Return</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {breakReturnItems.map((item, idx) => (
                    <div key={idx} className={cn(
                      "flex items-center justify-between p-2 border rounded text-xs",
                      item.returnQuantity > 0 ? "bg-rose-50/50 border-rose-200" : "bg-card"
                    )}>
                      <div>
                        <span className="font-bold">{item.size}</span> / {item.color}
                        <div className="text-[9px] opacity-60">Stock: {item.quantity}</div>
                      </div>
                      <Input
                        type="number"
                        className="w-14 h-7 text-center text-xs px-1"
                        min={0}
                        max={item.quantity}
                        value={item.returnQuantity}
                        onChange={(e) => {
                          const newItems = [...breakReturnItems];
                          newItems[idx].returnQuantity = Math.min(parseInt(e.target.value) || 0, item.quantity);
                          setBreakReturnItems(newItems);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Note */}
            <div className="space-y-2 pt-2">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase">Reason & Notes</Label>
              <div className="grid gap-2">
                <Select onValueChange={(val) => setReturnNotes(prev => prev ? `${val}. ${prev}` : val)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {["Defective", "Wrong Item", "Over-shipped", "Damaged", "Quality Issue"].map((reason) => (
                      <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Additional notes..."
                  className="min-h-[60px] text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="ghost" size="sm" onClick={() => setShowReturnDialog(false)} disabled={returnMutation.isPending}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handlePacketReturn}
              disabled={returnMutation.isPending || (returnType === 'break' && breakReturnItems.every(i => i.returnQuantity <= 0))}
            >
              {returnMutation.isPending ? "Processing..." : "Confirm Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Pending-item image gallery lightbox */}
      <ImageLightbox
        images={pendingGallery.images}
        initialIndex={0}
        open={pendingGallery.open}
        onClose={() => setPendingGallery((prev) => ({ ...prev, open: false }))}
      />

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

      {/* Delete Request Dialog (non-super-admin, confirmed orders) */}
      <DeleteRequestDialog
        open={showDeleteRequestDialog}
        onClose={() => setShowDeleteRequestDialog(false)}
        entityType="dispatch-order"
        entityId={dispatchOrderId}
        entityRef={dispatchOrder?.orderNumber}
        entitySummary={{
          "Order Number": dispatchOrder?.orderNumber,
          Supplier: dispatchOrder?.supplier?.name || dispatchOrder?.supplier?.company,
          Status: dispatchOrder?.status,
          "Grand Total": `€${(dispatchOrder?.grandTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          Items: `${dispatchOrder?.items?.length || 0} items`,
        }}
        onSuccess={() => setShowDeleteRequestDialog(false)}
      />
    </div >
  );
}
