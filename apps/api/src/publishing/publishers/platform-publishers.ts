import { Injectable } from '@nestjs/common';
import { Platform } from '../interfaces/publisher.interface';
import { MockPublisher } from './mock.publisher';

@Injectable()
export class FacebookPublisher extends MockPublisher {
  constructor() {
    super(Platform.FACEBOOK);
  }
}

@Injectable()
export class InstagramPublisher extends MockPublisher {
  constructor() {
    super(Platform.INSTAGRAM);
  }
}

@Injectable()
export class LinkedInPublisher extends MockPublisher {
  constructor() {
    super(Platform.LINKEDIN);
  }
}

@Injectable()
export class XPublisher extends MockPublisher {
  constructor() {
    super(Platform.X);
  }
}

@Injectable()
export class YouTubeShortsPublisher extends MockPublisher {
  constructor() {
    super(Platform.YT_SHORTS);
  }
}

@Injectable()
export class TikTokPublisher extends MockPublisher {
  constructor() {
    super(Platform.TIKTOK);
  }
}
