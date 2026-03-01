import { Request, Response } from 'express';
import { Transaction, Fuel, Inventory, Party, LedgerEntry, User } from '../models';
import sequelize from '../config/database';
import { Op } from 'sequelize';

// @desc    Add fuel purchase (Credit Entry)
// @route   POST /api/ledger/purchase
// @access  Private (Admin/Operator)
export const addFuelPurchase = async (req: Request, res: Response) => {
  let t;
  try {
    t = await sequelize.transaction();
    const { party_id, fuel_id, payment_method, rate } = req.body;
    let { quantity, total_amount } = req.body;
    const user_id = (req as any).user.id;

    if (!party_id || !fuel_id) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Party ID and Fuel ID are required' });
    }

    if (!quantity && !total_amount) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Please provide either quantity or total_amount' });
    }

    const fuel = await Fuel.findByPk(fuel_id, { transaction: t });
    if (!fuel) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Fuel not found' });
    }

    // Auto-calculate based on fuel rate or provided custom rate
    const pricePerLitre = rate ? Number(rate) : Number(fuel.price_per_litre);
    if (quantity && !total_amount) {
      total_amount = Number(quantity) * pricePerLitre;
    } else if (total_amount && !quantity) {
      quantity = Number(total_amount) / pricePerLitre;
    } else if (quantity && total_amount && rate) {
      // If all three are provided, recalculate total_amount to be safe
      total_amount = Number(quantity) * pricePerLitre;
    }

    quantity = Number(Number(quantity).toFixed(2));
    total_amount = Number(Number(total_amount).toFixed(2));

    // 1. Create Transaction (Purchase)
    const purchaseTx = await Transaction.create({
      type: 'purchase',
      quantity,
      total_amount,
      payment_method: payment_method || 'credit',
      fuel_id,
      party_id,
      user_id,
    }, { transaction: t });

    // 2. Increase Inventory (Inward movement)
    await Inventory.create({
      fuel_id,
      transaction_type: 'in',
      quantity,
      transaction_id: purchaseTx.id,
    }, { transaction: t });

    // 3. Update Fuel Stock
    fuel.current_stock = Number(fuel.current_stock) + quantity;
    await fuel.save({ transaction: t });

    // 4. Update Ledger and Party Balance if it's a credit purchase
    if (payment_method !== 'cash') {
      // Credit entry means our liability increases (we owe the supplier more)
      await LedgerEntry.create({
        party_id,
        transaction_id: purchaseTx.id,
        user_id,
        amount: total_amount,
        type: 'credit', 
        description: `Fuel Purchase: ${quantity}${fuel.unit || 'L'} of ${fuel.name}`,
      }, { transaction: t });

      const party = await Party.findByPk(party_id, { transaction: t });
      if (party) {
        // Negative balance = we owe them
        party.balance = Number(party.balance) - total_amount; 
        await party.save({ transaction: t });
      }
    }

    await t.commit();
    res.status(201).json({ success: true, message: 'Fuel purchase recorded successfully', data: purchaseTx });
  } catch (error: any) {
    if (t) await t.rollback();
    console.error('Error adding fuel purchase:', error);
    res.status(500).json({ success: false, message: 'Server Error during purchase' });
  }
};

// @desc    Record payment (Payment Entry)
// @route   POST /api/ledger/payment
// @access  Private (Admin/Operator)
export const recordPayment = async (req: Request, res: Response) => {
  let t;
  try {
    t = await sequelize.transaction();
    const { party_id, amount, description, type } = req.body;
    
    // type from frontend: 'received' (customer pays us) or 'given' (we pay supplier)
    const paymentDirection = type || 'received';

    if (!party_id || !amount) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Party ID and amount are required' });
    }

    const party = await Party.findByPk(party_id, { transaction: t });
    if (!party) {
      await t.rollback();
      return res.status(404).json({ success: false, message: 'Party not found' });
    }

    const numAmount = Number(Number(amount).toFixed(2));

    // 1. Create Ledger Entry
    // Received from customer = credit (decreases their debit balance)
    // Given to supplier = debit (decreases their credit balance)
    const entryType = paymentDirection === 'received' ? 'credit' : 'debit';
    await LedgerEntry.create({
      party_id,
      user_id: (req as any).user.id,
      amount: numAmount,
      type: entryType,
      description: description || `Payment ${paymentDirection}`,
    }, { transaction: t });

    // 2. Update Party Balance
    if (paymentDirection === 'received') {
      // Customer pays us -> they owe us less -> balance decreases
      party.balance = Number(party.balance) - numAmount;
    } else if (paymentDirection === 'given') {
      // We pay supplier -> we owe them less -> balance increases (was negative)
      party.balance = Number(party.balance) + numAmount;
    }
    await party.save({ transaction: t });

    await t.commit();
    res.status(201).json({ success: true, message: 'Payment recorded successfully', data: party });
  } catch (error: any) {
    if (t) await t.rollback();
    console.error('Error recording payment:', error);
    res.status(500).json({ success: false, message: 'Server Error during payment' });
  }
};

