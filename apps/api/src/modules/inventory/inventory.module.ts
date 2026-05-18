// inventory.module.ts
import { Module } from '@nestjs/common';

import { ProductsModule } from '../products/products.module';
import { InventoryCalculatorService } from './inventory-calculator.service';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

// ─────────────────────────────────────────
// MODULE
// ─────────────────────────────────────────
export { InventoryModule };

@Module({
  imports: [ProductsModule],
  controllers: [InventoryController],
  providers: [InventoryService, InventoryCalculatorService],
  exports: [InventoryService, InventoryCalculatorService],
})
class InventoryModule {}
