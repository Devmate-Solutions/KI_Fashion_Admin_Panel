"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"

/**
 * PacketCompositionView - Display packet composition in matrix format
 * Shows colors as rows and sizes as columns
 * 
 * @param {Object} props
 * @param {Object} props.packet - Packet data with composition array
 * @param {number} props.packet.packetNumber - Packet number
 * @param {number} props.packet.totalItems - Total items in packet
 * @param {Array} props.packet.composition - Array of {size, color, quantity}
 * @param {boolean} props.editable - Allow editing quantities
 * @param {Function} props.onChange - Callback when composition changes
 */
export default function PacketCompositionView({
  packet,
  editable = false,
  onChange,
}) {
  const [localComposition, setLocalComposition] = useState(packet.composition || [])

  // Build matrix from composition
  const buildMatrix = (composition) => {
    const matrix = {}
    const sizes = new Set()
    const colors = new Set()

    composition.forEach(item => {
      if (item.color) colors.add(item.color)
      if (item.size) sizes.add(item.size)
      
      if (!matrix[item.color]) {
        matrix[item.color] = {}
      }
      matrix[item.color][item.size] = item.quantity || 0
    })

    return {
      matrix,
      sizes: Array.from(sizes),
      colors: Array.from(colors)
    }
  }

  const { matrix, sizes, colors } = buildMatrix(localComposition)

  // Calculate row total
  const getRowTotal = (color) => {
    if (!matrix[color]) return 0
    return Object.values(matrix[color]).reduce((sum, qty) => sum + (parseInt(qty) || 0), 0)
  }

  // Calculate column total
  const getColumnTotal = (size) => {
    let total = 0
    Object.values(matrix).forEach(colorSizes => {
      total += parseInt(colorSizes[size]) || 0
    })
    return total
  }

  // Calculate grand total
  const getGrandTotal = () => {
    let total = 0
    Object.values(matrix).forEach(colorSizes => {
      Object.values(colorSizes).forEach(qty => {
        total += parseInt(qty) || 0
      })
    })
    return total
  }

  const handleCellChange = (color, size, value) => {
    const qty = parseInt(value) || 0
    
    // Update local composition
    const newComposition = [...localComposition]
    const existingIndex = newComposition.findIndex(
      item => item.color === color && item.size === size
    )
    
    if (existingIndex >= 0) {
      if (qty > 0) {
        newComposition[existingIndex].quantity = qty
      } else {
        // Remove if quantity is 0
        newComposition.splice(existingIndex, 1)
      }
    } else if (qty > 0) {
      // Add new entry
      newComposition.push({ color, size, quantity: qty })
    }
    
    setLocalComposition(newComposition)
    
    if (onChange) {
      onChange(newComposition)
    }
  }

  if (sizes.length === 0 || colors.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        <p>No composition data available</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border border-slate-200 overflow-hidden">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-100">
            <th className="px-2 py-1.5 text-left font-semibold text-slate-700 border border-slate-300">
              Color / Size
            </th>
            {sizes.map(size => (
              <th key={size} className="px-2 py-1.5 text-center font-semibold text-slate-700 border border-slate-300">
                {size}
              </th>
            ))}
            <th className="px-2 py-1.5 text-center font-semibold text-slate-700 border border-slate-300 bg-slate-200">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {colors.map((color, colorIndex) => (
            <tr key={color} className={colorIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              <td className="px-2 py-1.5 font-medium text-slate-700 border border-slate-300">
                {color}
              </td>
              {sizes.map(size => {
                const value = matrix[color]?.[size] || 0
                return (
                  <td key={size} className="px-1.5 py-1.5 border border-slate-300">
                    {editable ? (
                      <Input
                        type="number"
                        min="0"
                        value={value === 0 ? '' : value}
                        onChange={(e) => handleCellChange(color, size, e.target.value)}
                        placeholder="0"
                        className={`text-center text-xs h-7 ${value > 0 ? 'bg-blue-50 border-blue-300 font-semibold' : ''}`}
                      />
                    ) : (
                      <div className={`text-center py-1.5 ${value > 0 ? 'font-semibold text-slate-900' : 'text-slate-400'}`}>
                        {value || '—'}
                      </div>
                    )}
                  </td>
                )
              })}
              <td className="px-2 py-1.5 text-center font-bold text-slate-700 border border-slate-300 bg-slate-100">
                {getRowTotal(color)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-200">
            <td className="px-2 py-1.5 font-semibold text-slate-700 border border-slate-300">
              Total
            </td>
            {sizes.map(size => (
              <td key={size} className="px-2 py-1.5 text-center font-bold text-slate-700 border border-slate-300">
                {getColumnTotal(size)}
              </td>
            ))}
            <td className="px-2 py-1.5 text-center text-sm font-bold text-slate-900 border border-slate-300 bg-slate-300">
              {getGrandTotal()}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

