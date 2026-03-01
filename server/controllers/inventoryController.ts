import { Request, Response } from 'express';
import { Fuel, Inventory, Transaction, User } from '../models';
import sequelize from '../config/database';
import { Op } from 'sequelize';

// Define a threshold for low stock warning (e.g., 1000 liters)
const LOW_STOCK_THRESHOLD = 1000;

// @desc    Set opening stock or manually adjust stock
// @route   POST /api/inventory/opening-stock
// @access  Private (Admin only)
export const setOpeningStock = async (req: Request, res: Response) => {
  let t;
  try {
    t = await sequelize.transaction();
    const { fuel_id, quantity, type } = req.body; // type can be 'in' or 'out' for manual adjustments
    
    if (!fuel_id || quantity === undefined) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Fuel ID and quantity are required' });
    }

    const transactionType = type === 'out' ? 'out' : 'in';

    const fuel = await Fuel.findByPk(fuel_id, { transaction: t });
    if (!fuel) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Fuel not found' });
    }

    const numQuantity = Number(Number(quantity).toFixed(2));

    if (transactionType === 'out' && Number(fuel.current_stock) < numQuantity) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Insufficient stock for outward adjustment' });
    }

    // 1. Create Inventory record
    await Inventory.create({
      fuel_id,
      transaction_type: transactionType,
      quantity: numQuantity,
      user_id: (req as any).user.id,
    }, { transaction: t });

    // 2. Update Fuel stock
    if (transactionType === 'in') {
      fuel.current_stock = Number(fuel.current_stock) + numQuantity;
    } else {
      fuel.current_stock = Number(fuel.current_stock) - numQuantity;
    }
    
    await fuel.save({ transaction: t });

    await t.commit();
    res.status(200).json({ 
      success: true, 
      message: `Stock adjusted successfully. Added ${numQuantity}L (${transactionType})`, 
      data: fuel 
    });
  } catch (error) {
    if (t) await t.rollback();
    console.error('Error setting opening stock:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get current stock for all fuels with low stock warnings
// @route   GET /api/inventory/stock
// @access  Private (Admin/Operator)
export const getCurrentStock = async (req: Request, res: Response) => {
  try {
    const fuels = await Fuel.findAll({
      attributes: ['id', 'name', 'current_stock', 'price_per_litre', 'unit'],
      order: [['name', 'ASC']]
    });

    const stockData = fuels.map(f => {
      const currentStock = Number(f.current_stock);
      return {
        id: f.id,
        name: f.name,
        current_stock: currentStock,
        price_per_litre: f.price_per_litre,
        unit: f.unit,
        low_stock_warning: currentStock <= LOW_STOCK_THRESHOLD,
        threshold: LOW_STOCK_THRESHOLD
      };
    });

    res.json({ success: true, data: stockData });
  } catch (error) {
    console.error('Error fetching current stock:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get inventory movement history for all fuels
// @route   GET /api/inventory/history
// @access  Private (Admin/Operator)
export const getAllInventoryHistory = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, user_id, fuel_id } = req.query;

    const where: any = {};
    
    if (fuel_id) {
      where.fuel_id = fuel_id;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt[Op.gte] = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = end;
      }
    }

    // For user filtering, we need to check either the Inventory's user_id (manual adjust)
    // or the associated Transaction's user_id (sales/purchases)
    const transactionInclude: any = { 
      model: Transaction, 
      attributes: ['id', 'type', 'total_amount', 'payment_method', 'user_id'],
      include: [{ model: User, attributes: ['username'] }]
    };

    if (user_id) {
      where[Op.or] = [
        { user_id: user_id },
        { '$Transaction.user_id$': user_id }
      ];
    }

    const history = await Inventory.findAll({
      where,
      include: [
        { model: Fuel, attributes: ['name', 'unit'] },
        { model: User, attributes: ['username'] }, // User who did manual adjustment
        transactionInclude
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, count: history.length, data: history });
  } catch (error) {
    console.error('Error fetching all inventory history:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get inventory movement history for a specific fuel
// @route   GET /api/inventory/history/:fuel_id
// @access  Private (Admin/Operator)
export const getInventoryHistory = async (req: Request, res: Response) => {
  try {
    const { fuel_id } = req.params;
    
    const history = await Inventory.findAll({
      where: { fuel_id },
      include: [
        { 
          model: Transaction, 
          attributes: ['id', 'type', 'total_amount', 'payment_method'] 
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, count: history.length, data: history });
  } catch (error) {
    console.error('Error fetching inventory history:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
