import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class Transaction extends Model {
  public id!: number;
  public type!: 'sale' | 'purchase';
  public quantity!: number;
  public total_amount!: number;
  public payment_method!: 'cash' | 'credit';
  public fuel_id!: number;
  public party_id?: number;
  public user_id!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Transaction.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['sale', 'purchase']],
      },
    },
    quantity: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
    total_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    payment_method: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'cash',
      validate: {
        isIn: [['cash', 'credit']],
      },
    },
    fuel_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    party_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Transaction',
    tableName: 'transactions',
    timestamps: true,
  }
);

export default Transaction;
