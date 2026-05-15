import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const user = config.get<string>('SMTP_USER');
    this.enabled = !!(host && user);
    this.from = config.get<string>('SMTP_FROM', '"LMS Platform" <noreply@lms.example.com>');

    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host,
        port: config.get<number>('SMTP_PORT', 587),
        secure: config.get<boolean>('SMTP_SECURE', false),
        auth: { user, pass: config.get<string>('SMTP_PASS', '') },
      });
    } else {
      // Development stub — logs emails instead of sending
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
      this.logger.warn('SMTP not configured — emails will be logged only');
    }
  }

  async send(opts: SendEmailOptions): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text ?? opts.html.replace(/<[^>]+>/g, ''),
      });

      if (!this.enabled) {
        this.logger.log(`[EMAIL STUB] To: ${opts.to} | Subject: ${opts.subject}`);
      } else {
        this.logger.log(`Email sent to ${opts.to}: ${(info as { messageId?: string }).messageId ?? ''}`);
      }
    } catch (err) {
      this.logger.error(`Failed to send email to ${opts.to}`, err);
    }
  }

  buildWelcomeHtml(name: string): string {
    return `<h2>Welcome to LMS Platform, ${name}!</h2><p>Your account has been created successfully.</p>`;
  }

  buildNotificationHtml(title: string, body: string): string {
    return `<h2>${title}</h2><p>${body}</p><hr/><p style="color:#666;font-size:12px">LMS Platform</p>`;
  }
}
