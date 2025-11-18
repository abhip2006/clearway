// Payment Processing Agent - Task PAY-003: ACH Processing with Plaid
// Handles Plaid Link integration, bank account connection, and ACH payment initiation

import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import Stripe from 'stripe';
import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';
import { db } from '@/lib/db';
import { Resend } from 'resend';

const plaidClient = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments.production,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
        'PLAID-SECRET': process.env.PLAID_SECRET,
      },
    },
  })
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const kmsClient = new KMSClient({ region: 'us-east-1' });
const resend = new Resend(process.env.RESEND_API_KEY);

export interface InitiateACHPaymentParams {
  capitalCallId: string;
  userId: string;
  bankAccountId: string;
}

export interface ACHPaymentResult {
  paymentId: string;
  status: string;
}

export class PlaidACHService {
  /**
   * Create a Plaid Link token for connecting a bank account
   * @param userId - User ID
   * @returns Link token for Plaid Link
   */
  async createLinkToken(userId: string): Promise<string> {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Clearway',
      products: ['auth'],
      country_codes: ['US'],
      language: 'en',
      redirect_uri: 'https://clearway.com/payment/callback',
    });

    return response.data.link_token;
  }

  /**
   * Exchange public token for access token and store bank account
   * @param publicToken - Public token from Plaid Link
   * @param userId - User ID
   * @returns Access token and account ID
   */
  async exchangePublicToken(
    publicToken: string,
    userId: string
  ): Promise<{
    accessToken: string;
    accountId: string;
  }> {
    // Exchange public token for access token
    const tokenResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = tokenResponse.data.access_token;

    // Get account information
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const checkingAccount = accountsResponse.data.accounts.find(
      (acc) => acc.subtype === 'checking'
    );

    if (!checkingAccount) {
      throw new Error('No checking account found');
    }

    // Store bank account securely
    await db.bankAccount.create({
      data: {
        userId,
        plaidAccessToken: await this.encryptToken(accessToken),
        plaidAccountId: checkingAccount.account_id,
        accountName: checkingAccount.name,
        accountMask: checkingAccount.mask || '',
        accountType: 'CHECKING',
        status: 'ACTIVE',
      },
    });

    return {
      accessToken,
      accountId: checkingAccount.account_id,
    };
  }

  /**
   * Initiate an ACH payment using Plaid and Stripe
   * @param params - ACH payment parameters
   * @returns Payment ID and status
   */
  async initiateACHPayment(
    params: InitiateACHPaymentParams
  ): Promise<ACHPaymentResult> {
    const capitalCall = await db.capitalCall.findUnique({
      where: { id: params.capitalCallId },
    });

    const bankAccount = await db.bankAccount.findUnique({
      where: { id: params.bankAccountId },
    });

    if (!capitalCall || !bankAccount) {
      throw new Error('Capital call or bank account not found');
    }

    // Create Plaid processor token for Stripe
    const processorTokenResponse = await plaidClient.processorTokenCreate({
      access_token: await this.decryptToken(bankAccount.plaidAccessToken),
      account_id: bankAccount.plaidAccountId,
      processor: 'stripe',
    });

    // Create Stripe payment method
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'us_bank_account',
      us_bank_account: {
        account_holder_type: 'individual',
        routing_number: processorTokenResponse.data.processor_token,
      },
    });

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(capitalCall.amountDue.toNumber() * 100),
      currency: capitalCall.currency.toLowerCase(),
      payment_method: paymentMethod.id,
      payment_method_types: ['us_bank_account'],
      confirm: true,
      metadata: {
        capitalCallId: params.capitalCallId,
        userId: params.userId,
      },
    });

    // Record payment in database
    const payment = await db.payment.create({
      data: {
        capitalCallId: params.capitalCallId,
        userId: params.userId,
        amount: capitalCall.amountDue.toNumber(),
        currency: capitalCall.currency,
        paymentMethod: 'ACH',
        status: 'PENDING',
        stripePaymentIntentId: paymentIntent.id,
        reference: paymentIntent.id,
        paidAt: new Date(),
      },
    });

    return {
      paymentId: payment.id,
      status: paymentIntent.status,
    };
  }

  /**
   * Handle Stripe webhook events for ACH payments
   * @param event - Stripe webhook event
   */
  async handleACHWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const succeededIntent = event.data.object as Stripe.PaymentIntent;
        await this.markPaymentSuccessful(succeededIntent.id);
        break;

      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentFailure(failedIntent);
        break;

      case 'charge.refunded':
        const refund = event.data.object as Stripe.Charge;
        await this.handleRefund(refund);
        break;
    }
  }

  /**
   * Mark a payment as successful
   * @param paymentIntentId - Stripe payment intent ID
   */
  private async markPaymentSuccessful(paymentIntentId: string) {
    await db.payment.update({
      where: { stripePaymentIntentId: paymentIntentId },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
      },
    });

    // Update capital call
    const payment = await db.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (payment) {
      await db.capitalCall.update({
        where: { id: payment.capitalCallId },
        data: { status: 'PAID', paidAt: new Date() },
      });
    }
  }

  /**
   * Handle payment failure
   * @param paymentIntent - Failed payment intent
   */
  private async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    const failureCode = paymentIntent.last_payment_error?.code;
    const failureMessage = paymentIntent.last_payment_error?.message;

    await db.payment.update({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: {
        status: 'FAILED',
        failureReason: `${failureCode}: ${failureMessage}`,
      },
    });

    // Notify user
    const payment = await db.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntent.id },
      include: { user: true, capitalCall: true },
    });

    if (payment) {
      await resend.emails.send({
        from: 'Clearway <notifications@clearway.com>',
        to: payment.user.email,
        subject: `Payment Failed - ${payment.capitalCall.fundName}`,
        html: this.generateFailureEmailHtml(
          payment.capitalCall.fundName,
          payment.amount.toNumber(),
          failureMessage || 'Unknown error'
        ),
      });
    }
  }

  /**
   * Handle refund
   * @param charge - Refunded charge
   */
  private async handleRefund(charge: Stripe.Charge) {
    const paymentIntentId = charge.payment_intent as string;

    await db.payment.updateMany({
      where: { stripePaymentIntentId: paymentIntentId },
      data: {
        status: 'FAILED',
        failureReason: 'Payment refunded',
      },
    });
  }

  /**
   * Encrypt a token using AWS KMS
   * @param token - Token to encrypt
   * @returns Encrypted token (base64)
   */
  private async encryptToken(token: string): Promise<string> {
    const command = new EncryptCommand({
      KeyId: process.env.KMS_KEY_ID!,
      Plaintext: Buffer.from(token),
    });

    const response = await kmsClient.send(command);
    return Buffer.from(response.CiphertextBlob!).toString('base64');
  }

  /**
   * Decrypt a token using AWS KMS
   * @param encryptedToken - Encrypted token (base64)
   * @returns Decrypted token
   */
  private async decryptToken(encryptedToken: string): Promise<string> {
    const command = new DecryptCommand({
      CiphertextBlob: Buffer.from(encryptedToken, 'base64'),
    });

    const response = await kmsClient.send(command);
    return Buffer.from(response.Plaintext!).toString('utf8');
  }

  /**
   * Generate payment failure email HTML
   * @param fundName - Fund name
   * @param amount - Payment amount
   * @param reason - Failure reason
   * @returns HTML email content
   */
  private generateFailureEmailHtml(
    fundName: string,
    amount: number,
    reason: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #DC2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .error { padding: 15px; background-color: #FEE2E2; border-left: 4px solid #DC2626; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Payment Failed</h1>
            </div>
            <div class="content">
              <p>We were unable to process your payment for <strong>${fundName}</strong>.</p>

              <div class="error">
                <strong>Reason:</strong> ${reason}
              </div>

              <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>

              <p>Please review your payment information and try again. If you continue to experience issues, please contact your bank or our support team.</p>

              <a href="https://clearway.com/payments" class="button">Retry Payment</a>

              <p style="margin-top: 30px;">Best regards,<br>The Clearway Team</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

// Export singleton instance
export const plaidACHService = new PlaidACHService();
