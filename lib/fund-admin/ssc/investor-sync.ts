/**
 * SS&C Geneva Investor Roster Synchronization Service
 * Task FA-003: Auto-map investors by email, flag unmapped for manual review
 */

import axios, { AxiosError } from 'axios';
import { SSCAuthClient } from './auth';
import { db } from '@/lib/db';
import { GenevaInvestorSchema, type GenevaInvestor, type InvestorSyncResult } from '../types';

export class InvestorRosterSyncService {
  constructor(
    private authClient: SSCAuthClient,
    private accountId: string
  ) {}

  /**
   * Sync complete investor roster from Geneva
   * Auto-maps by email, creates unmapped investor records for manual review
   */
  async syncInvestorRoster(fundId: string): Promise<InvestorSyncResult> {
    try {
      const token = await this.authClient.getAccessToken(this.accountId);

      const response = await axios.get(
        `${process.env.SSC_API_URL}/v2/funds/${fundId}/investors`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: {
            include: 'contact_info,commitments,allocations',
            status: 'active',
          },
          timeout: 30000,
        }
      );

      const investors = this.parseInvestors(response.data.data);

      let newMappings = 0;
      let updated = 0;
      let unmapped = 0;

      for (const investor of investors) {
        try {
          // Try to find user by email
          const user = await db.user.findUnique({
            where: { email: investor.email },
          });

          if (!user) {
            unmapped++;

            // Create notification for admin to map investor
            await db.unmappedInvestor.upsert({
              where: {
                fundAdministrator_externalInvestorId: {
                  fundAdministrator: 'SSC_GENEVA',
                  externalInvestorId: investor.investor_id,
                },
              },
              update: {
                investorName: investor.name,
                email: investor.email,
                fundId,
                needsMapping: true,
              },
              create: {
                fundAdministrator: 'SSC_GENEVA',
                externalInvestorId: investor.investor_id,
                investorName: investor.name,
                email: investor.email,
                fundId,
                needsMapping: true,
              },
            });

            console.log(
              `Investor ${investor.investor_id} (${investor.email}) needs manual mapping`
            );
            continue;
          }

          // Create or update mapping
          const existingMapping = await db.investorMapping.findUnique({
            where: {
              fundAdministrator_externalInvestorId: {
                fundAdministrator: 'SSC_GENEVA',
                externalInvestorId: investor.investor_id,
              },
            },
          });

          const mapping = await db.investorMapping.upsert({
            where: {
              fundAdministrator_externalInvestorId: {
                fundAdministrator: 'SSC_GENEVA',
                externalInvestorId: investor.investor_id,
              },
            },
            update: {
              investorName: investor.name,
              email: investor.email,
              commitment: investor.commitment_amount,
              updatedAt: new Date(),
            },
            create: {
              fundAdministrator: 'SSC_GENEVA',
              externalInvestorId: investor.investor_id,
              userId: user.id,
              investorName: investor.name,
              email: investor.email,
              commitment: investor.commitment_amount,
            },
          });

          if (!existingMapping) {
            newMappings++;
          } else {
            updated++;
          }
        } catch (error) {
          console.error(`Failed to sync investor ${investor.investor_id}:`, error);
        }
      }

      // Log sync results
      await db.fundAdminSync.create({
        data: {
          administrator: 'SSC_GENEVA',
          accountId: this.accountId,
          syncType: 'INVESTORS',
          totalRecords: investors.length,
          successCount: newMappings + updated,
          failureCount: unmapped,
          syncedAt: new Date(),
        },
      });

      return { new: newMappings, updated, unmapped };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        throw new Error(
          `Failed to fetch investors from Geneva: ${axiosError.response?.status} ${axiosError.response?.statusText || axiosError.message}`
        );
      }
      throw new Error(`Failed to sync investor roster: ${error}`);
    }
  }

  /**
   * Parse and validate investors from Geneva API response
   */
  private parseInvestors(data: unknown): GenevaInvestor[] {
    try {
      return data instanceof Array
        ? data.map((item) => GenevaInvestorSchema.parse(item))
        : [GenevaInvestorSchema.parse(data)];
    } catch (error) {
      console.error('Failed to parse Geneva investor data:', error);
      throw new Error('Invalid investor data received from Geneva');
    }
  }

  /**
   * Manually map an unmapped investor to a Clearway user
   * Used by admin UI when auto-mapping fails
   */
  async mapInvestorManually(
    externalInvestorId: string,
    userId: string
  ): Promise<void> {
    const unmapped = await db.unmappedInvestor.findFirst({
      where: {
        fundAdministrator: 'SSC_GENEVA',
        externalInvestorId,
        needsMapping: true,
      },
    });

    if (!unmapped) {
      throw new Error('Unmapped investor not found');
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Create mapping
    await db.investorMapping.create({
      data: {
        fundAdministrator: 'SSC_GENEVA',
        externalInvestorId,
        userId,
        investorName: unmapped.investorName,
        email: unmapped.email,
      },
    });

    // Mark as mapped
    await db.unmappedInvestor.update({
      where: { id: unmapped.id },
      data: { needsMapping: false, mappedAt: new Date() },
    });
  }

  /**
   * Get all unmapped investors for manual review
   */
  async getUnmappedInvestors(): Promise<
    Array<{
      id: string;
      externalInvestorId: string;
      investorName: string;
      email: string;
      fundId: string | null;
      createdAt: Date;
    }>
  > {
    return db.unmappedInvestor.findMany({
      where: {
        fundAdministrator: 'SSC_GENEVA',
        needsMapping: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Sync a specific investor by ID
   */
  async syncInvestorById(investorId: string, fundId: string): Promise<void> {
    const token = await this.authClient.getAccessToken(this.accountId);

    const response = await axios.get(
      `${process.env.SSC_API_URL}/v2/funds/${fundId}/investors/${investorId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          include: 'contact_info,commitments,allocations',
        },
        timeout: 30000,
      }
    );

    const investor = GenevaInvestorSchema.parse(response.data);

    // Try to find user by email
    const user = await db.user.findUnique({
      where: { email: investor.email },
    });

    if (!user) {
      await db.unmappedInvestor.upsert({
        where: {
          fundAdministrator_externalInvestorId: {
            fundAdministrator: 'SSC_GENEVA',
            externalInvestorId: investor.investor_id,
          },
        },
        update: {
          investorName: investor.name,
          email: investor.email,
          fundId,
          needsMapping: true,
        },
        create: {
          fundAdministrator: 'SSC_GENEVA',
          externalInvestorId: investor.investor_id,
          investorName: investor.name,
          email: investor.email,
          fundId,
          needsMapping: true,
        },
      });
      throw new Error(`No user found for investor ${investor.email}`);
    }

    // Create or update mapping
    await db.investorMapping.upsert({
      where: {
        fundAdministrator_externalInvestorId: {
          fundAdministrator: 'SSC_GENEVA',
          externalInvestorId: investor.investor_id,
        },
      },
      update: {
        investorName: investor.name,
        email: investor.email,
        commitment: investor.commitment_amount,
        updatedAt: new Date(),
      },
      create: {
        fundAdministrator: 'SSC_GENEVA',
        externalInvestorId: investor.investor_id,
        userId: user.id,
        investorName: investor.name,
        email: investor.email,
        commitment: investor.commitment_amount,
      },
    });
  }
}
