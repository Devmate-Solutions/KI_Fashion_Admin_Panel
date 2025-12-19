"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Search, RotateCcw, Package, DollarSign, Archive, ArrowRight, RefreshCw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// API
import { returnsAPI } from "@/lib/api/endpoints/returns";

export default function ReturnItemsPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);

    // Return Form
    const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({
        defaultValues: {
            quantity: 1,
            reason: "",
            notes: ""
        }
    });

    const watchQuantity = watch("quantity");

    // Debounced search could be optimized, but manual trigger is fine for now
    const handleSearch = async (e) => {
        e?.preventDefault();
        if (!searchQuery.trim()) return;

        setIsLoading(true);
        try {
            const response = await returnsAPI.getProductsForReturn({ search: searchQuery });
            const data = response.data || [];
            setResults(data);
            setSelectedItem(null); // Clear selection on new search
        } catch (error) {
            toast.error("Failed to search products");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectRow = (item) => {
        setSelectedItem(item);
        reset({
            quantity: 1,
            reason: "",
            notes: ""
        });
    };

    const onSubmitReturn = async (data) => {
        if (!selectedItem) return;

        try {
            const payload = {
                items: [
                    {
                        productId: selectedItem._id,
                        quantity: Number(data.quantity),
                        reason: data.reason,
                        supplierId: selectedItem.supplierId // Critical: pass supplier ID to backend
                    }
                ],
                notes: data.notes
            };

            await returnsAPI.createProductReturn(payload);

            toast.success("Return processed successfully");

            // Update local state (optimistic) or refresh
            // Reduce avail stock
            setResults(prev => prev.map(p => {
                if (p._id === selectedItem._id && p.supplierId === selectedItem.supplierId) {
                    return { ...p, availableForReturn: p.availableForReturn - Number(data.quantity) };
                }
                return p;
            }).filter(p => p.availableForReturn > 0)); // Remove if 0

            setSelectedItem(null);

        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to process return");
        }
    };

    // Helper for currency
    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(val);
    };

    return (
        <div className="flex flex-col h-full space-y-6 max-w-[1600px] mx-auto p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Return Items</h1>
                    <p className="text-muted-foreground mt-2">
                        Search for inventory items and process returns to suppliers.
                    </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-full">
                    <RotateCcw className="w-8 h-8 text-primary" />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Panel: Search & Results */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-border/50 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg font-medium">Find Products</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSearch} className="flex gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by Product Name, Code, SKU, or Supplier..."
                                        className="pl-9 h-10 bg-muted/30"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <Button type="submit" disabled={isLoading || !searchQuery.trim()}>
                                    {isLoading ? "Searching..." : "Search"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {results.length > 0 ? (
                        <Card className="border-border/50 shadow-sm overflow-hidden">
                            <div className="max-h-[500px] overflow-auto">
                                <Table>
                                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead>Product Info</TableHead>
                                            <TableHead>Supplier</TableHead>
                                            <TableHead className="text-right">Available Stock</TableHead>
                                            <TableHead className="text-right">Cost Price</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.map((item) => (
                                            <TableRow
                                                key={`${item._id}-${item.supplierId}`}
                                                className={`cursor-pointer transition-colors ${selectedItem?._id === item._id && selectedItem?.supplierId === item.supplierId ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-muted/50"}`}
                                                onClick={() => handleSelectRow(item)}
                                            >
                                                <TableCell>
                                                    <div className="font-medium text-foreground">{item.name}</div>
                                                    <div className="text-xs text-muted-foreground flex gap-2 mt-1">
                                                        {item.productCode && <Badge variant="outline" className="text-[10px] h-5 rounded-sm">{item.productCode}</Badge>}
                                                        <span className="font-mono">{item.sku}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm">{item.supplierName}</div>
                                                    {item.companyName && <div className="text-xs text-muted-foreground">{item.companyName}</div>}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {item.availableForReturn}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(item.averageCostPrice)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    ) : (
                        <div className="h-[200px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl border-muted-foreground/20 bg-muted/5 text-muted-foreground">
                            <Package className="w-10 h-10 mb-2 opacity-50" />
                            <p>No products found yet. Try searching above.</p>
                        </div>
                    )}
                </div>

                {/* Right Panel: Selected Item & Form */}
                <div className="lg:col-span-1">
                    {selectedItem ? (
                        <Card className="border-primary/20 shadow-md sticky top-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <CardHeader className="bg-muted/30 pb-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="text-lg">Process Return</CardTitle>
                                        <CardDescription>Enter return details below</CardDescription>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setSelectedItem(null)}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-6 space-y-6">

                                {/* Product Summary */}
                                <div className="space-y-4">
                                    <div className="p-3 bg-secondary/10 rounded-lg space-y-3">
                                        <div className="flex items-start justify-between">
                                            <span className="text-xs font-semibold uppercase text-muted-foreground">Product</span>
                                            <span className="text-xs font-semibold uppercase text-muted-foreground">Batch Info</span>
                                        </div>

                                        <div>
                                            <h3 className="font-bold text-lg leading-tight">{selectedItem.name}</h3>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <Badge variant="secondary" className="font-normal">Code: {selectedItem.productCode || 'N/A'}</Badge>
                                                <Badge variant="secondary" className="font-normal">SKU: {selectedItem.sku}</Badge>
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="grid grid-cols-2 gap-4 pt-1">
                                            <div>
                                                <span className="text-xs text-muted-foreground block">Supplier</span>
                                                <span className="text-sm font-medium">{selectedItem.supplierName}</span>
                                            </div>
                                            <div>
                                                <span className="text-xs text-muted-foreground block display">Cost Price</span>
                                                <span className="text-sm font-medium">{formatCurrency(selectedItem.averageCostPrice)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Form */}
                                <form id="return-form" onSubmit={handleSubmit(onSubmitReturn)} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="quantity">Return Quantity</Label>
                                        <div className="flex items-center gap-4">
                                            <Input
                                                id="quantity"
                                                type="number"
                                                min="1"
                                                max={selectedItem.availableForReturn}
                                                className="text-lg font-medium"
                                                {...register("quantity", { required: true, min: 1, max: selectedItem.availableForReturn })}
                                            />
                                            <div className="text-sm text-muted-foreground whitespace-nowrap">
                                                / {selectedItem.availableForReturn} avail
                                            </div>
                                        </div>
                                        {errors.quantity && <span className="text-xs text-destructive">Invalid quantity</span>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="reason">Reason for Return</Label>
                                        <Input
                                            id="reason"
                                            placeholder="e.g. Damaged, Wrong Item, Expired"
                                            {...register("reason", { required: "Reason is required" })}
                                        />
                                        {errors.reason && <span className="text-xs text-destructive">{errors.reason.message}</span>}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="notes">Additional Notes</Label>
                                        <Textarea
                                            id="notes"
                                            placeholder="Any specific comments..."
                                            className="resize-none h-20"
                                            {...register("notes")}
                                        />
                                    </div>

                                    {/* Summary Calculation */}
                                    <div className="bg-muted/30 p-4 rounded-lg flex justify-between items-center">
                                        <span className="font-medium text-sm">Total Refund Value</span>
                                        <span className="font-bold text-lg text-primary">
                                            {formatCurrency((watchQuantity || 0) * selectedItem.averageCostPrice)}
                                        </span>
                                    </div>
                                </form>

                            </CardContent>
                            <CardFooter className="bg-muted/30 pt-6">
                                <Button
                                    form="return-form"
                                    type="submit"
                                    className="w-full"
                                    size="lg"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <ArrowRight className="w-4 h-4 mr-2" />
                                    )}
                                    Confirm Return
                                </Button>
                            </CardFooter>
                        </Card>
                    ) : (
                        <div className="hidden lg:flex h-full items-center justify-center p-6 text-center text-muted-foreground border-2 border-dashed rounded-xl border-muted-foreground/10">
                            <div>
                                <RotateCcw className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <h3 className="text-lg font-medium mb-1">No Item Selected</h3>
                                <p className="text-sm max-w-[200px] mx-auto">Select a product from the list to view details and process a return.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
