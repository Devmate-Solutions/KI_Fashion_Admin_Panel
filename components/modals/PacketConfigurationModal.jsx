"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  Package,
  AlertCircle,
  CheckCircle2,
  Copy,
  Circle,
  Layers
} from "lucide-react";
import CompositionEditor from "@/components/forms/CompositionEditor";

/**
 * PacketConfigurationModal
 * Configure packets for a single order item
 * * @param {Object} props
 * @param {boolean} props.isOpen - Modal open state
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onSave - Save handler (packets, item) => void
 * @param {Array} props.items - List of all product items (kept for backward compatibility, but we only use activeItem)
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
  const [localError, setLocalError] = useState(null);

  // null = Not selected yet | 'packets' = multiple packets | 'loose' = loose items
  const [configMode, setConfigMode] = useState(null);

  // Extract the single active item we are currently editing
  const activeItem = useMemo(() => {
    if (items && items.length && activeItemId != null) {
      return items.find(
        (it) => String(it.id) === String(activeItemId) || String(it.index) === String(activeItemId)
      );
    }
    return item || (items && items.length > 0 ? items[0] : null);
  }, [items, activeItemId, item]);

  // Build initial state when modal opens
  useEffect(() => {
    if (isOpen && activeItem) {
      // Prioritize item.packets over initialPackets if available
      const basePackets = (activeItem.packets && activeItem.packets.length > 0) 
        ? activeItem.packets 
        : initialPackets;

      if (basePackets.length > 0) {
        // Load existing configuration
        const isLoose = basePackets.some(p => p.isLoose);
        setConfigMode(isLoose ? "loose" : "packets");
        
        // Deep copy to ensure complete isolation
        setPackets(
          basePackets.map((p, pIdx) => ({
            packetNumber: p.packetNumber || pIdx + 1,
            totalItems: parseInt(p.totalItems || p.totalItemsPerPacket) || 0,
            composition: (p.composition || []).map(comp => ({
              size: String(comp.size || '').trim(),
              color: String(comp.color || '').trim(),
              quantity: parseInt(comp.quantity) || 0,
            })),
            isLoose: Boolean(p.isLoose),
          }))
        );
        setExpandedPacket("packet-1");
      } else {
        // No existing configuration -> Force user to choose mode
        setConfigMode(null);
        setPackets([]);
        setExpandedPacket(null);
      }
      setLocalError(null);
    } else if (!isOpen) {
      // Reset state when modal closes
      setConfigMode(null);
      setPackets([]);
      setExpandedPacket(null);
      setLocalError(null);
    }
  }, [isOpen, activeItem?.id]); 

  // Handle explicit initial mode selection or switching modes
  const handleModeChange = (targetMode) => {
    if (targetMode === configMode) return;

    let newPackets = [];

    if (targetMode === "loose") {
      // Switch TO Loose Mode: Merge all existing packets into one
      const allComposition = [];
      packets.forEach(p => {
        if (p.composition) {
          p.composition.forEach(c => {
            const existing = allComposition.find(x => x.color === c.color && x.size === c.size);
            if (existing) {
              existing.quantity = (parseInt(existing.quantity) || 0) + (parseInt(c.quantity) || 0);
            } else {
              allComposition.push({ ...c });
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
      if (packets.length === 1) {
        newPackets = [{ ...packets[0], isLoose: false }];
      } else if (packets.length > 1) {
        newPackets = packets.map(p => ({ ...p, isLoose: false }));
      } else {
        newPackets = [{ packetNumber: 1, totalItems: 0, composition: [], isLoose: false }];
      }
    }

    setConfigMode(targetMode);
    setPackets(newPackets);
    if (targetMode === "packets") {
      setExpandedPacket("packet-1");
    }
    setLocalError(null);
  };

  const calculateTotalItems = () => {
    return packets.reduce((sum, packet) => sum + (parseInt(packet.totalItems) || 0), 0);
  };

  if (!isOpen || !activeItem) return null;

  const expectedTotal = activeItem.quantity || 0;
  const totalItemsInPackets = calculateTotalItems();
  const isValid = totalItemsInPackets === parseInt(expectedTotal);

  const availableColors = Array.isArray(activeItem.primaryColor) 
    ? activeItem.primaryColor 
    : (activeItem.primaryColor ? [activeItem.primaryColor] : []);
    
  const availableSizes = Array.isArray(activeItem.size) 
    ? activeItem.size 
    : (activeItem.size ? [activeItem.size] : []);

  // Handlers
  const handleCompositionChange = (packetIndex, composition) => {
    const newPackets = [...packets];
    if (!newPackets[packetIndex]) return;

    newPackets[packetIndex].composition = composition;
    const total = composition.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
    newPackets[packetIndex].totalItems = total;
    setPackets(newPackets);
    setLocalError(null);
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
    setLocalError(null);

    const totalItemsInPackets = calculateTotalItems();
    const expectedTotal = parseInt(activeItem?.quantity || 0);

    // Hard validation against target quantity
    if (totalItemsInPackets !== expectedTotal) {
      setLocalError(`Total quantity (${totalItemsInPackets}) must match target (${expectedTotal})`);
      return;
    }

    // Check if any packet is empty
    const hasEmptyPacket = packets.some(p => !p.composition || p.composition.length === 0);
    if (hasEmptyPacket) {
      setLocalError("Each packet must have at least one color/size configuration");
      return;
    }

    // Clean up and save
    const cleanPackets = packets.map((packet) => ({
      packetNumber: packet.packetNumber,
      totalItems: parseInt(packet.totalItems || packet.totalItemsPerPacket) || 0,
      totalItemsPerPacket: parseInt(packet.totalItemsPerPacket || packet.totalItems) || 0,
      composition: packet.composition
        .filter((item) => item.size && item.color && item.quantity)
        .map((item) => ({
          size: item.size.trim(),
          color: item.color.trim(),
          quantity: parseInt(item.quantity) || 0,
        })),
      isLoose: configMode === "loose",
    }));

    onSave(cleanPackets, activeItem);
    onClose();
  };

  const getPacketColors = (packet) => {
    if (!packet.composition || packet.composition.length === 0) return null;
    const colors = [...new Set(
      packet.composition
        .filter(c => c.color && parseInt(c.quantity) > 0)
        .map(c => c.color.trim())
    )];
    return colors.length > 0 ? colors.join(", ") : null;
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Packet Configuration"
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {configMode === "packets" && (
            <Button type="button" variant="outline" onClick={addPacket}>
              <Plus className="h-4 w-4 mr-2" />
              Add Packet
            </Button>
          )}
          <Button 
            type="button" 
            onClick={handleSave} 
            disabled={!configMode || packets.length === 0}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Save Configuration
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        
        {/* Compact Product Details Header */}
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-slate-800">
            <Package className="h-5 w-5 text-blue-500" />
            <div className="flex flex-col">
              <span className="font-medium text-sm">{activeItem.productName || activeItem.productCode || "Product"}</span>
              {activeItem.productCode && activeItem.productName && (
                <span className="text-xs text-slate-500">SKU: {activeItem.productCode}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Target Qty:</span>
            <span className="text-lg font-bold text-slate-900">{expectedTotal}</span>
          </div>
        </div>

        {/* UI State 1: Compact Mode Selection (No configuration yet) */}
        {configMode === null ? (
          <div className="py-2 space-y-3">
            <h3 className="text-sm font-medium text-slate-900">Select packing method</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleModeChange("packets")}
                className="flex items-start text-left p-3 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="h-8 w-8 bg-blue-100 text-blue-600 rounded-md flex items-center justify-center mr-3 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-0.5">In Packets</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">Divide into multiple numbered boxes.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleModeChange("loose")}
                className="flex items-start text-left p-3 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
              >
                <div className="h-8 w-8 bg-slate-100 text-slate-600 rounded-md flex items-center justify-center mr-3 shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Circle className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-slate-900 mb-0.5">Loose Items</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">Ship items together without separation.</p>
                </div>
              </button>
            </div>
          </div>
        ) : (
          /* UI State 2: Configuration Editor */
          <>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="bg-slate-100 p-1 rounded flex items-center">
                  <button
                    type="button"
                    onClick={() => handleModeChange("packets")}
                    className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${configMode === "packets"
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                      }`}
                  >
                    Packets
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange("loose")}
                    className={`px-3 py-1 text-xs font-medium rounded-sm transition-all ${configMode === "loose"
                        ? "bg-white text-blue-700 shadow-sm"
                        : "text-slate-500 hover:text-slate-900"
                      }`}
                  >
                    Loose Items
                  </button>
                </div>
              </div>

              {/* Progress Summary */}
              <div className={`px-2 py-1 rounded border flex items-center gap-1.5 text-xs ${isValid
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-orange-200 bg-orange-50 text-orange-700"
                }`}>
                <span className="font-medium">
                  {totalItemsInPackets} / {expectedTotal} 
                </span>
                {isValid ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5" />
                )}
              </div>
            </div>

            {localError && (
              <div className="p-3 rounded-md border border-red-200 bg-red-50 flex items-center gap-2 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{localError}</span>
              </div>
            )}

            {/* Packets Mode */}
            {configMode === "packets" && (
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {packets.map((packet, index) => {
                  const isExpanded = expandedPacket === `packet-${packet.packetNumber}`;

                  return (
                    <div
                      key={index}
                      className="border border-slate-200 rounded-md overflow-hidden bg-white"
                    >
                      <div className="px-3 py-2 bg-slate-50 flex items-center justify-between border-b border-slate-100">
                        <button
                          type="button"
                          className="flex items-center gap-2 hover:text-blue-600 transition-colors flex-1 text-left"
                          onClick={() => setExpandedPacket(isExpanded ? null : `packet-${packet.packetNumber}`)}
                        >
                          <span className="font-medium text-sm text-slate-800">
                            Packet {packet.packetNumber}
                            {getPacketColors(packet) && (
                              <span className="ml-2 font-normal text-slate-500 text-xs">({getPacketColors(packet)})</span>
                            )}
                          </span>
                        </button>
                        <div className="flex gap-2 items-center">
                          <span className={`text-xs font-medium ${packet.totalItems > 0 ? "text-blue-600" : "text-slate-400"}`}>
                            {packet.totalItems} qty
                          </span>
                          <div className="flex items-center gap-0.5 border-l border-slate-200 pl-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDuplicatePacket(index)}
                              className="h-7 w-7 p-0"
                              title="Duplicate"
                            >
                              <Copy className="h-3.5 w-3.5 text-slate-500" />
                            </Button>
                            {packets.length > 1 && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => removePacket(index)}
                                className="h-7 w-7 p-0 hover:text-red-600 hover:bg-red-50"
                                title="Remove"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-3 bg-white">
                          <CompositionEditor
                            composition={packet.composition}
                            onChange={(comp) => handleCompositionChange(index, comp)}
                            expectedTotal={0}
                            availableSizes={availableSizes}
                            availableColors={availableColors}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Loose Items Mode */}
            {configMode === "loose" && (
              <div className="border border-slate-200 rounded-md overflow-hidden bg-white">
                <div className="p-3 bg-white">
                  {packets.length > 0 && (
                    <CompositionEditor
                      composition={packets[0].composition}
                      onChange={(comp) => handleCompositionChange(0, comp)}
                      expectedTotal={expectedTotal}
                      availableSizes={availableSizes}
                      availableColors={availableColors}
                    />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}