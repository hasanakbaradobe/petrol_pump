import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class Party extends Model {
  public id!: number;
  public name!: string;
  public contact_info!: string;
  public balance!: number; // Positive = they owe us (Credit), Negative = we owe them (Advance)
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Party.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    contact_info: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    balance: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: 'Party',
    tableName: 'parties',
    timestamps: true,
  }
);

export default Party;
