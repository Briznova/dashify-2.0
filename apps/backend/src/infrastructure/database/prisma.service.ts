import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> { await this.$connect(); }
  async onModuleDestroy(): Promise<void> { await this.$disconnect(); }

  /**
   * Execute all tenant-bound queries in one transaction with a transaction-local
   * PostgreSQL setting. RLS policies read current_setting('app.school_id', true).
   * Never set this value on a pooled connection outside the transaction.
   */
  async withTenant<T>(
    schoolId: string,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$queryRaw`SELECT set_config('app.school_id', ${schoolId}, true)`;
      return work(tx);
    });
  }
}
