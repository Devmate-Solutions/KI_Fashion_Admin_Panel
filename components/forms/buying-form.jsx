"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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
import { useSupplierUsers } from "@/lib/hooks/useSupplierUsers";

// A multi-section buying form: supplier/metadata, products cart, and payment summary.
// Enhanced with keyboard shortcuts and better UX
// Integrated with backend APIs for suppliers and purchases

export default function BuyingForm({ initialSuppliers = [], onSave }) {
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
    new Date().toISOString().split("T")[0]
  );
  const [exchangeRate, setExchangeRate] = useState(1.0);
  const [percentage, setPercentage] = useState(0);

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

    try {
      setIsCreatingSupplier(true);
      setError(null);

      // Create supplier with minimal fields (name and phone)
      const response = await suppliersAPI.create({
        name: newSupplierName.trim(),
        phone: newSupplierPhone.trim(),
        phoneAreaCode: newSupplierPhoneAreaCode.trim() || undefined,
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
      photo: null,
    };
    setRows((r) => [...r, newRow]);
  }

  function updateRow(id, field, value) {
    setRows((r) =>
      r.map((row) => {
        if (row.id !== id) return row;

        const updated = { ...row, [field]: value };

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
        const exRate = Number(exchangeRate || 1);
        const percent = Number(percentage || 0);

        // Calculations (matching confirm order page):
        // Supplier Payment Amount = costPrice (NO exchange rate, NO profit margin) - what admin pays supplier in supplier currency
        const supplierPaymentAmount = costPrice;
        const supplierPaymentTotal = supplierPaymentAmount * quantity;

        // Landed Price = (Cost Price / Exchange Rate) × (1 + Percentage/100) - for inventory valuation in base currency
        const landedPrice = (costPrice / exRate) * (1 + percent / 100);
        const landedTotal = landedPrice * quantity;

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
          const exRate = Number(exchangeRate || 1);
          const percent = Number(percentage || 0);

          // Supplier Payment Amount (what admin pays supplier - NO exchange rate, NO profit margin)
          // Formula: costPrice × quantity (in supplier currency)
          const supplierPaymentAmount = costPrice;
          const supplierPaymentTotal = supplierPaymentAmount * quantity;

          // Landed Price (for inventory valuation - WITH profit margin)
          // Formula: (cost price / exchange rate) × (1 + percentage/100)
          const landedPrice = (costPrice / exRate) * (1 + percent / 100);
          const landedTotal = landedPrice * quantity;

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
        return (
          !row.productName ||
          !row.productCode ||
          !row.season ||
          row.season.length === 0 ||
          !row.costPrice ||
          isNaN(costPrice) ||
          costPrice <= 0 ||
          !row.quantity ||
          isNaN(quantity) ||
          quantity <= 0
        );
      }
    );

    if (invalidRows.length > 0) {
      setError(
        "Please fill in product name, code, season, cost price, and quantity for all rows"
      );
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

          // If no productId but we have product name or code, try to find it
          if (!productId && (row.productName || row.productCode)) {
            try {
              // Try lookup by code first
              if (row.productCode) {
                try {
                  const codeResponse = await productsAPI.lookupByCode(
                    row.productCode
                  );
                  const product = codeResponse.data?.data || codeResponse.data;
                  if (product) {
                    productId = product._id || product.id;
                  }
                } catch (codeErr) {
                  // Code lookup failed, try name search
                  if (row.productName) {
                    const nameResponse = await productsAPI.search(
                      row.productName
                    );
                    const productsList =
                      nameResponse.data?.data || nameResponse.data || [];
                    const product =
                      productsList.find(
                        (p) =>
                          p.name?.toLowerCase() ===
                          row.productName.trim().toLowerCase()
                      ) || productsList[0];
                    if (product) {
                      productId = product._id || product.id;
                    }
                  }
                }
              } else if (row.productName) {
                // Try name search
                const nameResponse = await productsAPI.search(row.productName);
                const productsList =
                  nameResponse.data?.data || nameResponse.data || [];
                const product =
                  productsList.find(
                    (p) =>
                      p.name?.toLowerCase() ===
                      row.productName.trim().toLowerCase()
                  ) || productsList[0];
                if (product) {
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
          const exRate = Number(exchangeRate || 1);
          const percent = Number(percentage || 0);
          const quantity = Number(row.quantity);

          // Supplier Payment Amount (what admin pays supplier - NO exchange rate, NO profit margin)
          // Formula: costPrice × quantity (in supplier currency)
          const supplierPaymentAmount = costPrice;
          const supplierPaymentTotal = supplierPaymentAmount * quantity;

          // Landed Price (for inventory valuation - WITH profit margin)
          // Formula: (cost price / exchange rate) × (1 + percentage/100)
          const landedPrice = (costPrice / exRate) * (1 + percent / 100);
          const landedTotal = landedPrice * quantity;

          // Build item payload according to manualEntryItemSchema
          // Allowed fields: product, productName, productCode, productType, costPrice, primaryColor, size, material, description, productImage, quantity, landedTotal
          const itemPayload = {
            product: productId,
            quantity: quantity,
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

          // primaryColor can be array or string
          if (Array.isArray(row.primaryColor) && row.primaryColor.length > 0) {
            itemPayload.primaryColor = row.primaryColor;
          } else if (
            typeof row.primaryColor === "string" &&
            row.primaryColor.trim()
          ) {
            itemPayload.primaryColor = row.primaryColor.trim();
          }

          // size can be array or string
          if (Array.isArray(row.size) && row.size.length > 0) {
            itemPayload.size = row.size;
          } else if (typeof row.size === "string" && row.size.trim()) {
            itemPayload.size = row.size.trim();
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
          if (packetConfig && packetConfig.useVariantTracking) {
            itemPayload.useVariantTracking = true;
            itemPayload.packets = packetConfig.packets || [];
          }

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

      const payload = {
        supplier: supplierId, // Use supplier ID directly
        purchaseDate: invoiceDate,
        exchangeRate: Number(exchangeRate || 1),
        percentage: Number(percentage || 0),
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

      {/* Section 1: Metadata - Removed TC field */}
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold mb-4">Buying Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label htmlFor="invoice-date">Invoice Date</Label>
            <Input
              id="invoice-date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exchange-rate">Exchange Rate</Label>
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
            />
            <p className="text-xs text-muted-foreground">
              Rate to convert supplier currency to base currency (£)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="percentage">Percentage (%)</Label>
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier</Label>
            <div className="flex gap-2">
              <Select
                value={supplierId || undefined}
                onValueChange={setSupplierId}
                disabled={isLoadingSuppliers}
              >
                <SelectTrigger id="supplier" className="flex-1">
                  <SelectValue
                    placeholder={
                      isLoadingSuppliers ? "Loading..." : "Select supplier..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
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
                disabled={isLoadingSuppliers}
              >
                <UserPlusIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2 mb-2">
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
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="enable-logistics" className="text-sm font-medium cursor-pointer">
                Enable Logistics Tracking
              </Label>
            </div>
            {enableLogisticsTracking && (
              <>
                <Label htmlFor="logistics-company">
                  Logistics Company
                </Label>
                <Select
                  value={logisticsCompanyId || undefined}
                  onValueChange={(value) => setLogisticsCompanyId(value || "")}
                  disabled={isLoadingLogisticsCompanies}
                >
                  <SelectTrigger id="logistics-company">
                    <SelectValue
                      placeholder={
                        isLoadingLogisticsCompanies
                          ? "Loading..."
                          : "Select company .."
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
              </>
            )}
          </div>
        </div>
      </section>

      {/* Section 2: Products Cart - Fully Editable Table */}
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Products</h2>
          <Button type="button" onClick={addRow} size="sm" className="gap-2">
            <PlusIcon className="h-4 w-4" />
            Add Product
          </Button>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b">
                <th className="text-left p-3 font-medium min-w-[150px]">
                  Name
                </th>
                <th className="text-left p-3 font-medium min-w-[120px]">
                  Code
                </th>
                <th className="text-left p-3 font-medium min-w-[80px]">
                  Image
                </th>
                <th className="text-left p-3 font-medium min-w-[150px]">
                  Season
                </th>
                <th className="text-right p-3 font-medium min-w-[100px]">
                  Cost Price
                </th>
                <th className="text-left p-3 font-medium min-w-[100px]">
                  Primary Color
                </th>
                <th className="text-left p-3 font-medium min-w-[100px]">
                  Size
                </th>
                <th className="text-right p-3 font-medium min-w-[100px]">
                  Total Quantity
                </th>
                <th className="text-center p-3 font-medium min-w-[120px]">
                  Packet Config
                </th>
                <th className="text-center p-3 font-medium w-20">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm">No products added yet</p>
                      <p className="text-xs">
                        Click "Add Product" to get started
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b hover:bg-muted/30 transition-colors"
                >
                  {/* Name */}
                  <td className="p-2">
                    <Input
                      value={row.productName}
                      onChange={(e) => {
                        updateRow(row.id, "productName", e.target.value);
                      }}
                      placeholder="Enter product name"
                      className="h-8 text-sm"
                    />
                  </td>

                  {/* Code */}
                  <td className="p-2">
                    <Input
                      value={row.productCode}
                      onChange={(e) => {
                        updateRow(row.id, "productCode", e.target.value);
                      }}
                      placeholder="Enter product code"
                      className="h-8 text-sm"
                    />
                  </td>

                  {/* Image - Compact display with 1 tile */}
                  <td className="p-2 w-[100px]">
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
                                  alt="Product image"
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
                  <td className="p-2 relative">
                    <div className="min-w-[180px]">
                      <MultiSelect
                        options={SEASON_OPTIONS}
                        value={Array.isArray(row.season) ? row.season : []}
                        onChange={(selectedSeasons) =>
                          updateRow(row.id, "season", selectedSeasons)
                        }
                        placeholder="Select seasons"
                        disabled={isSaving}
                        className="w-full"
                      />
                    </div>
                  </td>

                  {/* Cost Price */}
                  <td className="p-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={row.costPrice === 0 ? "" : String(row.costPrice || "")}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers and one decimal point
                        let sanitized = value
                          .replace(/[^0-9.]/g, "")
                          .replace(/(\..*)\./g, "$1");
                        // Prevent just "." from being stored (allow ".5" but not standalone ".")
                        if (sanitized === ".") {
                          sanitized = "";
                        }
                        updateRow(
                          row.id,
                          "costPrice",
                          sanitized === "" ? "" : sanitized
                        );
                      }}
                      className="h-8 text-sm text-right tabular-nums"
                    />
                  </td>

                  {/* Primary Color - Always visible input */}
                  <td className="p-2">
                    <div className="space-y-2">
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
                          placeholder="Enter color and press Enter"
                          className="h-8 text-sm"
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
                          <div className="flex flex-wrap gap-1">
                            {row.primaryColor.slice(0, 2).map((color, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs max-w-[80px] truncate"
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
                                  className="hover:text-blue-600 flex-shrink-0"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </span>
                            ))}
                            {row.primaryColor.length > 2 && (
                              <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                                +{row.primaryColor.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                    </div>
                  </td>

                  {/* Size - Always visible input */}
                  <td className="p-2">
                    <div className="space-y-2">
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
                          placeholder="Enter size and press Enter"
                          className="h-8 text-sm"
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
                        <div className="flex flex-wrap gap-1">
                          {row.size.slice(0, 2).map((size, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs max-w-[80px] truncate"
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
                                className="hover:text-green-600 flex-shrink-0"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </span>
                          ))}
                          {row.size.length > 2 && (
                            <span className="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                              +{row.size.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Total Quantity */}
                  <td className="p-2">
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={row.quantity === 0 ? "" : String(row.quantity || "")}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers and a single decimal point
                        let sanitized = value
                          .replace(/[^0-9.]/g, "")
                          .replace(/(\..*)\./g, "$1");
                        // Prevent just "." from being stored (allow ".5" but not standalone ".")
                        if (sanitized === ".") {
                          sanitized = "";
                        }
                        updateRow(
                          row.id,
                          "quantity",
                          sanitized === "" ? "" : sanitized
                        );
                      }}
                      className="h-8 text-sm text-right tabular-nums"
                    />
                  </td>

                  {/* Packet Configuration */}
                  <td className="p-2 text-center">
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
                      className="h-8 text-xs"
                      title="Configure packets"
                    >
                      {productPackets[row.id]?.useVariantTracking ? (
                        <span className="text-green-600">Configured</span>
                      ) : (
                        <span>Configure</span>
                      )}
                    </Button>
                  </td>

                  {/* Action */}
                  <td className="p-2 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRow(row.id)}
                      className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                      title="Remove row"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            <kbd className="px-2 py-1 bg-muted rounded text-xs">Tab</kbd> to
            navigate between fields
          </div>
        )}
      </section>

      {/* Box Management Section - Only shown when logistics tracking is enabled */}
      {rows.length > 0 && enableLogisticsTracking && (
        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-base font-semibold mb-4">Box Management</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="total-boxes">Number of Boxes</Label>
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
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                All products in this order will be organized into these boxes
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Section 3: Payment Summary - Enhanced UX */}
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <h2 className="text-base font-semibold mb-4">Payment Summary</h2>

        {/* Pricing Breakdown */}
        <div className="mb-6 p-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700">
          <h3 className="text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
            Pricing Breakdown
          </h3>
          {rows.length > 0 && (
            <div className="space-y-1 mb-3">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex justify-between items-center text-xs py-1 px-2 bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Product Name:
                    </span>
                    <span
                      className="truncate"
                      title={row.productName || row.productCode}
                    >
                      {row.productName || row.productCode || "Product"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-300 dark:border-slate-600">
            <div>
              <div className="text-xs text-muted-foreground">Landed:</div>
              <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
                {totals.landedPriceTotal.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">
                Landed Total (Inventory)
              </div>
              <div className="text-base font-semibold text-blue-700 dark:text-blue-400">
                {totals.grandTotal.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Left: Calculated totals */}
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-md">
              <span className="text-sm font-medium">
                Supplier Payment Amount
              </span>
              <span className="text-lg font-semibold tabular-nums">
                {totals.supplierPaymentTotal.toFixed(2)}
              </span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-950/30 rounded-md">
                <span className="text-sm font-medium">Discount</span>
                <span className="text-lg font-semibold tabular-nums text-red-700 dark:text-red-400">
                  -{totals.discountAmount.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-950/30 rounded-md border-2 border-blue-200 dark:border-blue-900">
              <span className="text-sm font-medium">Final Amount</span>
              <span className="text-lg font-semibold tabular-nums text-blue-700 dark:text-blue-400">
                {totals.supplierPaymentAfterDiscount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-md">
              <span className="text-sm font-medium text-muted-foreground">
                Landed Total
              </span>
              <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                {totals.grandTotal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Middle: Input fields */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="discount">Discount</Label>
              <Input
                id="discount"
                type="text"
                inputMode="decimal"
                value={discount}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow only numbers and one decimal point
                  const sanitized = value
                    .replace(/[^0-9.]/g, "")
                    .replace(/(\..*)\./g, "$1");
                  setDiscount(sanitized === "" ? "" : Number(sanitized || 0));
                }}
                onKeyDown={(e) => handlePaymentKeyDown(e, "discount")}
                className="text-lg"
              />
              <p className="text-xs text-muted-foreground">
                Applied to supplier payment amount
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cash">Cash Payment</Label>
              <Input
                id="cash"
                ref={cashInputRef}
                type="text"
                inputMode="decimal"
                value={cash}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow only numbers and one decimal point
                  const sanitized = value
                    .replace(/[^0-9.]/g, "")
                    .replace(/(\..*)\./g, "$1");
                  setCash(sanitized === "" ? "" : Number(sanitized || 0));
                }}
                onKeyDown={(e) => handlePaymentKeyDown(e, "cash")}
                className="text-lg"
              />
            </div>
          </div>

          {/* Right: More inputs and remaining */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="bank">Bank Payment</Label>
              <Input
                id="bank"
                ref={bankInputRef}
                type="text"
                inputMode="decimal"
                value={bank}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow only numbers and one decimal point
                  const sanitized = value
                    .replace(/[^0-9.]/g, "")
                    .replace(/(\..*)\./g, "$1");
                  setBank(sanitized === "" ? "" : Number(sanitized || 0));
                }}
                onKeyDown={(e) => handlePaymentKeyDown(e, "bank")}
                className="text-lg"
              />
            </div>
            <div
              className={`flex justify-between items-center p-3 rounded-md border-2 ${totals.remaining > 0
                ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900"
                : "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
                }`}
            >
              <span className="text-sm font-medium">
                {totals.remaining >= 0
                  ? "Remaining Balance"
                  : "Overpaid (Credit)"}
              </span>
              <span
                className={`text-lg font-bold tabular-nums ${totals.remaining > 0
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-green-700 dark:text-green-400"
                  }`}
              >
                {Math.abs(totals.remaining).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd>
              <span>Next field</span>
              <span className="text-muted-foreground/50">•</span>
              <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl+S</kbd>
              <span>Save</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRows([]);
                setTotalBoxes(0);
                setEnableLogisticsTracking(false);
                setLogisticsCompanyId("");
                setDiscount(0);
                setCash(0);
                setBank(0);
                setError(null);
              }}
              disabled={isSaving}
            >
              Reset Form
            </Button>
            <Button
              ref={saveButtonRef}
              type="button"
              onClick={handleSave}
              size="lg"
              className="gap-2 min-w-[140px]"
              disabled={isSaving || isLoadingSuppliers}
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                "Save Buying"
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* Add Supplier Dialog */}
      <Dialog open={showAddSupplier} onOpenChange={setShowAddSupplier}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
          </DialogHeader>
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
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddSupplier(false);
                setNewSupplierName("");
                setNewSupplierPhone("");
                setNewSupplierPhoneAreaCode("");
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
                !newSupplierPhone.trim()
              }
            >
              {isCreatingSupplier ? "Creating..." : "Create Supplier"}
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
