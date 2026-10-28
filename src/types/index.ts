export type UserRole =
  | 'admin'
  | 'branch_staff'
  | 'delivery_agent'
  | 'customer'

export type UserStatus = 'active' | 'inactive'

export type DeliveryType = 'standard' | 'express' | 'same_day'

export type ShipmentStatus =
  | 'shipment_created'
  | 'branch_received'
  | 'processing'
  | 'in_transit'
  | 'arrived_at_destination'
  | 'agent_assigned'
  | 'out_for_delivery'
  | 'delivered'
  | 'delivery_failed'
  | 'cancelled'
  | 'returned_to_sender'

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'wallet'

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'

export interface User {
  id: string
  name: string
  email: string
  password: string
  role: UserRole
  status: UserStatus
  branchId?: string
  agentId?: string
  customerId?: string
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  pincode: string
}

export interface Branch {
  id: string
  name: string
  code: string
  address: string
  city: string
  contact: string
  manager: string
  status: 'active' | 'inactive'
}

export interface DeliveryAgent {
  id: string
  name: string
  email: string
  phone: string
  branchId: string
  vehicleNumber: string
  vehicleType: 'bike' | 'van' | 'truck'
  availability: 'available' | 'busy' | 'unavailable'
}

export interface Pricing {
  id: string
  deliveryType: DeliveryType
  baseWeight: number
  basePrice: number
  additionalKgPrice: number
  active: boolean
}
