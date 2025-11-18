// Capital Call Reminder Email Template
// React Email template for capital call notifications

import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface CapitalCallReminderProps {
  fundName: string;
  amountDue: number;
  dueDate: Date;
}

export function CapitalCallReminder({
  fundName,
  amountDue,
  dueDate,
}: CapitalCallReminderProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amountDue);

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dueDate);

  return (
    <Html>
      <Head />
      <Preview>Capital call reminder for {fundName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>Capital Call Reminder</Text>
          <Text style={paragraph}>
            You have an upcoming capital call:
          </Text>

          <Section style={calloutBox}>
            <Text style={calloutText}>
              <strong>Fund:</strong> {fundName}
            </Text>
            <Text style={calloutText}>
              <strong>Amount:</strong> {formattedAmount}
            </Text>
            <Text style={calloutText}>
              <strong>Due Date:</strong> {formattedDate}
            </Text>
          </Section>

          <Button style={button} href="https://clearway.com/dashboard">
            View Details
          </Button>

          <Hr style={hr} />

          <Text style={footer}>
            Clearway - Data Infrastructure for Alternative Investments
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const heading = {
  fontSize: '32px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#484848',
  padding: '17px 0 0',
  textAlign: 'center' as const,
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '1.4',
  color: '#484848',
  padding: '24px',
};

const calloutBox = {
  backgroundColor: '#f0f7ff',
  border: '1px solid #0066ff',
  borderRadius: '8px',
  padding: '16px',
  margin: '24px',
};

const calloutText = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#484848',
  margin: '8px 0',
};

const button = {
  backgroundColor: '#0066ff',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  width: '200px',
  padding: '12px',
  margin: '24px auto',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
};
