"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Trash2,
  Package,
  AlertCircle,
  CheckCircle2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Search,
  Circle
} from "lucide-react";
import CompositionEditor from "@/components/forms/CompositionEditor";

/**
 * PacketConfigurationModal
 * Configure packets for multiple dispatch order items
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal open state
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onSave - Save handler (packets, item) => void
 * @param {Array} props.items - List of all product items
 * @param {string} props.activeItemId - ID of the item to start with
 * @param {Object} props.item - Fallback for single item mode
 * @param {Array} props.initialPackets - Fallback for single item mode
 */
export default function PacketConfigurationModal({
  isOpen,
  onClose,
  onSave,
  items = [],
  activeItemId,
  item,
  initialPackets = [],
}) {
  const [packets, setPackets] = useState([]);
  const [expandedPacket, setExpandedPacket] = useState(null);
  const [packetsByItem, setPacketsByItem] = useState({});
  const [activeId, setActiveId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [skipConfigured, setSkipConfigured] = useState(false);

  // 'packets' or 'loose'
  const [configMode, setConfigMode] = useState("packets");

  // Normalize incoming items
  const normalizedItems = useMemo(() => {
    const source = items && items.length ? items : item ? [item] : [];
    return source.map((it, idx) => {
      const colors = Array.isArray(it.primaryColor) ? it.primaryColor : (it.primaryColor ? [it.primaryColor] : []);
      const sizes = Array.isArray(it.size) ? it.size : (it.size ? [it.size] : []);
      return {
        id: String(it.id ?? it._id ?? it.productId ?? it.index ?? idx),
        index: it.index ?? idx,
        productName: it.productName || it.productCode || `Product ${idx + 1}`,
        productCode: it.productCode,
        quantity: it.quantity || 0,
        primaryColor: colors,
        size: sizes,
        packets: it.packets || [],
        configMode: it.configMode || (it.packets && it.packets.length === 1 && it.packets[0].isLoose ? "loose" : "packets"),
      };
    });
  }, [items, item]);

  // Build initial packet map when modal opens
  // IMPORTANT: Only run when isOpen changes to true. 
  // We do NOT want to re-run this when parent props update (e.g. during Save) 
  // as it would reset the local state and navigation.
  useEffect(() => {
    if (isOpen) {
      const initialMap = {};
      normalizedItems.forEach((it, idx) => {
        // Use existing packets from item, or initialPackets if provided (legacy/single mode)
        const basePackets = (initialPackets.length > 0 && idx === 0 && !it.packets?.length)
          ? initialPackets
          : it.packets || [];

        initialMap[it.id] = basePackets.map((p, pIdx) => ({
          packetNumber: p.packetNumber || pIdx + 1,
          totalItems: p.totalItems || 0,
          composition: p.composition || [],
          isLoose: p.isLoose || false,
        }));
      });

      setPacketsByItem(initialMap);

      const startId = activeItemId
        ? String(activeItemId)
        : normalizedItems[0]?.id || null;
      setActiveId(startId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // When active item changes or map updates, load packets for that item
  useEffect(() => {
    if (!activeId) return;
    const currentPackets = packetsByItem[activeId];

    if (currentPackets && currentPackets.length) {
      // Check if it was saved as loose items
      const isLoose = currentPackets.some(p => p.isLoose);
      setConfigMode(isLoose ? "loose" : "packets");

      setPackets(
        currentPackets.map((p, index) => ({
          packetNumber: p.packetNumber || index + 1,
          totalItems: p.totalItems || 0,
          composition: p.composition || [],
          isLoose: p.isLoose || false,
        }))
      );
      setExpandedPacket("packet-1");
    } else {
      // Default new items to packets mode
      setConfigMode("packets");
      setPackets([
        {
          packetNumber: 1,
          totalItems: 0,
          composition: [],
          isLoose: false,
        },
      ]);
      setExpandedPacket("packet-1");
    }
  }, [activeId, packetsByItem]);

  // Handle mode switching
  const handleModeChange = (targetMode) => {
    if (targetMode === configMode) return;

    // Logic to convert existing packets when switching
    let newPackets = [];

    if (targetMode === "loose") {
      // Switch TO Loose Mode: Merge all existing
      const allComposition = [];
      packets.forEach(p => {
        if (p.composition) {
          p.composition.forEach(c => {
            const existing = allComposition.find(x => x.color === c.color && x.size === c.size);
            if (existing) {
              existing.quantity = (parseInt(existing.quantity) || 0) + (parseInt(c.quantity) || 0);
            } else {
              allComposition.push({ ...c }); // Spread to avoid ref issues
            }
          });
        }
      });

      const total = allComposition.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
      newPackets = [{
        packetNumber: 1,
        totalItems: total,
        composition: allComposition,
        isLoose: true
      }];
    } else {
      // Switch TO Packets Mode
      // If we have 1 loose packet, keep it but unmark loose
      if (packets.length === 1) {
        newPackets = [{ ...packets[0], isLoose: false }];
      } else if (packets.length > 1) {
        newPackets = packets.map(p => ({ ...p, isLoose: false }));
      } else {
        newPackets = [{ packetNumber: 1, totalItems: 0, composition: [], isLoose: false }];
      }
    }

    // Critical: Update both states synchronously in the handler's scope
    setConfigMode(targetMode);
    setPackets(newPackets);
  };

  // Derived filtered list for navigation
  const filteredItems = useMemo(() => {
    return normalizedItems.filter((it) => {
      const configured = (packetsByItem[it.id] || []).length > 0;
      // If skipConfigured is true, hide configured items unless it's the active one
      if (skipConfigured && configured && it.id !== activeId) return false;

      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        (it.productName || "").toLowerCase().includes(term) ||
        (it.productCode || "").toLowerCase().includes(term)
      );
    });
  }, [normalizedItems, searchTerm, skipConfigured, packetsByItem, activeId]);

  // Ensure active item ensures validity
  useEffect(() => {
    // If activeId becomes invalid (e.g. filtered out and not handled), reset to first valid
    // But we only want to do this if activeId is actually gone from the view
    if (!activeId && filteredItems.length > 0) {
      setActiveId(filteredItems[0].id);
    } else if (activeId && filteredItems.length > 0 && !filteredItems.find(it => it.id === activeId)) {
      // If current active ID is not in filtered list, jump to first
      // However, we must be careful: if we are viewing it, it should be in filter due to logic in useMemo
      // The useMemo logic says "if (skipConfigured && configured && it.id !== activeId) return false"
      // So activeId should ALWAYS be in filteredItems if it exists in normalizedItems
      setActiveId(filteredItems[0].id);
    }
  }, [filteredItems, activeId]);

  // Calculate totals
  const calculateTotalItems = () => {
    return packets.reduce((sum, packet) => sum + (parseInt(packet.totalItems) || 0), 0);
  };

  const totalItemsInPackets = calculateTotalItems();
  const activeItem = filteredItems.find((it) => it.id === activeId) || normalizedItems.find((it) => it.id === activeId);

  if (!isOpen || !activeItem) return null;

  const expectedTotal = activeItem?.quantity || 0;
  const isValid = totalItemsInPackets === parseInt(expectedTotal);

  // Handlers
  const handleCompositionChange = (packetIndex, composition) => {
    const newPackets = [...packets];
    if (!newPackets[packetIndex]) return;

    newPackets[packetIndex].composition = composition;
    const total = composition.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
    newPackets[packetIndex].totalItems = total;
    setPackets(newPackets);
  };

  const addPacket = () => {
    const nextNumber = packets.length + 1;
    setPackets([
      ...packets,
      {
        packetNumber: nextNumber,
        totalItems: 0,
        composition: [],
        isLoose: false,
      },
    ]);
    setExpandedPacket(`packet-${nextNumber}`);
  };

  const removePacket = (index) => {
    if (packets.length > 1) {
      const newPackets = packets.filter((_, i) => i !== index);
      newPackets.forEach((packet, i) => {
        packet.packetNumber = i + 1;
      });
      setPackets(newPackets);
    }
  };

  const handleDuplicatePacket = (packetIndex) => {
    const packetToDuplicate = packets[packetIndex];
    if (!packetToDuplicate) return;

    const newPacket = {
      packetNumber: packets.length + 1,
      totalItems: packetToDuplicate.totalItems,
      composition: packetToDuplicate.composition.map(comp => ({ ...comp })),
      isLoose: false,
    };

    const updatedPackets = [...packets, newPacket];
    setPackets(updatedPackets);
    setExpandedPacket(`packet-${newPacket.packetNumber}`);
  };

  const handleSave = () => {
    if (!activeItem) return;

    // Clean up and save
    const cleanPackets = packets.map((packet) => ({
      packetNumber: packet.packetNumber,
      totalItems: parseInt(packet.totalItems) || 0,
      composition: packet.composition
        .filter((item) => item.size && item.color && item.quantity)
        .map((item) => ({
          size: item.size.trim(),
          color: item.color.trim(),
          quantity: parseInt(item.quantity) || 0,
        })),
      isLoose: configMode === "loose",
    }));

    const updatedMap = {
      ...packetsByItem,
      [activeItem.id]: cleanPackets,
    };
    setPacketsByItem(updatedMap);
    onSave(cleanPackets, activeItem);

    // Navigate to next
    const currentIndex = filteredItems.findIndex(it => it.id === activeItem.id);
    if (currentIndex >= 0 && currentIndex < filteredItems.length - 1) {
      setActiveId(filteredItems[currentIndex + 1].id);
    }
    // If last item, stay there (user can close manually)
  };

  const availableColors = Array.isArray(activeItem.primaryColor) ? activeItem.primaryColor : [];
  const availableSizes = Array.isArray(activeItem.size) ? activeItem.size : [];

  const configuredCount = Object.values(packetsByItem).filter((p) => p && p.length > 0).length;

  // Determine index logic for display and navigation
  const currentIndex = filteredItems.findIndex((it) => it.id === activeItem.id);
  const currentPosition = currentIndex >= 0 ? currentIndex + 1 : 1;
  const totalVisible = filteredItems.length;

  const prevItem = currentIndex > 0 ? filteredItems[currentIndex - 1] : null;
  const nextItem = currentIndex >= 0 && currentIndex < filteredItems.length - 1 ? filteredItems[currentIndex + 1] : null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Configure Packets"
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" onClick={handleSave}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Save & Next
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Navigation & Toolbar */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Package className="h-4 w-4 text-blue-500" />
              <div className="flex flex-col">
                <span className="font-semibold">{activeItem.productName}</span>
                {activeItem.productCode && (
                  <span className="text-xs text-slate-500">[{activeItem.productCode}]</span>
                )}
              </div>
            </div>
            <div className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
              {currentPosition} of {totalVisible} • Configured {configuredCount}/{normalizedItems.length}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => prevItem && setActiveId(prevItem.id)}
              disabled={!prevItem}
              className="gap-1 h-8"
              title="Previous Item"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => nextItem && setActiveId(nextItem.id)}
              disabled={!nextItem}
              className="gap-1 h-8"
              title="Next Item"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters and Mode Switch Row */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className="md:col-span-1 lg:col-span-1 relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-1 lg:col-span-2 flex flex-col md:flex-row gap-3 items-center justify-end">
            {/* Mode Switcher */}
            <div className="bg-slate-100 p-1 rounded-lg flex items-center">
              <button
                type="button"
                onClick={() => handleModeChange("packets")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${configMode === "packets"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Packets
              </button>
              <button
                type="button"
                onClick={() => handleModeChange("loose")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${configMode === "loose"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Loose Items
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={skipConfigured}
                onChange={(e) => setSkipConfigured(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Skip configured</span>
            </label>
          </div>
        </div>

        {/* Product Summary Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pb-1">
          <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-3 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Target Quantity</h3>
              <p className="text-xs text-slate-500 mt-1">
                {configMode === "loose" ? "Configure total breakdown below" : "Configure packets to match total"}
              </p>
            </div>
            <div className="text-xl font-bold text-blue-700">
              {expectedTotal} <span className="text-sm font-normal text-slate-600">items</span>
            </div>
          </div>

          <div className={`p-3 rounded-lg border shadow-sm flex items-center justify-between ${isValid
            ? "border-green-200 bg-green-50"
            : "border-orange-200 bg-orange-50"
            }`}>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">
                {configMode === "loose" ? "Items Configured" : "In Packets"}
              </h3>
              {!isValid && (
                <p className="text-xs mt-0.5 text-slate-600">
                  {totalItemsInPackets < expectedTotal
                    ? `Add ${expectedTotal - totalItemsInPackets} more`
                    : `Remove ${totalItemsInPackets - expectedTotal}`}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xl font-bold ${isValid ? "text-green-600" : "text-orange-600"
                }`}>
                {totalItemsInPackets}
              </span>
              {isValid ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-orange-600" />
              )}
            </div>
          </div>
        </div>

        {/* Configuration Area */}
        <div className="space-y-3">
          {configMode === "packets" ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Packets ({packets.length})</h3>
                <Button type="button" variant="outline" size="sm" onClick={addPacket}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Packet
                </Button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {packets.map((packet, index) => {
                  const isExpanded = expandedPacket === `packet-${packet.packetNumber}`;

                  return (
                    <div
                      key={index}
                      className="border border-slate-200 rounded-lg overflow-hidden"
                    >
                      {/* Packet Header */}
                      <div className="px-4 py-3 bg-white flex items-center justify-between">
                        <button
                          type="button"
                          className="flex items-center gap-2 hover:text-blue-600 transition-colors flex-1 text-left"
                          onClick={() => setExpandedPacket(isExpanded ? null : `packet-${packet.packetNumber}`)}
                        >
                          <Package className="h-4 w-4 text-slate-500" />
                          <span className="font-medium">Packet #{packet.packetNumber}</span>
                          <span className="text-sm text-slate-600 ml-2">
                            ({packet.totalItems} items)
                          </span>
                        </button>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDuplicatePacket(index)}
                            className="h-8 w-8 p-0"
                            title="Duplicate this packet"
                          >
                            <Copy className="h-4 w-4 text-slate-500" />
                          </Button>
                          {packets.length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => removePacket(index)}
                              className="h-8 w-8 p-0 hover:text-red-600"
                              title="Remove this packet"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Packet Content */}
                      {isExpanded && (
                        <div className="px-4 pb-4 bg-white border-t border-slate-200">
                          <div className="space-y-4 mt-4">
                            <div>
                              <Label className="text-sm font-medium mb-2 block">
                                Packet Composition
                              </Label>
                              <CompositionEditor
                                composition={packet.composition}
                                onChange={(comp) => handleCompositionChange(index, comp)}
                                expectedTotal={0}
                                availableSizes={availableSizes}
                                availableColors={availableColors}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {packets.length === 0 && (
                  <div className="text-center py-8 text-slate-500 border border-dashed border-slate-300 rounded-lg">
                    No packets configured. Click "Add Packet" to start.
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Loose Items Mode */}
              <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <h3 className="font-medium text-slate-800 flex items-center gap-2">
                    <Circle className="h-4 w-4 text-blue-500 fill-current" />
                    Loose Items Configuration
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Define the total breakdown of colors and sizes for this product.
                  </p>
                </div>
                <div className="p-4">
                  {packets.length > 0 && (
                    <CompositionEditor
                      composition={packets[0].composition}
                      onChange={(comp) => handleCompositionChange(0, comp)}
                      expectedTotal={0}
                      availableSizes={availableSizes}
                      availableColors={availableColors}
                    />
                  )}
                  {packets.length === 0 && (
                    <div className="text-sm text-red-500">
                      Error: No packet container initialized. Please switch modes to reset.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
