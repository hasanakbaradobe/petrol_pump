import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class Fuel extends Model {
  public id!: number;
  public name!: string;
  public price_per_litre!: number;
  public current_stock!: number;
  public unit!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Fuel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    price_per_litre: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    current_stock: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0, // Prevents negative inventory at the DB level
      },
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'L',
    },
  },
  {
    sequelize,
    modelName: 'Fuel',
    tableName: 'fuels',
    timestamps: true,
  }
);

export default Fuel;