// @desc    Get Ledger View with filters and totals
// @route   GET /api/ledger
// @access  Private (Admin/Operator)
export const getLedger = async (req: Request, res: Response) => {
  try {
    const { party_id, startDate, endDate, fuel_id } = req.query;

    const whereCondition: any = {};
    if (party_id) whereCondition.party_id = party_id;
    
    if (startDate || endDate) {
      whereCondition.createdAt = {};
      if (startDate) whereCondition.createdAt[Op.gte] = new Date(startDate as string);
      if (endDate) whereCondition.createdAt[Op.lte] = new Date(endDate as string);
    }

    const includeOptions: any[] = [
      { model: Party, attributes: ['id', 'name', 'balance'] }
    ];

    // If filtering by fuel_id, we need to join Transaction and filter there
    const transactionInclude: any = {
      model: Transaction,
      attributes: ['id', 'type', 'quantity', 'total_amount', 'fuel_id'],
      include: [{ model: Fuel, attributes: ['id', 'name', 'unit'] }]
    };

    if (fuel_id) {
      transactionInclude.where = { fuel_id };
      transactionInclude.required = true; // Inner join to filter LedgerEntries by fuel_id
    }

    includeOptions.push(transactionInclude);

    const entries = await LedgerEntry.findAll({
      where: whereCondition,
      include: includeOptions,
      order: [['createdAt', 'DESC']],
    });

    // Calculate totals based on the filtered entries
    let total_sales = 0;
    let total_purchases = 0;
    let total_paid = 0;
    let total_received = 0;

    entries.forEach(entry => {
      if (entry.transaction_id) {
        // It's a Sale or Purchase
        if (entry.type === 'debit') {
          total_sales += Number(entry.amount);
        } else {
          total_purchases += Number(entry.amount);
        }
      } else {
        // It's a Payment
        if (entry.type === 'credit') {
          total_received += Number(entry.amount);
        } else {
          total_paid += Number(entry.amount);
        }
      }
    });

    const net_balance_change = (total_sales + total_paid) - (total_purchases + total_received);

    res.json({
      success: true,
      count: entries.length,
      summary: {
        total_sales,
        total_purchases,
        total_paid,
        total_received,
        net_balance_change
      },
      data: entries
    });
  } catch (error: any) {
    console.error('Error fetching ledger:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get all transactions (Fuel, Party, Cash) for Admin
// @route   GET /api/ledger/all-transactions
// @access  Private (Admin only)
export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const { type, startDate, endDate, user_id, fuel_id } = req.query; // 'fuel', 'party', 'cash'

    const commonWhere: any = {};
    if (user_id) commonWhere.user_id = user_id;
    
    if (startDate || endDate) {
      commonWhere.createdAt = {};
      if (startDate) commonWhere.createdAt[Op.gte] = new Date(startDate as string);
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        commonWhere.createdAt[Op.lte] = end;
      }
    }

    let data: any[] = [];

    if (type === 'party' || !type) {
      const partyEntryInclude: any[] = [
        { model: Party, attributes: ['name'] },
        { model: User, attributes: ['username'] }
      ];

      const txInclude: any = { 
        model: Transaction, 
        include: [{ model: Fuel, attributes: ['name', 'unit'] }] 
      };

      if (fuel_id) {
        txInclude.where = { fuel_id };
        txInclude.required = true; // Only entries linked to this fuel
      }
      
      partyEntryInclude.push(txInclude);

      const partyEntriesWhere: any = { ...commonWhere };
      if (fuel_id) {
        partyEntriesWhere.transaction_id = { [Op.not]: null };
      }

      const partyEntries = await LedgerEntry.findAll({
        where: partyEntriesWhere,
        include: partyEntryInclude,
        order: [['createdAt', 'DESC']]
      });
      data = [...data, ...partyEntries.map(entry => ({ ...entry.toJSON(), category: 'party' }))];
    }

    if (type === 'cash' || !type) {
      // Cash transitions are transactions with payment_method = 'cash'
      
      const cashWhere: any = { ...commonWhere, payment_method: 'cash' };
      if (fuel_id) cashWhere.fuel_id = fuel_id;

      const cashTxs = await Transaction.findAll({
        where: cashWhere,
        include: [
          { model: Fuel, attributes: ['name', 'unit'] },
          { model: User, attributes: ['username'] }
        ],
        order: [['createdAt', 'DESC']]
      });

      data = [
        ...data, 
        ...cashTxs.map(tx => ({ ...tx.toJSON(), category: 'cash', subType: 'fuel_sale' }))
      ];
    }

    // Sort all by date
    data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('Error fetching all transactions:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
