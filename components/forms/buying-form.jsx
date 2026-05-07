"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusIcon,
  TrashIcon,
  UserPlusIcon,
  X,
  Image as ImageIcon,
  Plus,
  Percent,
  Wallet,
  Building2,
  TrendingUp,
  Calculator,
  CheckCircle2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { suppliersAPI } from "@/lib/api/endpoints/suppliers";
import { purchasesAPI } from "@/lib/api/endpoints/purchases";
import { productsAPI } from "@/lib/api/endpoints/products";
import { usersAPI } from "@/lib/api/endpoints/users";
import { logisticsCompaniesAPI } from "@/lib/api/endpoints/logisticsCompanies";
import { MultiSelect } from "@/components/ui/multi-select";
import { SEASON_OPTIONS, normalizeSeasonArray } from "@/lib/constants/seasons";
import ImageGallery from "@/components/ui/ImageGallery";
import PacketConfigurationModal from "@/components/modals/PacketConfigurationModal";
import BritishDatePicker from "@/components/BritishDatePicker";
import "react-datepicker/dist/react-datepicker.css";

// Helper to get image array from various sources
const getImageArray = (row) => {
  if (row.photo) {
    return Array.isArray(row.photo) ? row.photo : [row.photo];
  }
  if (Array.isArray(row.images) && row.images.length > 0) {
    return row.images;
  }
  if (row.image) {
    return [row.image];
  }
  return [];
};

/**
 * Truncate a number to 2 decimal places (no rounding)
 * Example: 14.554472 -> 14.55, 19.125456 -> 19.12, 13.337555 -> 13.33
 * @param {number} value - The number to truncate
 * @returns {number} The truncated number with at most 2 decimal places
 */
const truncateToTwoDecimals = (value) => {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  return Math.floor(value * 100) / 100;
};

import { useSupplierUsers } from "@/lib/hooks/useSupplierUsers";

// A multi-section buying form: supplier/metadata, products cart, and payment summary.
// Enhanced with keyboard shortcuts and better UX
// Integrated with backend APIs for suppliers and purchases

