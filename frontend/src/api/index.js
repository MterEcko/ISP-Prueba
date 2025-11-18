// frontend/src/api/index.js
// Archivo de índice central para servicios API

import AuthService from '@/services/auth.service';
import UserService from '@/services/user.service';
import ClientService from '@/services/client.service';
import BillingService from '@/services/billing.service';
import PaymentService from '@/services/payment.service';
import InvoiceService from '@/services/invoice.service';
import SubscriptionService from '@/services/subscription.service';
import ServicePackageService from '@/services/servicePackage.service';
import TicketService from '@/services/ticket.service';
import DeviceService from '@/services/device.service';
import MikrotikService from '@/services/mikrotik.service';
import MikrotikRouterService from '@/services/mikrotikRouter.service';
import NetworkService from '@/services/network.service';
import IpPoolService from '@/services/ipPool.service';
import IpAssignmentService from '@/services/ip.assignment.service';
import InventoryService from '@/services/inventory.service';
import InventoryConfigService from '@/services/inventoryConfig.service';
import DocumentService from '@/services/document.service';
import DocumentTemplateService from '@/services/documentTemplate.service';
import DocumentAdvancedService from '@/services/documentAdvanced.service';
import ClientDocumentService from '@/services/clientDocument.service';
import NotificationService from '@/services/notification.service';
import SettingsService from '@/services/settings.service';
import RoleService from '@/services/role.service';
import ReportsService from '@/services/reports.service';
import DashboardService from '@/services/dashboard.service';
import BackupService from '@/services/backup.service';
import CommunicationService from '@/services/communication.service';
import CommandService from '@/services/command.service';
import PDFGeneratorService from '@/services/pdf.generator.service';
import CalendarService from '@/services/calendar.service';
import ChatService from '@/services/chat.service';
import StoreCustomerService from '@/services/storeCustomer.service';
import PluginUploadService from '@/services/pluginUpload.service';
import PluginService from '@/services/plugin.service';
import LicenseService from '@/services/license.service';
import TelemetryService from '@/services/telemetry.service';

// Exportar como objeto agrupado
export default {
  auth: AuthService,
  users: UserService,
  clients: ClientService,
  billing: BillingService,
  payments: PaymentService,
  invoices: InvoiceService,
  subscriptions: SubscriptionService,
  servicePackages: ServicePackageService,
  tickets: TicketService,
  devices: DeviceService,
  mikrotik: MikrotikService,
  mikrotikRouters: MikrotikRouterService,
  networks: NetworkService,
  ipPools: IpPoolService,
  ipAssignments: IpAssignmentService,
  inventory: InventoryService,
  inventoryConfig: InventoryConfigService,
  documents: DocumentService,
  documentTemplates: DocumentTemplateService,
  documentAdvanced: DocumentAdvancedService,
  clientDocuments: ClientDocumentService,
  notifications: NotificationService,
  settings: SettingsService,
  roles: RoleService,
  reports: ReportsService,
  dashboard: DashboardService,
  backups: BackupService,
  communication: CommunicationService,
  commands: CommandService,
  pdfGenerator: PDFGeneratorService,
  calendar: CalendarService,
  chat: ChatService,
  storeCustomers: StoreCustomerService,
  pluginUpload: PluginUploadService,
  plugins: PluginService,
  license: LicenseService,
  telemetry: TelemetryService
};

// También exportar servicios individuales para importación directa
export {
  AuthService,
  UserService,
  ClientService,
  BillingService,
  PaymentService,
  InvoiceService,
  SubscriptionService,
  ServicePackageService,
  TicketService,
  DeviceService,
  MikrotikService,
  MikrotikRouterService,
  NetworkService,
  IpPoolService,
  IpAssignmentService,
  InventoryService,
  InventoryConfigService,
  DocumentService,
  DocumentTemplateService,
  DocumentAdvancedService,
  ClientDocumentService,
  NotificationService,
  SettingsService,
  RoleService,
  ReportsService,
  DashboardService,
  BackupService,
  CommunicationService,
  CommandService,
  PDFGeneratorService,
  CalendarService,
  ChatService,
  StoreCustomerService,
  PluginUploadService,
  PluginService,
  LicenseService,
  TelemetryService
};
