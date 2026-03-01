import { Request, Response } from 'express';
import { Transaction, Fuel, Inventory, User, Party, LedgerEntry } from '../models';
import sequelize from '../config/database';

// @desc    Create a new fuel sale (Cash Counter)
// @route   POST /api/cash/sale
// @access  Private (Admin/Operator)
export const createSale = async (req: Request, res: Response) => {
  let t;

  try {
    t = await sequelize.transaction();
    const { fuel_id, payment_method, party_id, rate } = req.body;
    let { quantity, total_amount } = req.body;
    const user_id = (req as any).user.id;

    if (!fuel_id) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Fuel ID is required' });
    }

    if (!quantity && !total_amount) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Please provide either quantity (liters) or total_amount' });
    }

    if (payment_method === 'credit' && !party_id) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Party ID is required for credit sales' });
    }

    // Fetch the fuel to get the current rate and stock
    const fuel = await Fuel.findByPk(fuel_id, { transaction: t });
    if (!fuel) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Fuel not found' });
    }

    // Auto-calculate missing values based on fuel rate or provided custom rate
    const pricePerLitre = rate ? Number(rate) : Number(fuel.price_per_litre);
    if (quantity && !total_amount) {
      total_amount = Number(quantity) * pricePerLitre;
    } else if (total_amount && !quantity) {
      quantity = Number(total_amount) / pricePerLitre;
    } else if (quantity && total_amount && rate) {
      // If all three are provided, recalculate total_amount to be safe
      total_amount = Number(quantity) * pricePerLitre;
    }

    // Ensure values are properly formatted numbers
    quantity = Number(Number(quantity).toFixed(2));
    total_amount = Number(Number(total_amount).toFixed(2));

    // Check inventory stock
    if (Number(fuel.current_stock) < quantity) {
      await t.rollback();
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient stock. Current stock: ${fuel.current_stock}L, Requested: ${quantity}L` 
      });
    }

    // 1. Create the Transaction record
    const saleTransaction = await Transaction.create(
      {
        type: 'sale',
        quantity,
        total_amount,
        payment_method: payment_method || 'cash',
        fuel_id,
        party_id: party_id || null,
        user_id,
      },
      { transaction: t }
    );

    // 2. Create the Inventory record (Outward movement)
    await Inventory.create(
      {
        fuel_id,
        transaction_type: 'out',
        quantity,
        transaction_id: saleTransaction.id,
      },
      { transaction: t }
    );

    // 3. Deduct from Fuel current_stock
    fuel.current_stock = Number(fuel.current_stock) - quantity;
    await fuel.save({ transaction: t });

    // 4. Update Ledger and Party Balance if it's a credit sale
    if (payment_method === 'credit' && party_id) {
      // Debit entry means the customer owes us more money
      await LedgerEntry.create({
        party_id,
        transaction_id: saleTransaction.id,
        user_id,
        amount: total_amount,
        type: 'debit', 
        description: `Fuel Sale: ${quantity}${fuel.unit || 'L'} of ${fuel.name}`,
      }, { transaction: t });

      const party = await Party.findByPk(party_id, { transaction: t });
      if (party) {
        // Positive balance = they owe us
        party.balance = Number(party.balance) + total_amount; 
        await party.save({ transaction: t });
      }
    }

    // Commit the transaction
    await t.commit();

    res.status(201).json({
      success: true,
      message: 'Sale recorded successfully',
      data: saleTransaction,
    });
  } catch (error: any) {
    if (t) await t.rollback();
    console.error('Error creating sale:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors.map((e: any) => e.message).join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error during sale creation' });
  }
};

// @desc    Get all sales transactions
// @route   GET /api/cash/sales
// @access  Private (Admin/Operator)
export const getSales = async (req: Request, res: Response) => {
  try {
    const userRole = (req as any).user.role;
    const userId = (req as any).user.id;

    // Base query condition: only get 'sale' transactions
    const whereCondition: any = { type: 'sale' };

    // If the user is an operator, they can only see their own sales
    if (userRole === 'operator') {
      whereCondition.user_id = userId;
    }

    const sales = await Transaction.findAll({
      where: whereCondition,
      include: [
        { model: Fuel, attributes: ['id', 'name', 'price_per_litre', 'unit'] },
        { model: User, attributes: ['id', 'username', 'role'] },
        { model: Party, attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({ success: true, count: sales.length, data: sales });
  } catch (error) {
    console.error('Error fetching sales:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
