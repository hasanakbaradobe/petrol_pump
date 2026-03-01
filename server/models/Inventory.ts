import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class Inventory extends Model {
  public id!: number;
  public fuel_id!: number;
  public transaction_type!: 'in' | 'out';
  public quantity!: number;
  public transaction_id?: number;
  public user_id?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Inventory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    fuel_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    transaction_type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['in', 'out']],
      },
    },
    quantity: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0.01,
      },
    },
    transaction_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'Inventory',
    tableName: 'inventories',
    timestamps: true,
  }
);

export default Inventory;
