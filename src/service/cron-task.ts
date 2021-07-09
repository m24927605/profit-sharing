import dayjs from 'dayjs';

import {
  Injectable,
  Logger
} from '@nestjs/common';
import {
  Cron,
  Interval
} from '@nestjs/schedule';

import { InvestmentService } from './investment';
import { TimeService } from './base';

@Injectable()
export class CronTaskService {
  private readonly logger = new Logger(CronTaskService.name);

  constructor(private readonly _investmentService: InvestmentService) {
  }

  @Interval(1000)
  handleCron() {
    this.logger.debug('health check every second.');
  }

  // daily check if needs to settle or calculate user profit
  @Cron('* * 24 * * *')
  public async scheduledJob(): Promise<void> {
    const dateFormat = 'YYYY-MM-DD';
    const currentSeason = dayjs().quarter();
    let shareProfitCandidates;
    const seasonDateRange = TimeService.getSeasonDateRange(new Date());
    const { fromAt, toAt } = seasonDateRange.get(currentSeason);
    // settle user shares and calculate user profit at the end of season
    if (dayjs().format(dateFormat) === dayjs(toAt).format(dateFormat)) {
      await this._investmentService.settleUserShares(fromAt, toAt);
      shareProfitCandidates = await this._investmentService.calculateUserGainProfit();
    }
    if (shareProfitCandidates) {
      // delay 1 day to pay to the user and the paid time will be in the next season
      const oneDayMs = 1000 * 60 * 60 * 24;
      await this._sleep(oneDayMs);
      await this._investmentService.doShareProfit(shareProfitCandidates);
      shareProfitCandidates = null;
    }
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}