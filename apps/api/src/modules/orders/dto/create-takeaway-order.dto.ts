import { Type } from 'class-transformer'
import {
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'

export enum TakeawayPaymentMethod {
  CASH = 'CASH',
  CARD_EFTPOS = 'CARD_EFTPOS',
  CARD_STRIPE = 'CARD_STRIPE',
}

export enum PublicOrderType {
  PICKUP = 'PICKUP',
  DELIVERY = 'DELIVERY',
}

class TakeawayItemDto {
  @IsString()
  menuItemId: string

  @IsInt()
  @Min(1)
  quantity: number
}

export class CreateTakeawayOrderDto {
  @IsString()
  @MinLength(1)
  tenantSlug: string

  @IsString()
  @MinLength(1)
  customerName: string

  // E.164 phone number (e.g. +6421234567) produced by the country-code picker.
  @IsString()
  @MinLength(5)
  customerPhone: string

  @IsEmail()
  customerEmail: string

  @IsOptional()
  @IsString()
  notes?: string

  // PICKUP (collect from the restaurant) or DELIVERY. Defaults to PICKUP.
  @IsOptional()
  @IsEnum(PublicOrderType)
  orderType?: PublicOrderType

  // Required when orderType is DELIVERY (enforced in the service).
  @IsOptional()
  @IsString()
  deliveryAddress?: string

  @IsEnum(TakeawayPaymentMethod)
  paymentMethod: TakeawayPaymentMethod

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TakeawayItemDto)
  items: TakeawayItemDto[]
}
