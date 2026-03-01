import User from './User';
import Fuel from './Fuel';
import Party from './Party';
import Transaction from './Transaction';
import LedgerEntry from './LedgerEntry';
import Inventory from './Inventory';

// --- Associations ---

// User <-> Transaction (One-to-Many)
User.hasMany(Transaction, { foreignKey: 'user_id' });
Transaction.belongsTo(User, { foreignKey: 'user_id' });

// Fuel <-> Transaction (One-to-Many)
Fuel.hasMany(Transaction, { foreignKey: 'fuel_id' });
Transaction.belongsTo(Fuel, { foreignKey: 'fuel_id' });

// Fuel <-> Inventory (One-to-Many)
Fuel.hasMany(Inventory, { foreignKey: 'fuel_id', onDelete: 'CASCADE' });
Inventory.belongsTo(Fuel, { foreignKey: 'fuel_id' });

// Party <-> Transaction (One-to-Many)
Party.hasMany(Transaction, { foreignKey: 'party_id', onDelete: 'SET NULL' });
Transaction.belongsTo(Party, { foreignKey: 'party_id' });

// Party <-> LedgerEntry (One-to-Many)
Party.hasMany(LedgerEntry, { foreignKey: 'party_id', onDelete: 'CASCADE' });
LedgerEntry.belongsTo(Party, { foreignKey: 'party_id' });

// Transaction <-> LedgerEntry (One-to-Many)
Transaction.hasMany(LedgerEntry, { foreignKey: 'transaction_id', onDelete: 'CASCADE' });
LedgerEntry.belongsTo(Transaction, { foreignKey: 'transaction_id' });

// Transaction <-> Inventory (One-to-One / One-to-Many)
Transaction.hasMany(Inventory, { foreignKey: 'transaction_id', onDelete: 'CASCADE' });
Inventory.belongsTo(Transaction, { foreignKey: 'transaction_id' });

// User <-> Inventory (One-to-Many)
User.hasMany(Inventory, { foreignKey: 'user_id', onDelete: 'SET NULL' });
Inventory.belongsTo(User, { foreignKey: 'user_id' });

// User <-> LedgerEntry (One-to-Many)
User.hasMany(LedgerEntry, { foreignKey: 'user_id' });
LedgerEntry.belongsTo(User, { foreignKey: 'user_id' });

export {
  User,
  Fuel,
  Party,
  Transaction,
  LedgerEntry,
  Inventory
};
