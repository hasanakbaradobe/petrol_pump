import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class LedgerEntry extends Model {
  public id!: number;
  public party_id!: number;
  public transaction_id?: number;
  public user_id!: number;
  public amount!: number;
  public type!: 'credit' | 'debit'; // credit = party owes us more, debit = party paid us / owes us less
  public description!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

LedgerEntry.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    party_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    transaction_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['credit', 'debit']],
      },
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'LedgerEntry',
    tableName: 'ledger_entries',
    timestamps: true,
  }
);

export default LedgerEntry;
