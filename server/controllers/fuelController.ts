import { Request, Response } from 'express';
import { Fuel, Transaction, Inventory } from '../models';

// @desc    Get all fuels
// @route   GET /api/fuels
// @access  Private (Admin/Operator)
export const getFuels = async (req: Request, res: Response) => {
  try {
    const fuels = await Fuel.findAll({
      order: [['name', 'ASC']],
    });
    res.json({ success: true, count: fuels.length, data: fuels });
  } catch (error) {
    console.error('Error fetching fuels:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get single fuel
// @route   GET /api/fuels/:id
// @access  Private (Admin/Operator)
export const getFuel = async (req: Request, res: Response) => {
  try {
    const fuel = await Fuel.findByPk(req.params.id);

    if (!fuel) {
      return res.status(404).json({ success: false, message: 'Fuel not found' });
    }

    res.json({ success: true, data: fuel });
  } catch (error) {
    console.error('Error fetching fuel:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Add new fuel type
// @route   POST /api/fuels
// @access  Private (Admin only)
export const createFuel = async (req: Request, res: Response) => {
  try {
    const { name, price_per_litre, current_stock, unit } = req.body;

    if (!name || price_per_litre === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide name and price_per_litre' });
    }

    const existingFuel = await Fuel.findOne({ where: { name } });
    if (existingFuel) {
      return res.status(400).json({ success: false, message: 'Fuel type already exists' });
    }

    const fuel = await Fuel.create({
      name,
      price_per_litre,
      current_stock: current_stock || 0,
      unit: unit || 'L',
    });

    res.status(201).json({ success: true, data: fuel });
  } catch (error: any) {
    console.error('Error creating fuel:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors.map((e: any) => e.message).join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update fuel (price per m³ / litre)
// @route   PUT /api/fuels/:id
// @access  Private (Admin only)
export const updateFuel = async (req: Request, res: Response) => {
  try {
    const fuel = await Fuel.findByPk(req.params.id);

    if (!fuel) {
      return res.status(404).json({ success: false, message: 'Fuel not found' });
    }

    const { name, price_per_litre, unit } = req.body;

    // Update fields if provided
    if (name !== undefined) fuel.name = name;
    if (price_per_litre !== undefined) fuel.price_per_litre = price_per_litre;
    if (unit !== undefined) fuel.unit = unit;

    await fuel.save();

    res.json({ success: true, data: fuel });
  } catch (error: any) {
    console.error('Error updating fuel:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors.map((e: any) => e.message).join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Delete fuel
// @route   DELETE /api/fuels/:id
// @access  Private (Admin only)
export const deleteFuel = async (req: Request, res: Response) => {
  try {
    const fuel = await Fuel.findByPk(req.params.id);

    if (!fuel) {
      return res.status(404).json({ success: false, message: 'Fuel not found' });
    }

    // Check if there are any transactions or inventory records associated with this fuel
    const transactionCount = await Transaction.count({ where: { fuel_id: fuel.id } });
    const inventoryCount = await Inventory.count({ where: { fuel_id: fuel.id } });

    if (transactionCount > 0 || inventoryCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete fuel because it has associated transactions or inventory history.' 
      });
    }

    await fuel.destroy();

    res.json({ success: true, message: 'Fuel deleted successfully' });
  } catch (error) {
    console.error('Error deleting fuel:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
