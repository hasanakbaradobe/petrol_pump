import { Request, Response } from 'express';
import { Party } from '../models';

// @desc    Get all parties
// @route   GET /api/parties
// @access  Private
export const getParties = async (req: Request, res: Response) => {
  try {
    const parties = await Party.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, count: parties.length, data: parties });
  } catch (error) {
    console.error('Error fetching parties:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get single party
// @route   GET /api/parties/:id
// @access  Private
export const getParty = async (req: Request, res: Response) => {
  try {
    const party = await Party.findByPk(req.params.id);
    if (!party) {
      return res.status(404).json({ success: false, message: 'Party not found' });
    }
    res.json({ success: true, data: party });
  } catch (error) {
    console.error('Error fetching party:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Create new party
// @route   POST /api/parties
// @access  Private (Admin only)
export const createParty = async (req: Request, res: Response) => {
  try {
    const { name, contact_info, balance } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Party name is required' });
    }

    const party = await Party.create({
      name,
      contact_info,
      balance: balance || 0,
    });

    res.status(201).json({ success: true, data: party });
  } catch (error: any) {
    console.error('Error creating party:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors.map((e: any) => e.message).join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update party
// @route   PUT /api/parties/:id
// @access  Private (Admin only)
export const updateParty = async (req: Request, res: Response) => {
  try {
    const party = await Party.findByPk(req.params.id);

    if (!party) {
      return res.status(404).json({ success: false, message: 'Party not found' });
    }

    const { name, contact_info, balance } = req.body;

    if (name !== undefined) party.name = name;
    if (contact_info !== undefined) party.contact_info = contact_info;
    if (balance !== undefined) party.balance = balance;

    await party.save();

    res.json({ success: true, data: party });
  } catch (error: any) {
    console.error('Error updating party:', error);
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ success: false, message: error.errors.map((e: any) => e.message).join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Delete party
// @route   DELETE /api/parties/:id
// @access  Private (Admin only)
export const deleteParty = async (req: Request, res: Response) => {
  try {
    const party = await Party.findByPk(req.params.id);

    if (!party) {
      return res.status(404).json({ success: false, message: 'Party not found' });
    }

    if (Number(party.balance) !== 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete party with a non-zero balance. Please settle the account first.' 
      });
    }

    await party.destroy();

    res.json({ success: true, message: 'Party deleted successfully' });
  } catch (error) {
    console.error('Error deleting party:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
