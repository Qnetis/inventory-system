/* eslint-disable @typescript-eslint/no-explicit-any */

export interface User {
  id: string;
  username: string;
  email: string;
  fullName?: string;
  phone?: string;
  isAdmin: boolean;
}

export interface CustomField {
  id: string;
  name: string;
  fieldType: 'TEXT' | 'NUMBER' | 'MONEY' | 'SELECT' | 'CHECKBOX';
  isRequired: boolean;
  options?: string[];
  order: number;
}

// Обновленный интерфейс Record без inventoryNumber
export interface Record {
  id: string;
  barcode: string; // Теперь barcode - единственный уникальный идентификатор
  dynamicData: { [key: string]: any };
  owner: User;
  createdAt: string;
  updatedAt: string;
}