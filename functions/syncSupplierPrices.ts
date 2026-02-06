import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }

        // Fetch all supplier prices and client prices
        const supplierPrices = await base44.asServiceRole.entities.SupplierPrice.list('-updated_date', 5000);
        const clientPrices = await base44.asServiceRole.entities.ClientPriceList.list('-updated_date', 5000);

        const results = {
            total_supplier_items: supplierPrices.length,
            updated: 0,
            created: 0,
            no_changes: 0,
            errors: [],
            proposed_updates: [],
            proposed_creates: []
        };

        // Create a map of client prices by product_name for faster lookup
        const clientPriceMap = new Map();
        clientPrices.forEach(cp => {
            const normalizedName = cp.product_name?.trim().toLowerCase();
            if (normalizedName) {
                clientPriceMap.set(normalizedName, cp);
            }
        });

        // If confirmed_items provided, only process those items
        const itemsToProcess = confirmed_items 
            ? supplierPrices.filter(sp => confirmed_items.includes(sp.id))
            : supplierPrices;

        // Process each supplier price
        for (const supplierItem of itemsToProcess) {
            try {
                const normalizedName = supplierItem.product_name?.trim().toLowerCase();
                if (!normalizedName) continue;

                const existingClientPrice = clientPriceMap.get(normalizedName);

                if (existingClientPrice) {
                    // Check what fields have changed
                    const changes = {};
                    
                    if (supplierItem.category && supplierItem.category !== existingClientPrice.category) {
                        changes.category = supplierItem.category;
                    }
                    
                    if (supplierItem.sub_category && supplierItem.sub_category !== existingClientPrice.sub_category) {
                        changes.sub_category = supplierItem.sub_category;
                    }

                    // Get the first supplier price from supplier_prices object
                    let firstSupplierPrice = null;
                    let firstSupplierName = null;
                    if (supplierItem.supplier_prices && typeof supplierItem.supplier_prices === 'object') {
                        const entries = Object.entries(supplierItem.supplier_prices);
                        if (entries.length > 0) {
                            firstSupplierName = entries[0][0];
                            firstSupplierPrice = entries[0][1];
                        }
                    }

                    if (firstSupplierPrice !== null && firstSupplierPrice !== existingClientPrice.supplier_price) {
                        changes.supplier_price = firstSupplierPrice;
                    }

                    if (firstSupplierName && firstSupplierName !== existingClientPrice.supplier_name) {
                        changes.supplier_name = firstSupplierName;
                    }

                    // Only update if there are actual changes
                    if (Object.keys(changes).length > 0) {
                        if (dry_run) {
                            results.proposed_updates.push({
                                supplier_item_id: supplierItem.id,
                                client_item_id: existingClientPrice.id,
                                product_name: supplierItem.product_name,
                                current_values: {
                                    category: existingClientPrice.category,
                                    sub_category: existingClientPrice.sub_category,
                                    supplier_price: existingClientPrice.supplier_price,
                                    supplier_name: existingClientPrice.supplier_name
                                },
                                new_values: changes
                            });
                            results.updated++;
                        } else {
                            await base44.asServiceRole.entities.ClientPriceList.update(
                                existingClientPrice.id,
                                changes
                            );
                            results.updated++;
                        }
                    } else {
                        results.no_changes++;
                    }

                } else {
                    // Create new client price entry
                    let firstSupplierPrice = null;
                    let firstSupplierName = null;
                    if (supplierItem.supplier_prices && typeof supplierItem.supplier_prices === 'object') {
                        const entries = Object.entries(supplierItem.supplier_prices);
                        if (entries.length > 0) {
                            firstSupplierName = entries[0][0];
                            firstSupplierPrice = entries[0][1];
                        }
                    }

                    const newItemData = {
                        product_name: supplierItem.product_name,
                        category: supplierItem.category,
                        sub_category: supplierItem.sub_category,
                        supplier_price: firstSupplierPrice,
                        supplier_name: firstSupplierName,
                        client_price: firstSupplierPrice ? firstSupplierPrice * 1.3 : 0,
                        notes: 'נוצר אוטומטית מסנכרון מחירון ספקים'
                    };

                    if (dry_run) {
                        results.proposed_creates.push({
                            supplier_item_id: supplierItem.id,
                            product_name: supplierItem.product_name,
                            data: newItemData
                        });
                        results.created++;
                    } else {
                        await base44.asServiceRole.entities.ClientPriceList.create(newItemData);
                        results.created++;
                    }
                }

                // Add small delay to avoid rate limits (only when not dry_run)
                if (!dry_run) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }

            } catch (error) {
                results.errors.push({
                    product: supplierItem.product_name,
                    error: error.message
                });
            }
        }

        return Response.json({
            success: true,
            results
        });

    } catch (error) {
        console.error('Sync error:', error);
        return Response.json({ 
            error: error.message,
            stack: error.stack 
        }, { status: 500 });
    }
});