import { prisma } from './prisma';

export type KitType = 'BASE' | 'PLUS' | 'PREMIUM';
export type KitStatus = 'PENDING_ONBOARDING' | 'ONBOARDING_COMPLETED' | 'PREPARING_KIT' | 'SHIPPED_TO_USER' | 'DELIVERED_AWAITING_RETURN' | 'SHIPPED_TO_LAB' | 'RECEIVED_IN_PROCESS' | 'COMPLETE_REPORT_DELIVERED';

export class KitService {
  static async createKitsForOrder(orderId: string, kitCount: number, kitTypes: KitType[] = []) {
    const kits = [];
    for (let i = 1; i <= kitCount; i++) {
      const kitType = kitTypes[i - 1] || 'BASE'; // Default to BASE if not specified
      const kit = await prisma.kit.create({
        data: {
          orderId,
          kitNumber: i,
          kitType,
          status: 'PENDING_ONBOARDING'
        }
      });
      kits.push(kit);
    }
    return kits;
  }

  static async getKitsForOrder(orderId: string) {
    return await prisma.kit.findMany({
      where: { orderId },
      include: {
        child: true,
        consent: true,
        questionnaire: true
      },
      orderBy: { kitNumber: 'asc' }
    });
  }

  static async updateKitStatus(kitId: string, status: KitStatus) {
    return await prisma.kit.update({
      where: { id: kitId },
      data: { status }
    });
  }

  static async updateKitType(kitId: string, kitType: KitType) {
    return await prisma.kit.update({
      where: { id: kitId },
      data: { kitType }
    });
  }

  static async getKitById(kitId: string) {
    return await prisma.kit.findUnique({
      where: { id: kitId },
      include: {
        child: true,
        consent: true,
        questionnaire: true,
        order: {
          include: {
            user: true
          }
        }
      }
    });
  }

  static async isAllKitsComplete(orderId: string): Promise<boolean> {
    const kits = await prisma.kit.findMany({
      where: { orderId }
    });
    
    return kits.every(kit => 
      kit.status === 'ONBOARDING_COMPLETED' || 
      kit.status === 'PREPARING_KIT' ||
      kit.status === 'SHIPPED_TO_USER' ||
      kit.status === 'DELIVERED_AWAITING_RETURN' ||
      kit.status === 'SHIPPED_TO_LAB' ||
      kit.status === 'RECEIVED_IN_PROCESS' ||
      kit.status === 'COMPLETE_REPORT_DELIVERED'
    );
  }

  static getKitTypeDisplayName(kitType: KitType): string {
    switch (kitType) {
      case 'BASE':
        return 'Base Kit';
      case 'PLUS':
        return 'Plus Kit';
      case 'PREMIUM':
        return 'Premium Kit';
      default:
        return 'Unknown Kit';
    }
  }

  static getKitTypeDescription(kitType: KitType): string {
    switch (kitType) {
      case 'BASE':
        return 'Standard genetic testing panel';
      case 'PLUS':
        return 'Enhanced testing with additional markers';
      case 'PREMIUM':
        return 'Comprehensive testing with full genome analysis';
      default:
        return '';
    }
  }

  static getKitTypeColor(kitType: KitType): string {
    switch (kitType) {
      case 'BASE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PLUS':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PREMIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  static async getPendingKitsForUser(userId: string) {
    return await prisma.kit.findMany({
      where: {
        order: {
          userId: userId
        },
        status: 'PENDING_ONBOARDING'
      },
      include: {
        order: true,
        child: true,
        consent: true,
        questionnaire: true
      },
      orderBy: [
        { order: { createdAt: 'desc' } },
        { kitNumber: 'asc' }
      ]
    });
  }

  static async getCompletedKitsForUser(userId: string) {
    return await prisma.kit.findMany({
      where: {
        order: {
          userId: userId
        },
        status: {
          in: ['ONBOARDING_COMPLETED', 'PREPARING_KIT', 'SHIPPED_TO_USER', 'DELIVERED_AWAITING_RETURN', 'SHIPPED_TO_LAB', 'RECEIVED_IN_PROCESS', 'COMPLETE_REPORT_DELIVERED']
        }
      },
      include: {
        order: true,
        child: true,
        consent: true,
        questionnaire: true
      },
      orderBy: [
        { order: { createdAt: 'desc' } },
        { kitNumber: 'asc' }
      ]
    });
  }
} 