export default function BuyingForm({ initialSuppliers = [], onSave }) {
  const router = useRouter();
  // Loading and error states
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Suppliers (from API)
  const [suppliers, setSuppliers] = useState(() =>
    Array.isArray(initialSuppliers)
      ? initialSuppliers.map((s) => ({
        id: s?._id || s?.id,
        name: s?.name,
        _original: s,
      }))
      : []
  );
  const [supplierId, setSupplierId] = useState("");
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newSupplierPhoneAreaCode, setNewSupplierPhoneAreaCode] = useState("");
  const [newSupplierCompany, setNewSupplierCompany] = useState("");
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [newSupplierAddress, setNewSupplierAddress] = useState("");
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const newSupplierPhoneInputRef = useRef(null);

  // Logistics company
  const [logisticsCompanies, setLogisticsCompanies] = useState([]);
  const [isLoadingLogisticsCompanies, setIsLoadingLogisticsCompanies] =
    useState(false);
  const [logisticsCompanyId, setLogisticsCompanyId] = useState("");
  const [enableLogisticsTracking, setEnableLogisticsTracking] = useState(false);

  // Products tied to selected supplier (removed automatic fetching)
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState(null);

  // Metadata fields (removed tc and TC_OPTIONS)
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toLocaleDateString('en-CA')
  );
  const initialInvoiceDateRef = useRef(invoiceDate);
  const [exchangeRate, setExchangeRate] = useState("");
  const [percentage, setPercentage] = useState("");

  // Cart rows
  const [rows, setRows] = useState([]);

  // Order-level box management
  const [totalBoxes, setTotalBoxes] = useState(0);

  // Packet configuration state
  const [productPackets, setProductPackets] = useState({}); // { rowId: { useVariantTracking: bool, packets: [] } }
  const [packetModalOpen, setPacketModalOpen] = useState(false);
  const [packetModalProduct, setPacketModalProduct] = useState(null);

  const packetModalItems = useMemo(() => {
    return rows.map((row, idx) => ({
      id: String(row.id ?? idx),
      index: idx,
      productName: row.productName || row.productCode || `Product ${idx + 1}`,
      productCode: row.productCode,
      quantity: parseFloat(row.quantity) || 0,
      primaryColor: row.primaryColor || [],
      size: row.size || [],
      packets: productPackets[row.id]?.packets || [],
    }));
  }, [rows, productPackets]);

  // Product image upload state
  const [productImages, setProductImages] = useState({}); // { rowId: File[] }
  const [imagePreviews, setImagePreviews] = useState({}); // { rowId: { fileId: string } }

  // Inline editing state for primary color and size (array inputs)
  const [editingCell, setEditingCell] = useState(null); // { rowId: string, fieldName: 'primaryColor' | 'size' } | null
  const [editValue, setEditValue] = useState(""); // Shared edit value
  const [rowInputValues, setRowInputValues] = useState({}); // { [rowId]: { primaryColor: '', size: '' } }
  const [imageGalleryState, setImageGalleryState] = useState(null); // { rowId: string, images: [] } | null

  // Payment section
  const [discount, setDiscount] = useState(0);
  const [cash, setCash] = useState(0);
  const [bank, setBank] = useState(0);

  // Refs for keyboard navigation
  const cashInputRef = useRef(null);
  const bankInputRef = useRef(null);
  const saveButtonRef = useRef(null);

  // Refs for file inputs (one per row)
  const fileInputRefs = useRef({});

  // Helper function to generate unique file ID
  const getFileId = (file) => {
    return `${file.name}-${file.size}-${file.lastModified}`;
  };

  // Fetch all suppliers (including those without user accounts)
  useEffect(() => {
    async function fetchAllSuppliers() {
      try {
        setIsLoadingSuppliers(true);
        setError(null);

        // Fetch all suppliers (not just those with user accounts)
        const response = await suppliersAPI.getAll({
          isActive: true,
          limit: 1000,
        });

        // Handle different response formats
        let suppliersList = [];

        if (response.data?.data && Array.isArray(response.data.data)) {
          suppliersList = response.data.data;
        } else if (response.data && Array.isArray(response.data)) {
          suppliersList = response.data;
        } else if (Array.isArray(response)) {
          suppliersList = response;
        }

        // Normalize supplier data for the form
        const normalizedSuppliers = suppliersList.map((supplier) => ({
          id: supplier._id || supplier.id,
          name: supplier.name,
          company: supplier.company || "",
          phone: supplier.phone || "",
          email: supplier.email || "",
          supplierId: supplier._id || supplier.id,
          _original: supplier,
        }));

        setSuppliers(normalizedSuppliers);

        if (normalizedSuppliers.length === 0 && !initialSuppliers?.length) {
          // Don't show error if no suppliers, just allow creating new ones
        }
      } catch (err) {
        console.error("Error fetching supplier users:", err);
        setError("Failed to load suppliers. Please refresh the page.");
      } finally {
        setIsLoadingSuppliers(false);
      }
    }

    fetchAllSuppliers();
  }, []);

  // Fetch logistics companies
  useEffect(() => {
    async function fetchLogisticsCompanies() {
      try {
        setIsLoadingLogisticsCompanies(true);
        const response = await logisticsCompaniesAPI.getAll({
          isActive: true,
          limit: 1000,
        });

        let companiesList = [];
        if (response?.data?.data) {
          companiesList = Array.isArray(response.data.data)
            ? response.data.data
            : [];
        } else if (response?.data?.rows) {
          companiesList = Array.isArray(response.data.rows)
            ? response.data.rows
            : [];
        } else if (Array.isArray(response?.data)) {
          companiesList = response.data;
        }

        setLogisticsCompanies(companiesList);
      } catch (err) {
        console.error("Error fetching logistics companies:", err);
      } finally {
        setIsLoadingLogisticsCompanies(false);
      }
    }

    fetchLogisticsCompanies();
  }, []);

  // Removed automatic product fetching when supplier is selected
  // Products are now manually entered or searched by code/name

  // Clear catalog details when supplier changes to avoid cross-data leakage
  useEffect(() => {
    if (!supplierId) {
      setRows([]);
      return;
    }

    setRows((existing) =>
      existing.map((row) => ({
        ...row,
        productId: "",
        productCode: "",
        productName: "",
        primaryColor: [],
        size: [],
        photo: null,
        cpiEuro: 0,
        cpiPound: 0,
        landedPrice: 0,
        landedTotal: 0,
        minimumSell: 0,
      }))
    );
  }, [supplierId]);

  // Add new supplier (Quick add with API integration)
  async function handleAddSupplier() {
    if (!newSupplierName.trim()) {
      setError("Please enter supplier name");
      return;
    }

    if (!newSupplierPhone.trim()) {
      setError("Please enter supplier phone");
      return;
    }

    if (!newSupplierEmail.trim()) {
      setError("Please enter supplier email");
      return;
    }

    if (!newSupplierAddress.trim()) {
      setError("Please enter supplier address");
      return;
    }

    try {
      setIsCreatingSupplier(true);
      setError(null);

      // Create supplier with required fields for quick-add flow
      const response = await suppliersAPI.create({
        name: newSupplierName.trim(),
        phone: newSupplierPhone.trim(),
        phoneAreaCode: newSupplierPhoneAreaCode.trim() || undefined,
        company: newSupplierCompany.trim() || undefined,
        email: newSupplierEmail.trim(),
        address: {
          street: newSupplierAddress.trim(),
        },
      });

      const newSupplier = response.data?.data || response.data;

      if (newSupplier) {
        // Add new supplier to the list
        const normalizedSupplier = {
          id: newSupplier._id || newSupplier.id,
          name: newSupplier.name,
          company: newSupplier.company || "",
          phone: newSupplier.phone || "",
          email: newSupplier.email || "",
          supplierId: newSupplier._id || newSupplier.id,
          _original: newSupplier,
        };

        setSuppliers((prev) => [...prev, normalizedSupplier]);
        setSupplierId(String(normalizedSupplier.id));
        setNewSupplierName("");
        setNewSupplierPhone("");
        setNewSupplierPhoneAreaCode("");
        setNewSupplierCompany("");
        setNewSupplierEmail("");
        setNewSupplierAddress("");
        setShowAddSupplier(false);
      }
    } catch (err) {
      console.error("Error creating supplier:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to create supplier. Please try again.";
      setError(errorMessage);
    } finally {
      setIsCreatingSupplier(false);
    }
  }

  // Add new row to cart
  function addRow() {
    const newRow = {
      id: Date.now(),
      productId: "",
      productName: "",
      productCode: "",
      season: [],
      costPrice: 0,
      primaryColor: [],
      size: [],
      quantity: 1,
      minSellingPrice: "",
      photo: null,
    };
    setRows((r) => [...r, newRow]);
  }

  function updateRow(id, field, value) {
    setRows((r) =>
      r.map((row) => {
        if (row.id !== id) return row;

        const updated = { ...row, [field]: value };

        // Clear productId if code or name is changed manually
        if (field === "productCode" || field === "productName") {
          updated.productId = "";
        }

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e0660d90-406d-498c-9b9c-ed0297888613', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'pre-fix',
            hypothesisId: 'H3',
            location: 'components/forms/buying-form.jsx:updateRow',
            message: 'Row updated',
            data: {
              id,
              field,
              rawValue: value,
              parsedCostPrice: Number(field === 'costPrice' ? value : row.costPrice || 0),
              parsedQuantity: Number(field === 'quantity' ? value : row.quantity || 0),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => { });
        // #endregion agent log

        // Auto-calculate supplier payment and landed price when cost price, exchange rate, or percentage changes
        const costPrice = Number(updated.costPrice || 0);
        const quantity = Number(updated.quantity || 0);
        const exRate = Number(exchangeRate);
        const percent = Number(percentage);
        const hasValidExchangeRate = !isNaN(exRate) && exRate > 0;
        const hasValidPercentage = !isNaN(percent) && percent >= 0;

        // Calculations (matching confirm order page):
        // Supplier Payment Amount = costPrice (NO exchange rate, NO profit margin) - what admin pays supplier in supplier currency
        const supplierPaymentAmount = costPrice;
        const supplierPaymentTotal = supplierPaymentAmount * quantity;

        // Landed Price = (Cost Price / Exchange Rate) × (1 + Percentage/100) - for inventory valuation in base currency
        // Truncate to 2 decimal places (no rounding) for display consistency with backend
        const landedPrice =
          hasValidExchangeRate && hasValidPercentage
            ? truncateToTwoDecimals((costPrice / exRate) * (1 + percent / 100))
            : 0;
        const landedTotal = truncateToTwoDecimals(landedPrice * quantity);

        updated.supplierPaymentAmount = supplierPaymentAmount;
        updated.supplierPaymentTotal = supplierPaymentTotal;
        updated.landedPrice = landedPrice;
        updated.landedTotal = landedTotal;

        return updated;
      })
    );
  }

  // Recalculate all rows when exchange rate or percentage changes
  useEffect(() => {
    if (rows.length > 0) {
      setRows((r) =>
        r.map((row) => {
          const costPrice = Number(row.costPrice || 0);
          const quantity = Number(row.quantity || 0);
          const exRate = Number(exchangeRate);
          const percent = Number(percentage);
          const hasValidExchangeRate = !isNaN(exRate) && exRate > 0;
          const hasValidPercentage = !isNaN(percent) && percent >= 0;

          // Supplier Payment Amount (what admin pays supplier - NO exchange rate, NO profit margin)
          // Formula: costPrice × quantity (in supplier currency)
          const supplierPaymentAmount = costPrice;
          const supplierPaymentTotal = supplierPaymentAmount * quantity;

          // Landed Price (for inventory valuation - WITH profit margin)
          // Formula: (cost price / exchange rate) × (1 + percentage/100)
          // Truncate to 2 decimal places (no rounding) for display consistency with backend
          const landedPrice =
            hasValidExchangeRate && hasValidPercentage
              ? truncateToTwoDecimals((costPrice / exRate) * (1 + percent / 100))
              : 0;
          const landedTotal = truncateToTwoDecimals(landedPrice * quantity);

          return {
            ...row,
            supplierPaymentAmount,
            supplierPaymentTotal,
            landedPrice,
            landedTotal,
          };
        })
      );
    }
  }, [exchangeRate, percentage]);

  // Handler functions for inline editing of primary color and size
  const handleCellClick = (rowId, fieldName) => {
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;

    setEditingCell({ rowId, fieldName });
    // For arrays, show empty string to start adding
    if (fieldName === "primaryColor" || fieldName === "size") {
      setEditValue("");
    } else {
      const currentValue = Array.isArray(row[fieldName])
        ? row[fieldName].join(", ")
        : row[fieldName] || "";
      setEditValue(currentValue);
    }
  };

  const handleCellSave = (rowId, fieldName) => {
    const trimmedValue = editValue.trim();
    if (
      !trimmedValue &&
      (fieldName === "primaryColor" || fieldName === "size")
    ) {
      // Allow saving empty array if user clears input
      updateRow(rowId, fieldName, []);
      setEditingCell(null);
      setEditValue("");
      return;
    }

    const row = rows.find((r) => r.id === rowId);
    if (!row) return;

    if (fieldName === "primaryColor" || fieldName === "size") {
      // For arrays, add the new value to existing array
      const currentArray = Array.isArray(row[fieldName])
        ? row[fieldName]
        : row[fieldName]
          ? [row[fieldName]]
          : [];

      if (trimmedValue && !currentArray.includes(trimmedValue)) {
        updateRow(rowId, fieldName, [...currentArray, trimmedValue]);
      } else {
        updateRow(rowId, fieldName, currentArray);
      }
      setEditValue(""); // Clear input for next value
      // Keep editing cell active to allow adding more values
    } else {
      updateRow(rowId, fieldName, trimmedValue);
      setEditingCell(null);
      setEditValue("");
    }
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue("");
  };

  function removeRow(id) {
    setRows((r) => r.filter((x) => x.id !== id));

    // Clean up images when row is removed
    const newImages = { ...productImages };
    const newPreviews = { ...imagePreviews };
    delete newImages[id];
    delete newPreviews[id];
    setProductImages(newImages);
    setImagePreviews(newPreviews);

    // Clean up packet configuration
    const newPackets = { ...productPackets };
    delete newPackets[id];
    setProductPackets(newPackets);

    // Clean up file input ref
    delete fileInputRefs.current[id];
  }

  // Handle packet configuration save
  const handleSavePackets = (packets, context) => {
    const rowId = context?.id ?? packetModalProduct?.id;
    if (!rowId) return;
    setProductPackets((prev) => ({
      ...prev,
      [rowId]: {
        useVariantTracking: packets.length > 0,
        packets,
      },
    }));
  };

  // Handle image upload for a product row
  const handleImageChange = (e, rowId) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const maxImages = 20;

    // Get current images for this row
    const existingPreviews = imagePreviews[rowId] || {};
    const existingImageKeys = Object.keys(existingPreviews).filter((key) =>
      key.startsWith("existing-")
    );
    const existingCount = existingImageKeys.length;
    const currentImages = productImages[rowId] || [];
    const newFilesCount = currentImages.length;
    const totalCurrentCount = existingCount + newFilesCount;

    if (totalCurrentCount + files.length > maxImages) {
      alert(
        `Maximum ${maxImages} images allowed per product. You currently have ${totalCurrentCount} image(s).`
      );
      e.target.value = "";
      return;
    }

    const validFiles = [];
    const invalidFiles = [];

    files.forEach((file) => {
      // Validate file type
      if (!validTypes.includes(file.type)) {
        invalidFiles.push(
          `${file.name}: Invalid file type. Only JPG, PNG, and WebP are allowed.`
        );
        return;
      }

      // Validate file size
      if (file.size > maxSize) {
        invalidFiles.push(`${file.name}: File size exceeds 5MB limit.`);
        return;
      }

      validFiles.push(file);
    });

    if (invalidFiles.length > 0) {
      alert(invalidFiles.join("\n"));
    }

    if (validFiles.length > 0) {
      // Add new files to existing ones
      const updatedImages = { ...productImages };
      updatedImages[rowId] = [...currentImages, ...validFiles];
      setProductImages(updatedImages);

      // Create previews for new files
      const updatedPreviews = { ...imagePreviews };
      if (!updatedPreviews[rowId]) {
        updatedPreviews[rowId] = {};
      }

      validFiles.forEach((file) => {
        const fileId = getFileId(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews((prev) => ({
            ...prev,
            [rowId]: {
              ...(prev[rowId] || {}),
              [fileId]: reader.result,
            },
          }));
        };
        reader.onerror = () => {
          console.error("Error reading file:", file.name);
        };
        reader.readAsDataURL(file);
      });
    }

    // Reset input value to allow selecting the same file again
    e.target.value = "";
  };

  // Handle image removal
  const handleRemoveImage = (rowId, file) => {
    const fileId = getFileId(file);
    const updatedImages = { ...productImages };
    updatedImages[rowId] = (updatedImages[rowId] || []).filter((f) => {
      const fId = getFileId(f);
      // Clean up object URL if it was created
      if (fId === fileId && f instanceof File) {
        const preview = imagePreviews[rowId]?.[fileId];
        if (preview && preview.startsWith("blob:")) {
          URL.revokeObjectURL(preview);
        }
      }
      return fId !== fileId;
    });
    setProductImages(updatedImages);

    const updatedPreviews = { ...imagePreviews };
    if (updatedPreviews[rowId]) {
      // Clean up object URL before removing
      const preview = updatedPreviews[rowId][fileId];
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
      delete updatedPreviews[rowId][fileId];
      if (Object.keys(updatedPreviews[rowId]).length === 0) {
        delete updatedPreviews[rowId];
      }
    }
    setImagePreviews(updatedPreviews);
  };

  // Derived totals - sum of all landedTotal values
  const totals = useMemo(() => {
    // Calculate supplier payment total (what admin pays supplier - NO exchange rate, NO profit margin)
    // Formula: costPrice × quantity (in supplier currency)
    const supplierPaymentTotal = rows.reduce((sum, row) => {
      const costPrice = Number(row.costPrice || 0);
      const quantity = Number(row.quantity || 0);
      return sum + costPrice * quantity;
    }, 0);

    // Calculate landed total (for inventory valuation - WITH profit margin)
    const grandTotal = rows.reduce(
      (sum, row) => sum + Number(row.landedTotal || 0),
      0
    );

    // Calculate sum of landed prices (for display in Pricing Breakdown)
    const landedPriceTotal = rows.reduce(
      (sum, row) => sum + Number(row.landedPrice || 0),
      0
    );

    // Discount applies to supplierPaymentTotal (what admin owes supplier), not landed total
    const discountAmount = Number(discount || 0);
    const supplierPaymentAfterDiscount = Math.max(
      0,
      supplierPaymentTotal - discountAmount
    );

    const paid = Number(cash || 0) + Number(bank || 0);
    // Remaining balance = supplierPaymentTotal - discount - paid
    // Allow negative values to show overpayment (credit)
    const remaining = supplierPaymentAfterDiscount - paid;
    return {
      supplierPaymentTotal,
      grandTotal,
      landedPriceTotal,
      discountAmount,
      supplierPaymentAfterDiscount,
      paid,
      remaining,
    };
  }, [rows, discount, cash, bank]);

  // Keyboard shortcuts
  function handlePaymentKeyDown(e, field) {
    // Enter key - move to next field or save
    if (e.key === "Enter") {
      e.preventDefault();
      if (field === "discount") {
        cashInputRef.current?.focus();
      } else if (field === "cash") {
        bankInputRef.current?.focus();
      } else if (field === "bank") {
        saveButtonRef.current?.focus();
      }
    }
    // Ctrl+S to save
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  }

  // Save purchase to backend (updated to use supplier user ID)
  const getSupplierIdFromProduct = (product) => {
    if (!product) return null;
    if (product.supplier?._id || product.supplier) {
      return product.supplier._id || product.supplier;
    }
    const supplierEntry = Array.isArray(product.suppliers) ? product.suppliers[0] : null;
    if (supplierEntry?.supplier?._id || supplierEntry?.supplier) {
      return supplierEntry.supplier._id || supplierEntry.supplier;
    }
    return null;
  };

  const matchesSupplier = (product, expectedSupplierId) => {
    if (!expectedSupplierId) return true;
    const productSupplierId = getSupplierIdFromProduct(product);
    if (!productSupplierId) return false;
    return String(productSupplierId) === String(expectedSupplierId);
  };

  const handleSave = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e0660d90-406d-498c-9b9c-ed0297888613', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'debug-session',
        runId: 'pre-fix',
        hypothesisId: 'H1',
        location: 'components/forms/buying-form.jsx:handleSave',
        message: 'Handle save invoked',
        data: {
          supplierId,
          rowsCount: rows.length,
          totalBoxes,
          totalsSnapshot: {
            subtotal: totals.subtotal,
            remaining: totals.remaining,
            supplierPaymentAfterDiscount: totals.supplierPaymentAfterDiscount,
          },
        },
        timestamp: Date.now(),
      }),
    }).catch(() => { });
    // #endregion agent log

    // Validation
    if (!supplierId) {
      setError("Please select a supplier");
      return;
    }

    if (rows.length === 0) {
      setError("Please add at least one product");
      return;
    }

    const parsedExchangeRate = Number(exchangeRate);
    if (
      exchangeRate === "" ||
      isNaN(parsedExchangeRate) ||
      parsedExchangeRate <= 0
    ) {
      setError("Exchange rate is required and must be greater than 0");
      return;
    }

    const parsedPercentage = Number(percentage);
    if (percentage === "" || isNaN(parsedPercentage) || parsedPercentage < 0) {
      setError("Percentage is required and must be 0 or greater");
      return;
    }

    // Validate box count only if logistics tracking is enabled
    if (enableLogisticsTracking && (!totalBoxes || Number(totalBoxes) < 1)) {
      setError("Number of boxes must be at least 1 when logistics tracking is enabled");
      return;
    }

    // Validate that all rows have required fields
    // Product ID is optional if product name is provided (manual entry)
    const invalidRows = rows.filter(
      (row) => {
        const costPrice = Number(row.costPrice);
        const quantity = Number(row.quantity);
        // Quantity must be a positive integer (no decimals)
        const isValidInteger = !isNaN(quantity) &&
          quantity > 0 &&
          Number.isInteger(quantity);

        // Colors and sizes are now required for all rows to ensure packet stock can be created
        const hasColors = Array.isArray(row.primaryColor) ? row.primaryColor.length > 0 : (typeof row.primaryColor === 'string' && row.primaryColor.trim());
        const hasSizes = Array.isArray(row.size) ? row.size.length > 0 : (typeof row.size === 'string' && row.size.trim());

        return (
          !row.productName ||
          !row.productCode ||
          !row.season ||
          row.season.length === 0 ||
          !row.costPrice ||
          isNaN(costPrice) ||
          costPrice <= 0 ||
          !row.minSellingPrice ||
          parseFloat(row.minSellingPrice) <= 0 ||
          !row.quantity ||
          !isValidInteger ||
          !hasColors ||
          !hasSizes
        );
      }
    );

    if (invalidRows.length > 0) {
      setError(
        "Please fill in product name, code, season, cost price, min sell price, quantity, primary color, and size for all rows"
      );
      return;
    }

    // Strict Packet Validation
    const packetErrors = [];
    rows.forEach((row) => {
      const packetConfig = productPackets[row.id];
      const rowLabel = row.productName || row.productCode || `Row ${rows.findIndex(r => r.id === row.id) + 1}`;

      if (!packetConfig || !Array.isArray(packetConfig.packets) || packetConfig.packets.length === 0) {
        packetErrors.push(`${rowLabel}: No packet configuration found`);
        return;
      }

      // Check each packet has composition
      const emptyPackets = packetConfig.packets.filter(p => !Array.isArray(p.composition) || p.composition.length === 0);
      if (emptyPackets.length > 0) {
        packetErrors.push(`${rowLabel}: Some packets have no composition (colors/sizes)`);
      }

      // Check total quantity matches
      const totalInPackets = packetConfig.packets.reduce((sum, p) => sum + (parseInt(p.totalItemsPerPacket || p.totalItems) || 0), 0);
      if (totalInPackets !== parseInt(row.quantity)) {
        packetErrors.push(`${rowLabel}: Packet quantity (${totalInPackets}) does not match row quantity (${row.quantity})`);
      }

      // Validate that all colors/sizes in packets match the row's colors/sizes
      const rowColors = Array.isArray(row.primaryColor) ? row.primaryColor : [row.primaryColor];
      const rowSizes = Array.isArray(row.size) ? row.size : [row.size];

      packetConfig.packets.forEach(p => {
        p.composition?.forEach(c => {
          if (!rowColors.includes(c.color)) {
            packetErrors.push(`${rowLabel}: Color "${c.color}" in packet not found in row colors`);
          }
          if (!rowSizes.includes(c.size)) {
            packetErrors.push(`${rowLabel}: Size "${c.size}" in packet not found in row sizes`);
          }
        });
      });
    });

    if (packetErrors.length > 0) {
      setError(`Packet Configuration Error: ${packetErrors[0]}`); // Show first error
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const totalPaid = Number(cash || 0) + Number(bank || 0);
      const paymentStatus =
        totals.supplierPaymentAfterDiscount <= 0 || totals.remaining <= 0
          ? "paid"
          : totalPaid > 0
            ? "partial"
            : "pending";

      // Find the selected supplier
      const selectedSupplier = suppliers.find(
        (s) => String(s.id) === String(supplierId)
      );

      // For rows without productId, try to find product by name or code
      const itemsWithProducts = await Promise.all(
        rows.map(async (row) => {
          let productId = row.productId;
          const supplierFilter = supplierId ? { supplierId } : {};

          // If no productId but we have product name or code, try to find it
          if (!productId && (row.productName || row.productCode)) {
            try {
              // Try lookup by code first
              if (row.productCode) {
                try {
                  const codeResponse = await productsAPI.lookupByCode(
                    row.productCode,
                    supplierFilter
                  );
                  const product = codeResponse.data?.data || codeResponse.data;
                  if (product && matchesSupplier(product, supplierId)) {
                    productId = product._id || product.id;
                  }
                } catch (codeErr) {
                  // If code lookup fails, we should NOT fallback to name search
                  // because that leads to "Product code mismatch" if the name exists
                  // with a different code. We'll let it proceed to create a new product.
                  console.log(`Code lookup failed for ${row.productCode}, will create new or re-validate.`);
                }
              } else if (row.productName) {
                // Try name search
                const nameResponse = await productsAPI.search(row.productName, supplierFilter);
                const productsList =
                  nameResponse.data?.data || nameResponse.data || [];
                const product =
                  productsList.find(
                    (p) =>
                      matchesSupplier(p, supplierId) &&
                      p.name?.toLowerCase() ===
                      row.productName.trim().toLowerCase()
                  ) || productsList.find((p) => matchesSupplier(p, supplierId));
                if (product && matchesSupplier(product, supplierId)) {
                  productId = product._id || product.id;
                }
              }
            } catch (searchErr) {
              console.error("Error searching for product:", searchErr);
            }
          }

          // If still no productId, create the product automatically
          if (!productId) {
            try {
              // Create product with required fields
              // Note: productCode is not in the validation schema, so we'll use SKU instead
              const productData = {
                name: row.productName.trim(),
                sku: (row.productCode || `AUTO-${Date.now()}`).toUpperCase(),
                supplier: supplierId, // Required by Product model
                season: normalizeSeasonArray(row.season || []),
                category: "General", // Default category, can be updated later
                size:
                  Array.isArray(row.size) && row.size.length > 0
                    ? row.size.join(", ")
                    : typeof row.size === "string"
                      ? row.size
                      : undefined,
                specifications: {
                  color:
                    Array.isArray(row.primaryColor) &&
                      row.primaryColor.length > 0
                      ? row.primaryColor.join(", ")
                      : typeof row.primaryColor === "string"
                        ? row.primaryColor
                        : undefined,
                },
                pricing: {
                  costPrice: Number(row.costPrice || 0),
                  sellingPrice: Number(row.costPrice || 0) * 1.2, // Default 20% markup
                },
                useVariantTracking: true, // IMPORTANT: Enable variant tracking for packet stock
                unit: "piece",
              };

              const createResponse = await productsAPI.create(productData);
              const createdProduct =
                createResponse.data?.data || createResponse.data;
              if (createdProduct) {
                productId = createdProduct._id || createdProduct.id;
                console.log(
                  `Created new product: ${row.productName} with ID: ${productId}`
                );
              } else {
                throw new Error(
                  `Failed to create product "${row.productName}"`
                );
              }
            } catch (createErr) {
              console.error("Error creating product:", createErr);
              const errorMessage =
                createErr.response?.data?.message ||
                createErr.response?.data?.error ||
                createErr.message ||
                `Failed to create product "${row.productName}"`;
              throw new Error(errorMessage);
            }
          }

          // Upload images if any exist for this row
          let imageUrls = [];
          const rowImages = productImages[row.id] || [];

          // Get existing images from previews (URLs that were already uploaded)
          const existingPreviews = imagePreviews[row.id] || {};
          const existingImageKeys = Object.keys(existingPreviews).filter(
            (key) => key.startsWith("existing-")
          );
          const existingUrls = existingImageKeys
            .sort((a, b) => {
              const aIndex = parseInt(a.replace("existing-", "")) || 0;
              const bIndex = parseInt(b.replace("existing-", "")) || 0;
              return aIndex - bIndex;
            })
            .map((key) => existingPreviews[key])
            .filter(
              (url) => url && typeof url === "string" && url.trim() !== ""
            );

          imageUrls = [...existingUrls];

          // Upload new images if product exists
          if (productId && rowImages.length > 0) {
            try {
              for (const imageFile of rowImages) {
                try {
                  const uploadResponse = await productsAPI.uploadImage(
                    productId,
                    imageFile
                  );
                  const uploadedImageUrl =
                    uploadResponse.data?.data?.imageUrl ||
                    uploadResponse.data?.imageUrl ||
                    uploadResponse.data?.data?.product?.images?.[0];

                  if (uploadedImageUrl) {
                    imageUrls.push(uploadedImageUrl);
                    console.log(
                      `Uploaded image for product ${productId}: ${imageFile.name}`
                    );
                  } else {
                    console.warn(
                      `Image uploaded but no URL returned for ${imageFile.name}`
                    );
                  }
                } catch (uploadErr) {
                  console.error(
                    `Error uploading image ${imageFile.name}:`,
                    uploadErr
                  );
                  // Continue with other images even if one fails
                  const errorMessage =
                    uploadErr.response?.data?.message ||
                    uploadErr.response?.data?.error ||
                    uploadErr.message ||
                    "Failed to upload image";
                  console.warn(
                    `Skipping image ${imageFile.name}: ${errorMessage}`
                  );
                }
              }
            } catch (err) {
              console.error("Error uploading images:", err);
              // Continue anyway - images are optional
            }
          }

          // Calculate supplier payment and landed price from cost price, exchange rate, and percentage
          const costPrice = Number(row.costPrice || 0);
          const exRate = parsedExchangeRate;
          const percent = parsedPercentage;
          const quantity = Number(row.quantity);

          // Validate quantity is a positive integer (no decimals allowed)
          if (!row.quantity || isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
            throw new Error(`Invalid quantity for product: ${row.productName || row.productCode || 'Unknown'}. Quantity must be a positive integer (whole number).`);
          }

          // Supplier Payment Amount (what admin pays supplier - NO exchange rate, NO profit margin)
          // Formula: costPrice × quantity (in supplier currency)
          const supplierPaymentAmount = costPrice;
          const supplierPaymentTotal = supplierPaymentAmount * quantity;

          // Landed Price (for inventory valuation - WITH profit margin)
          // Formula: (cost price / exchange rate) × (1 + percentage/100)
          // Truncate to 2 decimal places (no rounding) for database storage
          const landedPrice = truncateToTwoDecimals((costPrice / exRate) * (1 + percent / 100));
          const landedTotal = truncateToTwoDecimals(landedPrice * quantity);

          // Build item payload according to manualEntryItemSchema
          // Allowed fields: product, productName, productCode, productType, costPrice, primaryColor, size, material, description, productImage, quantity, landedTotal
          const itemPayload = {
            product: productId,
            quantity: Math.floor(quantity), // Ensure it's an integer
            minSellingPrice: parseFloat(row.minSellingPrice) || 0,
            landedTotal: landedTotal,
          };

          // Add optional fields only if they have values
          if (row.productName) {
            itemPayload.productName = row.productName;
          }
          if (row.productCode) {
            itemPayload.productCode = row.productCode;
          }
          if (
            row.season &&
            Array.isArray(row.season) &&
            row.season.length > 0
          ) {
            itemPayload.season = normalizeSeasonArray(row.season);
          }
          if (costPrice > 0) {
            itemPayload.costPrice = costPrice;
          }

          // primaryColor: send as array for backend processing
          if (Array.isArray(row.primaryColor) && row.primaryColor.length > 0) {
            itemPayload.primaryColor = row.primaryColor;
          } else if (
            typeof row.primaryColor === "string" &&
            row.primaryColor.trim()
          ) {
            itemPayload.primaryColor = [row.primaryColor.trim()]; // Normalize to array
          }

          // size: send as array for backend processing
          if (Array.isArray(row.size) && row.size.length > 0) {
            itemPayload.size = row.size;
          } else if (typeof row.size === "string" && row.size.trim()) {
            itemPayload.size = [row.size.trim()]; // Normalize to array
          }

          if (row.material) {
            itemPayload.material = row.material;
          }
          if (row.description) {
            itemPayload.description = row.description;
          }
          if (imageUrls.length > 0) {
            itemPayload.productImage = imageUrls;
          }

          // Add packet configuration if configured
          const packetConfig = productPackets[row.id];
          itemPayload.useVariantTracking = true;

          // Heal packets to ensure both totalItems and totalItemsPerPacket exist (requirement for manual entry)
          itemPayload.packets = (packetConfig?.packets || []).map(p => ({
            ...p,
            totalItems: parseInt(p.totalItems || p.totalItemsPerPacket) || 0,
            totalItemsPerPacket: parseInt(p.totalItemsPerPacket || p.totalItems) || 0
          }));

          return itemPayload;
        })
      );

      // Calculate subtotal and grandTotal
      const subtotal = itemsWithProducts.reduce(
        (sum, item) => sum + (item.landedTotal || 0),
        0
      );
      const grandTotal = subtotal; // Landed total for inventory valuation (no discount applied here)

      // Note: boxes are not part of manualEntryItemSchema, so we don't add them to items
      // If boxes are needed, they should be handled at the order level, not item level

      const purchaseDatePayload =
        invoiceDate && invoiceDate !== initialInvoiceDateRef.current
          ? invoiceDate
          : undefined;

      const payload = {
        supplier: supplierId, // Use supplier ID directly
        exchangeRate: parsedExchangeRate,
        percentage: parsedPercentage,
        subtotal: subtotal,
        totalDiscount: Number(discount || 0),
        totalTax: 0,
        shippingCost: 0,
        grandTotal: grandTotal, // Landed total (inventory valuation)
        cashPayment: Number(cash || 0),
        bankPayment: Number(bank || 0),
        remainingBalance: Math.max(0, totals.remaining), // Ensure >= 0 (negative values indicate overpayment/credit)
        paymentStatus,
        paymentTerms: "net30", // Default payment terms
        notes: `Exchange Rate: ${exchangeRate}, Percentage: ${percentage}%. Manual entry - ${selectedSupplier?.name || "Supplier"
          }`,
        items: itemsWithProducts,
        totalBoxes: Number(totalBoxes || 0),
      };

      if (purchaseDatePayload) {
        payload.purchaseDate = purchaseDatePayload;
      }

      // Add logistics company if enabled and selected
      if (enableLogisticsTracking && logisticsCompanyId) {
        payload.logisticsCompany = logisticsCompanyId;
      } else {
        // If logistics tracking is not enabled, don't send boxes either
        if (!enableLogisticsTracking) {
          payload.totalBoxes = 0;
        }
      }

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e0660d90-406d-498c-9b9c-ed0297888613', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'pre-fix',
          hypothesisId: 'H2',
          location: 'components/forms/buying-form.jsx:handleSave:beforeCreate',
          message: 'About to call purchasesAPI.create',
          data: {
            payloadSummary: {
              supplier: payload.supplier,
              itemsCount: Array.isArray(payload.items) ? payload.items.length : 0,
              totalBoxes: payload.totalBoxes,
              grandTotal: payload.grandTotal,
              remainingBalance: payload.remainingBalance,
              paymentStatus: payload.paymentStatus,
            },
          },
          timestamp: Date.now(),
        }),
      }).catch(() => { });
      // #endregion agent log

      const response = await purchasesAPI.create(payload);

      if (response.status === 202) {
        toast.success('Backdated purchase request submitted for super-admin approval.');
        router.push('/my-requests');
        return;
      }

      // Success! Call parent callback with response
      if (onSave) {
        onSave(response.data?.data || response.data);
      }
    } catch (err) {
      console.error("Error saving purchase:", err);

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e0660d90-406d-498c-9b9c-ed0297888613', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'pre-fix',
          hypothesisId: 'H4',
          location: 'components/forms/buying-form.jsx:handleSave:catch',
          message: 'Error during purchasesAPI.create',
          data: {
            name: err?.name,
            message: err?.message,
            responseStatus: err?.response?.status,
            responseMessage: err?.response?.data?.message,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => { });
      // #endregion agent log

      // Extract error message from API response
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to save purchase. Please try again.";

      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">
          <div className="flex items-start gap-2">
            <span className="text-sm font-medium">Error:</span>
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-xs underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Loading State for Suppliers */}
      {isLoadingSuppliers && (
        <div className="rounded-lg border border-border bg-muted p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <span className="text-sm text-muted-foreground">
              Loading suppliers...
            </span>
          </div>
        </div>
      )}

      {/* Section 1: Buying Details - Complete Redesign */}
      <section className="rounded-lg border border-border bg-card shadow-sm mb-6 overflow-hidden">
        {/* Header */}
        <div className="bg-muted/30 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">Buying Details</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-6">
            {/* All Fields in One Row - Ordered: Invoice Date, Exchange Rate, Percentage, Supplier */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-0 items-start">
              {/* Invoice Date */}
              <div className="flex flex-col h-full">
                <Label htmlFor="invoice-date" className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2 h-6">
                  <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Invoice Date
                </Label>
                <div className="relative group flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                    <svg className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <BritishDatePicker
                    value={new Date(invoiceDate)}
                    onChange={(date) => setInvoiceDate(date)}
                    restrictByRole={true}
                    className="h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm font-medium text-foreground outline-none transition-all duration-200 focus:ring-2 focus:ring-ring focus:border-transparent hover:border-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="DD/MM/YYYY"
                  />
                </div>
                <div className="h-[42px]"></div>
              </div>

              {/* Exchange Rate */}
              <div className="flex flex-col h-full">
                <Label htmlFor="exchange-rate" className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2 h-6">
                  <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  Exchange Rate
                </Label>
                <Input
                  id="exchange-rate"
                  type="text"
                  inputMode="decimal"
                  value={exchangeRate}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow only numbers and one decimal point, limit to 2 decimal places
                    let sanitized = value
                      .replace(/[^0-9.]/g, "")
                      .replace(/(\..*)\./, "$1");
                    // Limit to 2 decimal places
                    const parts = sanitized.split(".");
                    if (parts[1] && parts[1].length > 2) {
                      sanitized = parts[0] + "." + parts[1].slice(0, 2);
                    }
                    // Keep as string to allow typing decimal point
                    setExchangeRate(sanitized);
                  }}
                  className="h-11 w-full text-base font-medium"
                  placeholder="1.00"
                />
                <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1.5 min-h-[42px]">
                  <svg className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Rate to convert supplier currency to base currency</span>
                </p>
              </div>

              {/* Percentage */}
              <div className="flex flex-col h-full">
                <Label htmlFor="percentage" className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2 h-6">
                  <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Percentage (%)
                </Label>
                <Input
                  id="percentage"
                  type="text"
                  inputMode="decimal"
                  value={percentage}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Allow only numbers and one decimal point, limit to 2 decimal places
                    let sanitized = value
                      .replace(/[^0-9.]/g, "")
                      .replace(/(\..*)\./, "$1");
                    // Limit to 2 decimal places
                    const parts = sanitized.split(".");
                    if (parts[1] && parts[1].length > 2) {
                      sanitized = parts[0] + "." + parts[1].slice(0, 2);
                    }
                    // Keep as string to allow typing decimal point
                    setPercentage(sanitized);
                  }}
                  className="h-11 w-full text-base font-medium"
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground mt-1.5 flex items-start gap-1.5 min-h-[42px]">
                  <svg className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Profit margin percentage applied to landed price</span>
                </p>
              </div>

              {/* Supplier */}
              <div className="flex flex-col h-full">
                <Label htmlFor="supplier" className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2 h-6">
                  <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  Supplier
                </Label>
                <div className="flex gap-2 items-start">
                  <Select
                    value={supplierId || undefined}
                    onValueChange={setSupplierId}
                    disabled={isLoadingSuppliers}
                  >
                    <SelectTrigger
                      id="supplier"
                      size="default"
                      className="flex-1 w-full h-11 rounded-lg border border-input bg-background text-sm font-medium text-foreground data-[size=default]:h-11 hover:border-ring/50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] transition-all duration-200"
                    >
                      <SelectValue
                        placeholder={
                          isLoadingSuppliers ? "Loading..." : "Select supplier..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.company}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowAddSupplier(true)}
                    title="Add new supplier"
                    className="h-11 w-11 rounded-lg border border-input bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 flex-shrink-0"
                  >
                    <UserPlusIcon className="h-4 w-4" />
                  </Button>
                </div>
                <div className="h-[42px]"></div>
              </div>
            </div>

            {/* Row 3: Logistics Tracking */}
            <div className="pt-2 border-t border-border">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="enable-logistics"
                  checked={enableLogisticsTracking}
                  onChange={(e) => {
                    setEnableLogisticsTracking(e.target.checked);
                    if (!e.target.checked) {
                      setLogisticsCompanyId("");
                      setTotalBoxes(0);
                    }
                  }}
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary mt-0.5 flex-shrink-0"
                />
                <div className="flex-1 space-y-3">
                  <Label htmlFor="enable-logistics" className="text-sm font-semibold cursor-pointer text-foreground flex items-center gap-2">
                    <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Enable Logistics Tracking
                  </Label>
                  {enableLogisticsTracking && (
                    <div className="space-y-2 pl-7">
                      <Label htmlFor="logistics-company" className="text-sm font-medium text-foreground">
                        Logistics Company
                      </Label>
                      <Select
                        value={logisticsCompanyId || undefined}
                        onValueChange={(value) => setLogisticsCompanyId(value || "")}
                        disabled={isLoadingLogisticsCompanies}
                      >
                        <SelectTrigger id="logistics-company" className="h-11">
                          <SelectValue
                            placeholder={
                              isLoadingLogisticsCompanies
                                ? "Loading..."
                                : "Select company..."
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {logisticsCompanies.map((company) => (
                            <SelectItem
                              key={company._id || company.id}
                              value={String(company._id || company.id)}
                            >
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Products - Enhanced Design */}
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">Products</h2>
          </div>
          <Button type="button" onClick={addRow} size="sm" className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Add Product
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border sticky top-0 z-10">
              <tr>
                <th className="text-left px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider min-w-[120px]">
                  Name
                </th>
                <th className="text-left px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider min-w-[100px]">
                  Code
                </th>
                <th className="text-left px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider min-w-[60px]">
                  Image
                </th>
                <th className="text-left px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider min-w-[120px]">
                  Season
                </th>
                <th className="text-right px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider min-w-[80px]">
                  Cost Price
                </th>
                <th className="text-right px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider min-w-[90px]">
                  Min Sell Price
                </th>
                <th className="text-right px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider min-w-[80px]">
                  Landed Price
                </th>
                <th className="text-right px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider min-w-[90px]">
                  Landed Total
                </th>
                <th className="text-left px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider min-w-[100px]">
                  Color
                </th>
                <th className="text-left px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider min-w-[100px]">
                  Size
                </th>
                <th className="text-right px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider min-w-[80px]">
                  Qty
                </th>
                <th className="text-center px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider min-w-[100px]">
                  Packets
                </th>
                <th className="text-center px-2 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="text-center py-12"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-2">
                        <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-foreground">No products added yet</p>
                      <p className="text-xs text-muted-foreground">
                        Click "Add Product" to get started
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-muted/20 transition-colors"
                >
                  {/* Name */}
                  <td className="px-2 py-2">
                    <Input
                      value={row.productName}
                      onChange={(e) => {
                        updateRow(row.id, "productName", e.target.value);
                      }}
                      placeholder="Name"
                      className="h-8 text-xs px-2"
                    />
                  </td>

                  {/* Code */}
                  <td className="px-2 py-2">
                    <Input
                      value={row.productCode}
                      onChange={(e) => {
                        updateRow(row.id, "productCode", e.target.value);
                      }}
                      placeholder="Code"
                      className="h-8 text-xs px-2"
                    />
                  </td>

                  {/* Image - Compact display with 1 tile */}
                  <td className="px-2 py-2 w-[80px]">
                    {(() => {
                      const existingPreviews = imagePreviews[row.id] || {};
                      const existingImageKeys = Object.keys(
                        existingPreviews
                      ).filter((key) => key.startsWith("existing-"));
                      const newFiles = productImages[row.id] || [];

                      // Get all images for gallery
                      const allImages = [
                        ...existingImageKeys
                          .sort((a, b) => {
                            const aIndex =
                              parseInt(a.replace("existing-", "")) || 0;
                            const bIndex =
                              parseInt(b.replace("existing-", "")) || 0;
                            return aIndex - bIndex;
                          })
                          .map((key) => {
                            const url = existingPreviews[key];
                            if (
                              !url ||
                              typeof url !== "string" ||
                              url.trim() === ""
                            ) {
                              return null;
                            }
                            return {
                              id: key,
                              url: url.trim(),
                              isExisting: true,
                            };
                          })
                          .filter((img) => img !== null),
                        ...(existingImageKeys.length === 0
                          ? getImageArray(row).map((url, idx) => ({
                            id: `fallback-${idx}`,
                            url,
                            isExisting: true,
                          }))
                          : []),
                        ...newFiles.map((file) => {
                          const fileId = getFileId(file);
                          return {
                            id: fileId,
                            url:
                              existingPreviews[fileId] ||
                              URL.createObjectURL(file),
                            isExisting: false,
                            file: file,
                          };
                        }),
                      ];

                      return (
                        <div className="relative">
                          {allImages.length === 0 ? (
                            <div
                              className="h-12 w-12 flex items-center justify-center rounded border border-border bg-muted cursor-pointer hover:border-primary transition-colors"
                              onClick={() => {
                                const input = fileInputRefs.current[row.id];
                                if (input) {
                                  input.setAttribute("multiple", "");
                                  input.multiple = true;
                                  input.click();
                                }
                              }}
                              title="Click to add images"
                            >
                              <ImageIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          ) : (
                            <>
                              <div
                                className="h-12 w-12 overflow-hidden rounded border border-border bg-muted cursor-pointer hover:border-primary transition-colors relative group"
                                onClick={() => {
                                  setImageGalleryState({
                                    rowId: row.id,
                                    images: allImages,
                                    selectedIndex: 0,
                                  });
                                }}
                              >
                                <img
                                  src={allImages[0].url}
                                  alt="Product"
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.target.style.display = "none";
                                  }}
                                />
                                {/* Add button overlay - appears on hover */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent opening gallery
                                    const input = fileInputRefs.current[row.id];
                                    if (input) {
                                      input.setAttribute("multiple", "");
                                      input.multiple = true;
                                      input.click();
                                    }
                                  }}
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
                                  title="Add more images"
                                >
                                  <Plus className="h-5 w-5 text-white" />
                                </button>
                              </div>
                              {allImages.length > 1 && (
                                <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-semibold z-20">
                                  +{allImages.length - 1}
                                </div>
                              )}
                            </>
                          )}
                          {/* Hidden File Input - Always rendered */}
                          <input
                            type="file"
                            accept="image/jpeg,image/jpg,image/png,image/webp"
                            onChange={(e) => handleImageChange(e, row.id)}
                            multiple
                            className="hidden"
                            ref={(el) => {
                              if (el) {
                                fileInputRefs.current[row.id] = el;
                              }
                            }}
                            id={`image-input-${row.id}`}
                          />
                        </div>
                      );
                    })()}
                  </td>

                  {/* Season */}
                  <td className="px-2 py-2 relative">
                    <div className="min-w-[140px]">
                      <MultiSelect
                        options={SEASON_OPTIONS}
                        value={Array.isArray(row.season) ? row.season : []}
                        onChange={(selectedSeasons) =>
                          updateRow(row.id, "season", selectedSeasons)
                        }
                        placeholder="Seasons"
                        disabled={isSaving}
                        className="w-full text-xs"
                      />
                    </div>
                  </td>

                  <td className="px-2 py-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={row.costPrice === 0 ? "" : String(row.costPrice || "")}
                      onChange={(e) => {
                        const value = e.target.value;
                        let sanitized = value
                          .replace(/[^0-9.]/g, "")
                          .replace(/(\..*)\./g, "$1");
                        if (sanitized === ".") sanitized = "";
                        updateRow(row.id, "costPrice", sanitized === "" ? "" : sanitized);
                      }}
                      className="h-8 text-xs text-right tabular-nums px-2"
                    />
                  </td>

                  {/* Min Sell Price */}
                  <td className="px-2 py-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={row.minSellingPrice === "" ? "" : String(row.minSellingPrice || "")}
                      onChange={(e) => {
                        const value = e.target.value;
                        let sanitized = value
                          .replace(/[^0-9.]/g, "")
                          .replace(/(\..*)\./g, "$1");
                        if (sanitized === ".") sanitized = "";
                        updateRow(row.id, "minSellingPrice", sanitized === "" ? "" : sanitized);
                      }}
                      placeholder="Min Sell"
                      className={`h-8 text-xs text-right tabular-nums px-2 ${(!row.minSellingPrice || parseFloat(row.minSellingPrice) <= 0) ? "border-amber-500 bg-amber-50" : ""}`}
                    />
                  </td>

                  {/* Landed Price (New) */}
                  <td className="px-2 py-2 text-right">
                    <span className="text-xs font-medium text-foreground tabular-nums">
                      {Number(row.landedPrice || 0).toFixed(2)}
                    </span>
                  </td>

                  {/* Landed Total (New) */}
                  <td className="px-2 py-2 text-right">
                    <span className="text-xs font-semibold text-primary tabular-nums">
                      {Number(row.landedTotal || 0).toFixed(2)}
                    </span>
                  </td>

                  {/* Primary Color - Always visible input */}
                  <td className="px-2 py-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          value={rowInputValues[row.id]?.primaryColor || ""}
                          onChange={(e) => {
                            setRowInputValues((prev) => ({
                              ...prev,
                              [row.id]: {
                                ...prev[row.id],
                                primaryColor: e.target.value,
                              },
                            }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const value = (
                                rowInputValues[row.id]?.primaryColor || ""
                              ).trim();
                              if (value) {
                                const currentArray = Array.isArray(
                                  row.primaryColor
                                )
                                  ? row.primaryColor
                                  : [];
                                if (!currentArray.includes(value)) {
                                  updateRow(row.id, "primaryColor", [
                                    ...currentArray,
                                    value,
                                  ]);
                                  setRowInputValues((prev) => ({
                                    ...prev,
                                    [row.id]: {
                                      ...prev[row.id],
                                      primaryColor: "",
                                    },
                                  }));
                                }
                              }
                              e.target.focus();
                            }
                          }}
                          placeholder=""
                          className="h-7 text-xs px-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const value = (
                              rowInputValues[row.id]?.primaryColor || ""
                            ).trim();
                            if (value) {
                              const currentArray = Array.isArray(
                                row.primaryColor
                              )
                                ? row.primaryColor
                                : [];
                              if (!currentArray.includes(value)) {
                                updateRow(row.id, "primaryColor", [
                                  ...currentArray,
                                  value,
                                ]);
                                setRowInputValues((prev) => ({
                                  ...prev,
                                  [row.id]: {
                                    ...prev[row.id],
                                    primaryColor: "",
                                  },
                                }));
                              }
                            }
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      {Array.isArray(row.primaryColor) &&
                        row.primaryColor.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {row.primaryColor.slice(0, 2).map((color, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-medium border border-blue-200 max-w-[70px] truncate"
                                title={color}
                              >
                                <span className="truncate">{color}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = row.primaryColor.filter(
                                      (_, i) => i !== idx
                                    );
                                    updateRow(row.id, "primaryColor", updated);
                                  }}
                                  className="hover:text-blue-900 flex-shrink-0 transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                            {row.primaryColor.length > 2 && (
                              <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium border border-blue-200">
                                +{row.primaryColor.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                    </div>
                  </td>

                  {/* Size - Always visible input */}
                  <td className="px-2 py-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1">
                        <Input
                          type="text"
                          value={rowInputValues[row.id]?.size || ""}
                          onChange={(e) => {
                            setRowInputValues((prev) => ({
                              ...prev,
                              [row.id]: {
                                ...prev[row.id],
                                size: e.target.value,
                              },
                            }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const value = (
                                rowInputValues[row.id]?.size || ""
                              ).trim();
                              if (value) {
                                const currentArray = Array.isArray(row.size)
                                  ? row.size
                                  : [];
                                if (!currentArray.includes(value)) {
                                  updateRow(row.id, "size", [
                                    ...currentArray,
                                    value,
                                  ]);
                                  setRowInputValues((prev) => ({
                                    ...prev,
                                    [row.id]: { ...prev[row.id], size: "" },
                                  }));
                                }
                              }
                              e.target.focus();
                            }
                          }}
                          placeholder=""
                          className="h-7 text-xs px-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const value = (
                              rowInputValues[row.id]?.size || ""
                            ).trim();
                            if (value) {
                              const currentArray = Array.isArray(row.size)
                                ? row.size
                                : [];
                              if (!currentArray.includes(value)) {
                                updateRow(row.id, "size", [
                                  ...currentArray,
                                  value,
                                ]);
                                setRowInputValues((prev) => ({
                                  ...prev,
                                  [row.id]: { ...prev[row.id], size: "" },
                                }));
                              }
                            }
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      {Array.isArray(row.size) && row.size.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {row.size.slice(0, 2).map((size, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-medium border border-emerald-200 max-w-[70px] truncate"
                              title={size}
                            >
                              <span className="truncate">{size}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = row.size.filter(
                                    (_, i) => i !== idx
                                  );
                                  updateRow(row.id, "size", updated);
                                }}
                                className="hover:text-emerald-900 flex-shrink-0 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                          {row.size.length > 2 && (
                            <span className="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md text-xs font-medium border border-emerald-200">
                              +{row.size.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Total Quantity */}
                  <td className="px-2 py-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={row.quantity === 0 ? "" : String(row.quantity || "")}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only positive integers (no decimals, no negative)
                        let sanitized = value.replace(/[^0-9]/g, "");
                        // Remove leading zeros (but allow single zero)
                        if (sanitized.length > 1 && sanitized[0] === '0') {
                          sanitized = sanitized.replace(/^0+/, '') || '0';
                        }
                        // Only update if it's a valid positive integer or empty (to allow clearing)
                        if (sanitized === "" || (!isNaN(Number(sanitized)) && Number(sanitized) > 0 && Number.isInteger(Number(sanitized)))) {
                          updateRow(
                            row.id,
                            "quantity",
                            sanitized === "" ? "" : sanitized
                          );
                        }
                      }}
                      className="h-8 text-xs text-right tabular-nums px-2"
                    />
                  </td>

                  {/* Packet Configuration */}
                  <td className="px-2 py-2 text-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPacketModalProduct({
                          ...row,
                          index: rows.findIndex((r) => r.id === row.id),
                        });
                        setPacketModalOpen(true);
                      }}
                      className="h-8 text-[10px] gap-1 px-2"
                      title="Configure packets"
                    >
                      {productPackets[row.id]?.useVariantTracking ? (
                        <span className="text-emerald-600 font-medium">Configured</span>
                      ) : (
                        <span>Config</span>
                      )}
                    </Button>
                  </td>

                  {/* Action */}
                  <td className="px-2 py-2 text-center text-xs">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(row.id)}
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                      title="Remove row"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length > 0 && (
          <div className="mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-muted rounded-md text-xs font-medium border border-border">Tab</kbd>
              <span>to navigate between fields</span>
            </div>
          </div>
        )}
      </section>

      {/* Box Management Section - Enhanced Design */}
      {rows.length > 0 && enableLogisticsTracking && (
        <section className="rounded-lg border border-border bg-card p-6 shadow-sm mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground">Box Management</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="total-boxes" className="text-sm font-medium text-foreground">Number of Boxes</Label>
              <Input
                id="total-boxes"
                type="text"
                inputMode="numeric"
                value={totalBoxes}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow only numbers
                  const sanitized = value.replace(/[^0-9]/g, "");
                  setTotalBoxes(sanitized === "" ? "" : Number(sanitized) || 0);
                }}
                className="h-10"
              />
              <p className="text-xs text-muted-foreground mt-1">
                All products in this order will be organized into these boxes
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Section 3: Payment Summary - Professional Redesign */}
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-muted/40 to-muted/20 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Payment Summary</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Review and complete payment details</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Top Section: Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Supplier Payment Amount */}
            <div className="p-5 bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-md bg-background/80 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Supplier Payment
                  </span>
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {totals.supplierPaymentTotal.toFixed(2)}
              </div>
            </div>

            {/* Final Amount - Highlighted */}
            <div className="p-5 bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 rounded-lg border-2 border-primary/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">Final Amount</span>
                  </div>
                </div>
                <div className="text-2xl font-bold tabular-nums text-primary mb-2">
                  {totals.supplierPaymentAfterDiscount.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Amount due after discount
                </p>
              </div>
            </div>

            {/* Landed Total */}
            <div className="p-5 bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-md bg-background/80 flex items-center justify-center">
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Landed Total
                  </span>
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground tabular-nums">
                {totals.grandTotal.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Bottom Section: Payment Inputs & Balance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Payment Inputs */}
            <div className="space-y-5">
              <div className="pb-2 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Payment Details</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Enter payment amounts</p>
              </div>

              {/* Discount */}
              <div className="space-y-2">
                <Label htmlFor="discount" className="text-sm font-semibold text-foreground flex items-center gap-2">
                  Discount
                </Label>
                <div className="relative">

                  <Input
                    id="discount"
                    type="text"
                    inputMode="decimal"
                    value={discount}
                    onChange={(e) => {
                      const value = e.target.value;
                      const sanitized = value
                        .replace(/[^0-9.]/g, "")
                        .replace(/(\..*)\./g, "$1");
                      setDiscount(sanitized === "" ? "" : Number(sanitized || 0));
                    }}
                    onKeyDown={(e) => handlePaymentKeyDown(e, "discount")}
                    className="h-11 w-full pl-10 pr-3 text-base font-medium rounded-lg border border-input bg-background focus-visible:ring-2 focus-visible:ring-primary/20"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <svg className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Applied to supplier payment amount</span>
                </p>
              </div>

              {/* Payment Methods Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Bank Payment */}
                <div className="space-y-2">
                  <Label htmlFor="bank" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Bank
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Input
                      id="bank"
                      ref={bankInputRef}
                      type="text"
                      inputMode="decimal"
                      value={bank}
                      onChange={(e) => {
                        const value = e.target.value;
                        const sanitized = value
                          .replace(/[^0-9.]/g, "")
                          .replace(/(\..*)\./g, "$1");
                        setBank(sanitized === "" ? "" : Number(sanitized || 0));
                      }}
                      onKeyDown={(e) => handlePaymentKeyDown(e, "bank")}
                      className="h-11 w-full pl-10 pr-3 text-base font-medium rounded-lg border border-input bg-background focus-visible:ring-2 focus-visible:ring-primary/20"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Cash Payment */}
                <div className="space-y-2">
                  <Label htmlFor="cash" className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    Cash
                  </Label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                      <Wallet className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Input
                      id="cash"
                      ref={cashInputRef}
                      type="text"
                      inputMode="decimal"
                      value={cash}
                      onChange={(e) => {
                        const value = e.target.value;
                        const sanitized = value
                          .replace(/[^0-9.]/g, "")
                          .replace(/(\..*)\./g, "$1");
                        setCash(sanitized === "" ? "" : Number(sanitized || 0));
                      }}
                      onKeyDown={(e) => handlePaymentKeyDown(e, "cash")}
                      className="h-11 w-full pl-10 pr-3 text-base font-medium rounded-lg border border-input bg-background focus-visible:ring-2 focus-visible:ring-primary/20"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Remaining Balance */}
            <div className="space-y-5">
              <div className="pb-2 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Balance Summary</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Payment status overview</p>
              </div>

              <div
                className={`p-6 rounded-lg border-2 relative overflow-hidden ${totals.remaining > 0
                  ? "bg-gradient-to-br from-amber-50 via-amber-50/50 to-amber-50/30 border-amber-300"
                  : "bg-gradient-to-br from-emerald-50 via-emerald-50/50 to-emerald-50/30 border-emerald-300"
                  }`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    {totals.remaining <= 0 ? (
                      <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center ring-2 ring-emerald-200">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                    ) : null}
                    <div>
                      <span className={`text-sm font-semibold block ${totals.remaining > 0 ? "text-amber-900" : "text-emerald-900"
                        }`}>
                        Remaining Balance
                      </span>
                      <span className={`text-xs ${totals.remaining > 0 ? "text-amber-700/80" : "text-emerald-700/80"
                        }`}>
                        {totals.remaining > 0 ? "Outstanding" : "Paid in full"}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`text-3xl font-bold tabular-nums mb-3 ${totals.remaining > 0
                      ? "text-amber-700"
                      : "text-emerald-700"
                      }`}
                  >
                    {Math.abs(totals.remaining).toFixed(2)}
                  </div>
                  <p className={`text-sm ${totals.remaining > 0
                    ? "text-amber-700/90"
                    : "text-emerald-700/90"
                    }`}>
                    {totals.remaining > 0
                      ? "Outstanding amount to be paid"
                      : "Credit available for future purchases"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar - Modern Design */}
        <div className="px-6 py-5 bg-gradient-to-r from-muted/30 to-muted/20 border-t border-border">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Keyboard Shortcuts */}
            <div className="flex items-center gap-4">
              <div className="text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <kbd className="px-2.5 py-1.5 bg-background rounded-md text-xs font-medium border border-border shadow-sm">
                    Enter
                  </kbd>
                  <span className="text-muted-foreground">Next field</span>
                  <span className="text-muted-foreground/40">•</span>
                  <kbd className="px-2.5 py-1.5 bg-background rounded-md text-xs font-medium border border-border shadow-sm">
                    Ctrl+S
                  </kbd>
                  <span className="text-muted-foreground">Save</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRows([]);
                  setProductPackets({});
                  setTotalBoxes(0);
                  setEnableLogisticsTracking(false);
                  setLogisticsCompanyId("");
                  setExchangeRate("");
                  setPercentage("");
                  setDiscount(0);
                  setCash(0);
                  setBank(0);
                  setError(null);
                }}
                disabled={isSaving}
                className="gap-2 h-11 px-6 border-2 hover:bg-muted/50"
              >
                <X className="h-4 w-4" />
                Reset Form
              </Button>
              <Button
                ref={saveButtonRef}
                type="button"
                onClick={handleSave}
                size="lg"
                className="gap-2 min-w-[160px] h-11 px-6 bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
                disabled={
                  isSaving ||
                  isLoadingSuppliers ||
                  rows.length === 0 ||
                  rows.some(row => !row.minSellingPrice || parseFloat(row.minSellingPrice) <= 0)
                }
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Save Buying
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Add Supplier Dialog */}
      <Dialog open={showAddSupplier} onOpenChange={(open) => {
        if (!open) {
          // Reset form when closing
          setNewSupplierName("");
          setNewSupplierPhone("");
          setNewSupplierPhoneAreaCode("");
          setNewSupplierCompany("");
          setNewSupplierEmail("");
          setNewSupplierAddress("");
          setError(null);
        }
        setShowAddSupplier(open);
      }}>
        <DialogContent className="sm:max-w-md z-[100]">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
            <DialogDescription>
              Create a new supplier to add to your list.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-supplier-name">
                Supplier Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new-supplier-name"
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="Enter supplier name"
                disabled={isCreatingSupplier}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-supplier-phone">
                Phone <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  id="new-supplier-phone-area-code"
                  value={newSupplierPhoneAreaCode}
                  onChange={(e) => {
                    const value = e.target.value;
                    setNewSupplierPhoneAreaCode(value);
                    if (value.length >= 5 && newSupplierPhoneInputRef.current) {
                      newSupplierPhoneInputRef.current.focus();
                    }
                  }}
                  maxLength={5}
                  className="w-24"
                  disabled={isCreatingSupplier}
                />
                <Input
                  ref={newSupplierPhoneInputRef}
                  id="new-supplier-phone"
                  value={newSupplierPhone}
                  onChange={(e) => setNewSupplierPhone(e.target.value)}
                  className="flex-1"
                  disabled={isCreatingSupplier}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-supplier-company">Company</Label>
              <Input
                id="new-supplier-company"
                value={newSupplierCompany}
                onChange={(e) => setNewSupplierCompany(e.target.value)}
                placeholder="Enter company name"
                disabled={isCreatingSupplier}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-supplier-email">
                Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new-supplier-email"
                type="email"
                value={newSupplierEmail}
                onChange={(e) => setNewSupplierEmail(e.target.value)}
                placeholder="Enter supplier email"
                disabled={isCreatingSupplier}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-supplier-address">
                Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="new-supplier-address"
                value={newSupplierAddress}
                onChange={(e) => setNewSupplierAddress(e.target.value)}
                placeholder="Enter supplier address"
                disabled={isCreatingSupplier}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddSupplier(false);
                setNewSupplierName("");
                setNewSupplierPhone("");
                setNewSupplierPhoneAreaCode("");
                setNewSupplierCompany("");
                setNewSupplierEmail("");
                setNewSupplierAddress("");
                setError(null);
              }}
              disabled={isCreatingSupplier}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSupplier}
              disabled={
                isCreatingSupplier ||
                !newSupplierName.trim() ||
                !newSupplierPhone.trim() ||
                !newSupplierEmail.trim() ||
                !newSupplierAddress.trim()
              }
            >
              {isCreatingSupplier ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2"></div>
                  Creating...
                </>
              ) : (
                "Create Supplier"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Gallery - Renders when imageGalleryState is set */}
      {imageGalleryState &&
        (() => {
          const rowId = imageGalleryState.rowId;
          const row = rows.find((r) => r.id === rowId);

          return (
            <ImageGallery
              key={`gallery-${rowId}-${imageGalleryState.images.length}`}
              images={imageGalleryState.images}
              autoOpen={true}
              onClose={() => setImageGalleryState(null)}
              onRemove={(imageId) => {
                const rowImages = imageGalleryState.images;

                if (
                  imageId.startsWith("existing-") ||
                  imageId.startsWith("fallback-")
                ) {
                  const updatedPreviews = { ...imagePreviews };
                  if (updatedPreviews[rowId]) {
                    const newPreviews = { ...updatedPreviews[rowId] };
                    delete newPreviews[imageId];
                    if (Object.keys(newPreviews).length === 0) {
                      delete updatedPreviews[rowId];
                    } else {
                      updatedPreviews[rowId] = newPreviews;
                    }
                  }
                  setImagePreviews(updatedPreviews);
                  setRows((prev) =>
                    prev.map((r) =>
                      r.id === rowId ? { ...r, photo: null, images: [] } : r
                    )
                  );

                  const updatedImages = rowImages.filter(
                    (img) => img.id !== imageId
                  );
                  if (updatedImages.length === 0) {
                    setImageGalleryState(null);
                  } else {
                    setImageGalleryState({
                      ...imageGalleryState,
                      images: updatedImages,
                    });
                  }
                } else {
                  const newFiles = productImages[rowId] || [];
                  const fileToRemove = newFiles.find(
                    (f) => getFileId(f) === imageId
                  );
                  if (fileToRemove) {
                    handleRemoveImage(rowId, fileToRemove);
                    const updatedImages = rowImages.filter(
                      (img) => img.id !== imageId
                    );
                    if (updatedImages.length === 0) {
                      setImageGalleryState(null);
                    } else {
                      setImageGalleryState({
                        ...imageGalleryState,
                        images: updatedImages,
                      });
                    }
                  }
                }
              }}
              onAdd={() => {
                const input = fileInputRefs.current[rowId];
                if (input) {
                  input.setAttribute("multiple", "");
                  input.multiple = true;
                  input.click();
                }
                // Refresh gallery state after adding - wait for FileReader to complete
                const updateGallery = (attempt = 0) => {
                  setTimeout(() => {
                    const existingPreviews = imagePreviews[rowId] || {};
                    const existingImageKeys = Object.keys(
                      existingPreviews
                    ).filter((key) => key.startsWith("existing-"));
                    const newFiles = productImages[rowId] || [];

                    // Check if all new files have previews ready
                    const allPreviewsReady = newFiles.every((file) => {
                      const fileId = getFileId(file);
                      return existingPreviews[fileId];
                    });

                    if (allPreviewsReady || attempt >= 10) {
                      // All previews ready or max attempts reached
                      const updatedImages = [
                        ...existingImageKeys.map((key) => ({
                          id: key,
                          url: existingPreviews[key],
                          isExisting: true,
                        })),
                        ...newFiles.map((file) => {
                          const fileId = getFileId(file);
                          return {
                            id: fileId,
                            url:
                              existingPreviews[fileId] ||
                              URL.createObjectURL(file),
                            isExisting: false,
                            file,
                          };
                        }),
                      ];
                      setImageGalleryState((prev) =>
                        prev ? { ...prev, images: updatedImages } : null
                      );
                    } else {
                      // Retry after 200ms
                      updateGallery(attempt + 1);
                    }
                  }, 200);
                };
                updateGallery();
              }}
              maxImages={20}
              showAddButton={true}
              emptyMessage="No images"
              title={`Product Images - ${row?.productName || row?.productCode || "Product"
                }`}
            />
          );
        })()}

      {/* Packet Configuration Modal */}
      {packetModalOpen && packetModalProduct && (
        <PacketConfigurationModal
          isOpen={packetModalOpen}
          onClose={() => {
            setPacketModalOpen(false);
            setPacketModalProduct(null);
          }}
          onSave={handleSavePackets}
          item={{
            productName:
              packetModalProduct.productName ||
              packetModalProduct.productCode ||
              "Product",
            quantity: packetModalProduct.quantity || 0,
            primaryColor: Array.isArray(packetModalProduct.primaryColor)
              ? packetModalProduct.primaryColor
              : packetModalProduct.primaryColor
                ? [packetModalProduct.primaryColor]
                : [],
            size: Array.isArray(packetModalProduct.size)
              ? packetModalProduct.size
              : packetModalProduct.size
                ? [packetModalProduct.size]
                : [],
            id: String(packetModalProduct.id),
            packets: productPackets[packetModalProduct.id]?.packets || [],
            index: packetModalProduct.index,
          }}
          items={packetModalItems}
          activeItemId={
            packetModalProduct?.id ? String(packetModalProduct.id) : undefined
          }
          initialPackets={productPackets[packetModalProduct.id]?.packets || []}
        />
      )}
    </div>
  );
}
